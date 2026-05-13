import { pickB1CardCodeFromV2ExternalIds } from "../services/salesCloud.service";
import { SalesCloudQuoteItem, SalesCloudQuotePayload } from "../types/integration.types";

/** Line net total and currency: NETT element, or V2 "Total Product Net Value", or totalValues.netAmount (SQ.JSON shape). */
function getLineNetTotal(item: SalesCloudQuoteItem): { amount?: number; currency?: string } {
  const fromTotal = item.totalValues?.netAmount;
  if (fromTotal?.content != null) {
    return { amount: fromTotal.content, currency: fromTotal.currencyCode };
  }

  const nett = item.priceElements?.find((element) => element.code === "NETT");
  if (nett?.rateAmount?.content != null) {
    return {
      amount: nett.rateAmount.content,
      currency: nett.rateAmount.currencyCode
    };
  }

  const totalProductNet = item.priceElements?.find(
    (element) =>
      element.description === "Total Product Net Value" || element.stepNumber === 130
  );
  if (totalProductNet?.calculatedAmount?.content != null) {
    return {
      amount: totalProductNet.calculatedAmount.content,
      currency: totalProductNet.calculatedAmount.currencyCode
    };
  }

  const fallback = item.priceElements?.[0];
  return {
    amount: fallback?.rateAmount?.content ?? fallback?.calculatedAmount?.content,
    currency: fallback?.rateAmount?.currencyCode ?? fallback?.calculatedAmount?.currencyCode
  };
}

export interface MapQuoteOptions {
  /** Resolved B1 Business Partner code (preferred over payload externalIds). */
  cardCode?: string;
}

/**
 * Maps Sales Quote (V2) → B1 Sales Order payload.
 * Per spec: UnitPrice = NETT rateAmount.content / quantity.content
 */
export function mapQuoteToB1OrderPayload(quote: SalesCloudQuotePayload, options?: MapQuoteOptions) {
  const cardCode =
    options?.cardCode ??
    pickB1CardCodeFromV2ExternalIds(
      quote.account?.externalIds as
        | Array<{ externalId?: string; communicationSystemId?: string; type?: string }>
        | undefined
    ) ??
    pickB1CardCodeFromV2ExternalIds(
      quote.externalIds as
        | Array<{ externalId?: string; communicationSystemId?: string; type?: string }>
        | undefined
    );

  return {
    CardCode: cardCode,
    NumAtCard: quote.displayId,
    DocDate: quote.documentDate,
    DocCurrency: quote.businessTerms?.currency ?? "₪",
    PaymentGroupCode: quote.extensions?.zPaymentTerms ?? 1,
    Reference2: quote.account?.partyDisplayId,
    DocumentLines: (quote.items ?? []).map((item, index) => {
      const nett = getLineNetTotal(item);
      const quantity =
        item.quantity?.content ?? item.scheduleLines?.[0]?.quantity?.content ?? 1;
      const lineTotal = nett.amount ?? 0;
      const unitPrice = quantity === 0 ? 0 : lineTotal / quantity;

      const lineNumFromDisplay =
        item.displayId != null && item.displayId !== "" && !Number.isNaN(Number(item.displayId))
          ? Number(item.displayId)
          : undefined;

      return {
        LineNum: item.extensions?.ERPline ?? lineNumFromDisplay ?? index,
        ItemCode: item.externalIds?.[0]?.externalId ?? item.productData?.productId,
        ItemDescription: item.description ?? item.name,
        Quantity: quantity,
        UnitPrice: unitPrice,
        Currency: nett.currency ?? quote.businessTerms?.currency ?? "₪",
        WarehouseCode: "01",
        UoMCode: "ידני",
        U_ExItemCode: item.productData?.productId,
        U_ExPrice: lineTotal
      };
    })
  };
}
