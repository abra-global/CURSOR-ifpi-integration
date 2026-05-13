import { SalesCloudQuotePayload } from "../types/integration.types";
import { ensureBusinessPartnerFromV2AccountEntity } from "./accountProvision.service";
import { pickB1CardCodeFromV2ExternalIds, salesCloudService } from "./salesCloud.service";

function pickInlineB1CardCode(quote: SalesCloudQuotePayload): string | undefined {
  const fromAccount = pickB1CardCodeFromV2ExternalIds(
    quote.account?.externalIds as
      | Array<{ externalId?: string; communicationSystemId?: string; type?: string }>
      | undefined
  );
  if (fromAccount) {
    console.log("[Quote] CardCode from quote.account.externalIds (B1 comm system / type)", fromAccount);
    return fromAccount;
  }
  const fromQuote = pickB1CardCodeFromV2ExternalIds(
    quote.externalIds as
      | Array<{ externalId?: string; communicationSystemId?: string; type?: string }>
      | undefined
  );
  if (fromQuote) {
    console.log("[Quote] CardCode from quote.externalIds (B1 comm system / type)", fromQuote);
    return fromQuote;
  }
  return undefined;
}

/**
 * Resolves SAP B1 CardCode for the quote account:
 * 1) Quote payload externalIds filtered by V2 B1 communication system / sap.oitc.988
 * 2) GET V2 Account by partyId → externalIds (same filter) or extensions.ExternalIDB1
 * 3) If still missing: create/update B1 BP from V2 account entity (same mapping as account sync) + write-back
 */
export async function resolveCardCodeForQuote(quote: SalesCloudQuotePayload): Promise<string | undefined> {
  const inline = pickInlineB1CardCode(quote);
  if (inline) {
    return inline;
  }

  const partyId = quote.account?.partyId;
  if (!partyId) {
    console.warn("[Quote] No account.partyId on quote — cannot resolve CardCode from V2");
    return undefined;
  }

  try {
    const { cardCode, entity } = await salesCloudService.getV2AccountEntityWithCardResolution(partyId);
    if (cardCode) {
      return cardCode;
    }
    if (entity) {
      return await ensureBusinessPartnerFromV2AccountEntity(entity);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to get CardCode from V2:", msg);
  }

  return undefined;
}
