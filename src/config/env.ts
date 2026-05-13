import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  sapB1: {
    baseUrl: required("SAP_B1_BASE_URL"),
    companyDb: required("SAP_B1_COMPANY_DB"),
    username: required("SAP_B1_USERNAME"),
    password: required("SAP_B1_PASSWORD")
  },
  v2: {
    endpoint: required("V2_ENDPOINT"),
    user: required("V2_USER"),
    password: required("V2_PASSWORD"),
    paths: {
      salesQuotes: required("V2_SALESQUOTE_PATH"),
      accounts: required("V2_ACCOUNT_PATH"),
      contacts: required("V2_CONTACT_PATH"),
      products: required("V2_PRODUCT_PATH")
    },
    /** B1 CardCode on V2 Account externalIds (read path for quote sync). */
    b1CardCodeCommunicationSystemId:
      process.env.V2_B1_CARD_COMM_SYSTEM_ID ?? "00163e96-06a0-1eea-88cb-938684ea7fb5",
    b1CardCodeExternalIdType: process.env.V2_B1_CARD_EXTERNAL_TYPE ?? "sap.oitc.988"
  },
  salesCloudWriteBack: {
    communicationSystemId:
      process.env.SALES_CLOUD_COMM_SYSTEM_ID ??
      "98d9dd8c-b7e0-48ef-bb35-6457114e3f66",
    externalIdType: process.env.SALES_CLOUD_EXTERNAL_ID_TYPE ?? "sap.oitc.988"
  },
  defaults: {
    b1GroupCode: Number(process.env.DEFAULT_B1_GROUP_CODE ?? 100),
    /** B1 ItemCode used when the mapped product does not exist (spec: Generic Product fallback). */
    b1GenericItemCode: process.env.B1_GENERIC_ITEM_CODE ?? ""
  },
  alerts: {
    emailTo: process.env.ALERT_EMAIL_TO ?? "",
    smtp: {
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASSWORD ?? ""
    },
    from: process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? ""
  }
};