import { env } from "../config/env";
import { SalesCloudAccountPayload } from "../types/integration.types";

export interface B1BusinessPartnerPayload {
  CardCode?: string;
  CardType: "cCustomer";
  CardName: string;
  AdditionalID?: string;
  Address?: string;
  Phone1?: string;
  Phone2?: string;
  MailAddress?: string;
  /** SAP B1 sales person code; `-1` when unknown per V2 webhook mapping */
  SalesPersonCode?: number;
  GroupCode: number;
  ContactEmployees: Array<{
    Name?: string;
    FirstName?: string;
    LastName?: string;
    E_Mail?: string;
    Phone1?: string;
    MobilePhone?: string;
    InternalCode?: string;
    U_C4C_InternalID?: string;
    U_C4C_UUID?: string;
  }>;
}

function toNumber(value?: string | number): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function mapAccountToBusinessPartner(
  account: SalesCloudAccountPayload
): B1BusinessPartnerPayload {
  return {
    CardType: "cCustomer",
    CardName: account.formattedName,
    AdditionalID: account.displayId,
    Address: account.formattedPostalAddressDescription,
    Phone1: account.phoneNormalisedNumber,
    Phone2: account.mobileNormalisedNumber,
    MailAddress: account.eMail,
    SalesPersonCode: toNumber(account.employeeDisplayId),
    GroupCode: account.Extensions?.GroupCodeB1 ?? env.defaults.b1GroupCode,
    ContactEmployees: (account.contactPersons ?? []).map((contact) => ({
      Name: contact.formattedName,
      FirstName: contact.givenName,
      LastName: contact.familyName,
      E_Mail: contact.eMail,
      Phone1: contact.phoneNormalisedNumber,
      MobilePhone: contact.mobileNormalisedNumber,
      InternalCode: contact.ContactIDB1,
      U_C4C_InternalID: contact.displayId,
      U_C4C_UUID: contact.id
    }))
  };
}
