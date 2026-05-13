import axios from "axios";
import { env } from "../config/env";

export function pickB1CardCodeFromV2ExternalIds(
  externalIds?: Array<{ externalId?: string; communicationSystemId?: string; type?: string }>
): string | undefined {
  if (!externalIds?.length) {
    return undefined;
  }
  const commId = env.v2.b1CardCodeCommunicationSystemId;
  const extType = env.v2.b1CardCodeExternalIdType;
  const hit = externalIds.find(
    (ext) =>
      ext.externalId?.trim() &&
      (ext.communicationSystemId === commId || ext.type === extType)
  );
  return hit?.externalId?.trim();
}

function unwrapV2SingleEntity(data: unknown): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const root = data as Record<string, unknown>;
  const inner = root.value;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root;
}

interface ExternalIdPayload {
  externalId: string;
  communicationSystemId: string;
  type: string;
}

class SalesCloudService {
  /**
   * בונה URL נקי ללא סלאשים כפולים
   */
  private buildV2Url(path: string): string {
    const endpoint = env.v2.endpoint.replace(/\/$/, ""); // הסרת סלאש מסוף ה-endpoint
    const cleanPath = path.startsWith("/") ? path : `/${path}`; // וידוא סלאש בתחילת ה-path
    const fullUrl = `${endpoint}${cleanPath}`;
    console.log(`[V2 DEBUG] Requesting URL: ${fullUrl}`);
    return fullUrl;
  }

  private getV2Headers() {
    const basicAuth = Buffer.from(`${env.v2.user}:${env.v2.password}`).toString("base64");
    const authHeader = `Basic ${basicAuth}`;
    
    // לוג לבדיקת ה-Header (מדפיס רק את ההתחלה של ה-Base64 מטעמי אבטחה)
    console.log(`[V2 DEBUG] Auth Header: Basic ${basicAuth.substring(0, 10)}...`);
    
    return {
      Authorization: authHeader,
      "Content-Type": "application/json"
    };
  }

  async getAccountById(accountId: string): Promise<unknown> {
    const url = `${this.buildV2Url(env.v2.paths.accounts)}/${encodeURIComponent(accountId)}`;
    try {
      const response = await axios.get(url, {
        headers: this.getV2Headers(),
        timeout: 30000
      });
      return response.data;
    } catch (error: any) {
      this.handleV2Error(error, "getAccountById");
      throw error;
    }
  }

  private handleV2Error(error: any, context: string) {
    console.error(`❌ [V2 ERROR] Failed in ${context}:`, error.message);
    if (error.response) {
      console.error(`[V2 ERROR] Status: ${error.response.status}`);
      console.error(`[V2 ERROR] Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }

  async getV2AccountEntityWithCardResolution(partyId: string): Promise<{
    cardCode?: string;
    entity?: Record<string, unknown>;
  }> {
    console.log(`--- 🔍 Fetching SAP CardCode from V2 Account: ${partyId} ---`);

    const raw = await this.getAccountById(partyId);
    const entity = unwrapV2SingleEntity(raw);

    if (!entity) {
      console.error("❌ V2 Account response has no entity (value / root empty)");
      return {};
    }

    const externalIds = (entity.externalIds as Array<{
      externalId?: string;
      communicationSystemId?: string;
      type?: string;
    }>) ?? [];

    const commId = env.v2.b1CardCodeCommunicationSystemId;
    const extType = env.v2.b1CardCodeExternalIdType;

    const b1Entry = externalIds.find(
      (ext) =>
        ext.externalId &&
        (ext.communicationSystemId === commId || ext.type === extType)
    );

    const cardFromExt = b1Entry?.externalId?.trim();
    if (cardFromExt) {
      console.log(`✅ Found SAP CardCode in V2: ${cardFromExt}`);
      return { cardCode: cardFromExt, entity };
    }

    const extensions = entity.extensions as Record<string, unknown> | undefined;
    const backup =
      extensions?.ExternalIDB1 ?? extensions?.externalIDB1 ?? extensions?.ExternalIdB1;
    if (backup != null && String(backup).trim() !== "") {
      const backupCardCode = String(backup).trim();
      console.log(`✅ Found CardCode in Extensions: ${backupCardCode}`);
      return { cardCode: backupCardCode, entity };
    }

    console.log(
      `[V2] externalId is missing for account ${partyId} — will attempt B1 provisioning from same payload`
    );
    return { entity };
  }

  async getSapCardCodeFromV2(partyId: string): Promise<string | undefined> {
    const { cardCode } = await this.getV2AccountEntityWithCardResolution(partyId);
    return cardCode;
  }

  async getSalesQuoteById(quoteId: string): Promise<unknown> {
    const url = `${this.buildV2Url(env.v2.paths.salesQuotes)}/${encodeURIComponent(quoteId)}`;
    try {
      const response = await axios.get(url, {
        headers: this.getV2Headers(),
        timeout: 30000
      });
      return response.data;
    } catch (error: any) {
      this.handleV2Error(error, "getSalesQuoteById");
      throw error;
    }
  }

  async getContacts(): Promise<unknown> {
    const url = this.buildV2Url(env.v2.paths.contacts);
    const response = await axios.get(url, {
      headers: this.getV2Headers(),
      timeout: 30000
    });
    return response.data;
  }

  async getProductById(productId: string): Promise<unknown> {
    const url = this.buildV2Url(env.v2.paths.products);
    const response = await axios.get(url, {
      headers: this.getV2Headers(),
      params: {
        $filter: `id eq '${productId}'`
      },
      timeout: 30000
    });
    return response.data;
  }

  async writeBackAccountCardCode(accountId: string, cardCode: string): Promise<void> {
    const payload = {
      externalIds: [
        {
          externalId: cardCode,
          communicationSystemId: env.salesCloudWriteBack.communicationSystemId,
          type: env.salesCloudWriteBack.externalIdType
        } satisfies ExternalIdPayload
      ]
    };

    const url = `${this.buildV2Url(env.v2.paths.accounts)}/${encodeURIComponent(accountId)}`;
    await axios.patch(url, payload, {
      headers: this.getV2Headers(),
      timeout: 30000
    });
  }
}

export const salesCloudService = new SalesCloudService();