import { B1BusinessPartnerPayload } from "../mappers/account.mapper";

/** V2 webhook may wrap the account in currentImage or send the account root directly. */
export function mapV2AccountToB1(v2Data: Record<string, unknown>): B1BusinessPartnerPayload {
  const data = (v2Data.currentImage as Record<string, unknown> | undefined) ?? v2Data;
  const primaryAddress = (data.addresses as Record<string, unknown>[] | undefined)?.[0] ?? {};
  const contactsArray = (data.contactPersons as Record<string, unknown>[] | undefined) ?? [];

  const teamMember = (data.accountTeamMembers as { employeeDisplayId?: string | number }[] | undefined)?.[0];
  const rawSalesPerson = teamMember?.employeeDisplayId;
  const salesPersonCode =
    rawSalesPerson !== undefined && rawSalesPerson !== null && `${rawSalesPerson}`.trim() !== ""
      ? Number(rawSalesPerson)
      : -1;

  return {
    CardName: (data.formattedName as string | undefined) || "Unknown Customer",
    CardType: "cCustomer",
    AdditionalID: data.displayId as string | undefined,
    SalesPersonCode: Number.isFinite(salesPersonCode) ? salesPersonCode : -1,
    Address: (primaryAddress.formattedPostalAddressDescription as string | undefined) || "",
    Phone1: (primaryAddress.phoneNormalisedNumber as string | undefined) || "",
    Phone2: (primaryAddress.mobileNormalisedNumber as string | undefined) || "",
    MailAddress: (primaryAddress.eMail as string | undefined) || "",
    GroupCode:
      (data.extensions as { GroupCodeB1?: number } | undefined)?.GroupCodeB1 ?? 100,
    ContactEmployees: contactsArray.map((contact) => ({
      Name:
        (contact.formattedName as string | undefined) ||
        `${(contact.givenName as string | undefined) ?? ""} ${(contact.familyName as string | undefined) ?? ""}`.trim(),
      FirstName: contact.givenName as string | undefined,
      LastName: contact.familyName as string | undefined,
      E_Mail: contact.eMail as string | undefined,
      Phone1: contact.phoneNormalisedNumber as string | undefined,
      MobilePhone: contact.mobileNormalisedNumber as string | undefined,
      U_C4C_InternalID: contact.displayId as string | undefined,
      U_C4C_UUID: contact.id as string | undefined
    }))
  };
}
