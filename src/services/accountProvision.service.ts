import { mapV2AccountToB1 } from "./mapping.service";
import { pickB1CardCodeFromV2ExternalIds, salesCloudService } from "./salesCloud.service";
import { sapB1Service } from "./sapB1.service";
import { SalesCloudExternalId } from "../types/integration.types";

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

/**
 * Creates or updates B1 Business Partner from a V2 Account entity (flat object, not webhook wrapper).
 */
export async function ensureBusinessPartnerFromV2AccountEntity(
  entity: Record<string, unknown>
): Promise<string | undefined> {
  const id = entity.id as string | undefined;
  const displayId = entity.displayId as string | undefined;
  if (!id || !displayId) {
    console.error("[Quote] Cannot provision B1 customer: V2 account entity missing id or displayId");
    return undefined;
  }

  console.log(`[Quote] Provisioning B1 Business Partner from V2 account id=${id} displayId=${displayId}`);

  const body = { currentImage: entity };
  const mapped = mapV2AccountToB1(body);
  console.log("[Quote] Mapped V2 account for B1 create/update", JSON.stringify(mapped, null, 2));

  let cardCode =
    pickB1CardCodeFromV2ExternalIds(
      entity.externalIds as
        | Array<{ externalId?: string; communicationSystemId?: string; type?: string }>
        | undefined
    ) ?? getExistingCardCode(entity.externalIds as SalesCloudExternalId[] | undefined);
  if (!cardCode) {
    cardCode = await findCardCodeByAdditionalId(displayId);
  }

  if (cardCode) {
    await sapB1Service.patch(`/BusinessPartners('${encodeURIComponent(cardCode)}')`, {
      ...mapped,
      CardCode: cardCode
    });
    console.log("[Quote] Updated existing B1 Business Partner", { cardCode });
    return cardCode;
  }

  const created = await sapB1Service.post<{ CardCode?: string }>("/BusinessPartners", mapped);
  cardCode = created.CardCode;
  console.log("[Quote] Created B1 Business Partner", { cardCode });

  if (cardCode) {
    await salesCloudService.writeBackAccountCardCode(id, cardCode);
  }

  return cardCode;
}
