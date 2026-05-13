import { Request, Response } from "express";
import { mapQuoteToB1OrderPayload } from "../mappers/quote.mapper";
import { sendIntegrationAlert } from "../services/alert.service";
import { mapV2AccountToB1 } from "../services/mapping.service";
import { resolveCardCodeForQuote } from "../services/quoteCardCode.service";
import { resolveOrderLinesItemCodes } from "../services/quoteOrderLines.service";
import { sapB1Service } from "../services/sapB1.service";
import { salesCloudService } from "../services/salesCloud.service";
import { SalesCloudExternalId, SalesCloudQuotePayload } from "../types/integration.types";

interface B1BusinessPartner {
  CardCode: string;
  AdditionalID?: string;
}

interface B1BusinessPartnersResponse {
  value: B1BusinessPartner[];
}

function getExistingCardCode(externalIds?: SalesCloudExternalId[]): string | undefined {
  return externalIds?.find((item) => item.externalId)?.externalId;
}

/** Flat account snapshot (currentImage or legacy flat body). */
interface AccountSnapshot {
  id?: string;
  displayId?: string;
  formattedName?: string;
  externalIds?: SalesCloudExternalId[];
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

async function findCardCodeByAdditionalId(additionalId: string): Promise<string | undefined> {
  const escaped = escapeODataValue(additionalId);
  const response = await sapB1Service.get<B1BusinessPartnersResponse>(
    `/BusinessPartners?$select=CardCode,AdditionalID&$filter=AdditionalID eq '${escaped}'`
  );

  return response.value?.[0]?.CardCode;
}

interface B1OrderHeader {
  DocNum?: number;
  NumAtCard?: string;
}

interface B1OrdersResponse {
  value: B1OrderHeader[];
}

async function findOrderDocNumByNumAtCard(numAtCard: string): Promise<number | undefined> {
  const escaped = escapeODataValue(numAtCard);
  const response = await sapB1Service.get<B1OrdersResponse>(
    `/Orders?$select=DocNum,NumAtCard&$filter=NumAtCard eq '${escaped}'`
  );
  return response.value?.[0]?.DocNum;
}

export async function syncAccounts(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  console.log("[Sync Accounts] Incoming payload from V2", JSON.stringify(body, null, 2));

  const accountData =
    (body.currentImage as AccountSnapshot | undefined) ?? (body as unknown as AccountSnapshot);

  if (!accountData?.id || !accountData?.displayId) {
    res.status(400).json({
      success: false,
      message:
        "Invalid account payload. Required on currentImage (or root): id, displayId."
    });
    return;
  }

  const mapped = mapV2AccountToB1(body);
  console.log("[Sync Accounts] Mapped payload before SAP B1", JSON.stringify(mapped, null, 2));
  let cardCode = getExistingCardCode(accountData.externalIds);
  let action: "create" | "update" = "create";

  if (!cardCode) {
    cardCode = await findCardCodeByAdditionalId(accountData.displayId);
  }

  if (cardCode) {
    action = "update";
    await sapB1Service.patch(`/BusinessPartners('${encodeURIComponent(cardCode)}')`, {
      ...mapped,
      CardCode: cardCode
    });
    console.log("[Sync Accounts] SAP B1 response status", {
      action,
      cardCode,
      details: "Updated existing Business Partner"
    });
  } else {
    const created = await sapB1Service.post<{ CardCode?: string }>("/BusinessPartners", mapped);
    cardCode = created.CardCode;
    action = "create";

    console.log("[Sync Accounts] SAP B1 response status", {
      action,
      cardCode,
      details: "Created new Business Partner"
    });

    if (cardCode) {
      await salesCloudService.writeBackAccountCardCode(accountData.id, cardCode);
    }
  }

  res.status(200).json({
    success: true,
    accountId: accountData.id,
    cardCode,
    message: cardCode ? "Account synchronized to SAP B1." : "Account synchronized without CardCode."
  });
}

export async function syncQuotes(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  console.log("[Sync Quotes] Incoming payload from V2", JSON.stringify(body, null, 2));

  const quote =
    (body.currentImage as SalesCloudQuotePayload | undefined) ??
    (body as unknown as SalesCloudQuotePayload);

  if (!quote?.id || !quote?.displayId) {
    res.status(400).json({
      success: false,
      message: "Invalid quote payload. Required on currentImage (or root): id, displayId."
    });
    return;
  }

  try {
    const cardCode = await resolveCardCodeForQuote(quote);
    console.log("[Sync Quotes] Resolved B1 CardCode", { cardCode });

    if (!cardCode) {
      await sendIntegrationAlert({
        subject: "[IFPI] Sales Quote sync — CardCode not found",
        text:
          `Could not resolve B1 CardCode for quote ${quote.displayId} (${quote.id}).\n` +
          `Ensure account.externalIds contains the B1 CardCode after customer sync, or set account.partyId for V2 lookup.\n` +
          `Payload: ${JSON.stringify(quote)}`
      });
      res.status(422).json({
        success: false,
        message:
          "Cannot resolve B1 CardCode for this quote. Check V2 Account externalIds (B1 comm system / sap.oitc.988), extensions.ExternalIDB1, or ensure account.partyId can be loaded from V2 for B1 provisioning."
      });
      return;
    }

    const existingDocNum = await findOrderDocNumByNumAtCard(quote.displayId);
    if (existingDocNum !== undefined) {
      console.log("[Sync Quotes] Order already exists for NumAtCard (quote displayId)", {
        displayId: quote.displayId,
        docNum: existingDocNum
      });
      res.status(200).json({
        success: true,
        duplicate: true,
        quoteId: quote.id,
        docNum: existingDocNum,
        message: "Sales Order already exists for this quotation number (NumAtCard)."
      });
      return;
    }

    let mapped = mapQuoteToB1OrderPayload(quote, { cardCode });
    mapped = {
      ...mapped,
      DocumentLines: await resolveOrderLinesItemCodes(mapped.DocumentLines ?? [])
    };

    console.log("[Sync Quotes] Mapped payload before SAP B1 (after item resolution)", JSON.stringify(mapped, null, 2));

    const order = await sapB1Service.post<{ DocNum?: number }>("/Orders", mapped);
    console.log("[Sync Quotes] SAP B1 response status", {
      action: "create",
      docNum: order.DocNum,
      details: "Created Sales Order from quote"
    });

    res.status(200).json({
      success: true,
      quoteId: quote.id,
      docNum: order.DocNum,
      cardCode,
      message: "Quote synchronized to SAP B1 Sales Order."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sendIntegrationAlert({
      subject: "[IFPI] Sales Quote sync failed",
      text: `Quote ${quote.displayId} (${quote.id}): ${message}`
    });
    throw error;
  }
}
