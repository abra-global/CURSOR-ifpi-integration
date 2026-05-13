export interface SalesCloudExternalId {
  externalId: string;
  communicationSystemId?: string;
  type?: string;
}

export interface SalesCloudContactPerson {
  id?: string;
  displayId?: string;
  formattedName?: string;
  givenName?: string;
  familyName?: string;
  eMail?: string;
  phoneNormalisedNumber?: string;
  mobileNormalisedNumber?: string;
  ContactIDB1?: string;
}

export interface SalesCloudAccountPayload {
  id: string;
  displayId: string;
  formattedName: string;
  formattedPostalAddressDescription?: string;
  phoneNormalisedNumber?: string;
  mobileNormalisedNumber?: string;
  eMail?: string;
  employeeDisplayId?: string;
  Extensions?: {
    GroupCodeB1?: number;
  };
  externalIds?: SalesCloudExternalId[];
  contactPersons?: SalesCloudContactPerson[];
}

export interface SalesCloudQuoteItem {
  displayId?: string;
  name?: string;
  description?: string;
  quantity?: { content?: number };
  scheduleLines?: Array<{ quantity?: { content?: number } }>;
  extensions?: {
    ERPline?: number;
  };
  productData?: {
    productId?: string;
  };
  totalValues?: {
    netAmount?: { content?: number; currencyCode?: string };
  };
  priceElements?: Array<{
    code?: string;
    description?: string;
    stepNumber?: number;
    rateAmount?: {
      content?: number;
      currencyCode?: string;
    };
    calculatedAmount?: {
      content?: number;
      currencyCode?: string;
    };
  }>;
  externalIds?: SalesCloudExternalId[];
}

export interface SalesCloudQuotePayload {
  id: string;
  displayId: string;
  documentDate?: string;
  businessTerms?: {
    currency?: string;
  };
  extensions?: {
    zPaymentTerms?: number;
  };
  account?: {
    partyId?: string;
    partyDisplayId?: string;
    /** Populated after account sync write-back: B1 CardCode */
    externalIds?: SalesCloudExternalId[];
  };
  externalIds?: SalesCloudExternalId[];
  items?: SalesCloudQuoteItem[];
}
