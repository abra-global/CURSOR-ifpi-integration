/* eslint-disable no-console */
const endpoint = process.env.TEST_ENDPOINT || "http://localhost:3000/api/sync/accounts";

/** Realistic V2 Account webhook payload (beforeImage / currentImage / dataContext) */
const payload = {
  beforeImage: null,
  currentImage: {
    lifeCycleStatus: "ACTIVE",
    isProspect: false,
    customerRole: "CRM000",
    formattedName: "מסייעת 71",
    isNaturalPerson: false,
    blockingReasons: {
      isSalesSupportBlocked: false
    },
    firstLineName: "מסייעת 71",
    ownerId: "019d01a7-562a-7aa3-b62d-1957451cc73d",
    adminData: {
      createdOn: "2026-05-12T06:47:53.456Z",
      createdBy: "81d0b8c8-16e4-11f1-9705-2967b1784c9f",
      updatedOn: "2026-05-12T06:47:53.456Z",
      updatedBy: "81d0b8c8-16e4-11f1-9705-2967b1784c9f"
    },
    id: "019e1aef-cbfa-7bbd-8841-7d9a122c1750",
    displayId: "1001722",
    isBusinessPurposeCompleted: false,
    defaultAddress: {
      country: "IL",
      region: {
        country: "IL",
        region: "01"
      },
      postalCode: "723938",
      cityName: "הרצליה",
      streetName: "פלוגת מסלול",
      houseId: "5",
      isPostOfficeBoxAddress: false,
      formattedPostalAddressDescription: "5 פלוגת מסלול / 723938 הרצליה / IL"
    },
    defaultCommunication: {
      eMail: "May232@walla.com",
      phoneFormattedNumber: "+972 52342321",
      phoneNormalisedNumber: "+97252342321"
    },
    addresses: [
      {
        isDefaultAddress: true,
        country: "IL",
        region: {
          country: "IL",
          region: "01"
        },
        cityName: "הרצליה",
        streetName: "פלוגת מסלול",
        houseId: "5",
        postalCode: "723938",
        isPostOfficeBoxAddress: false,
        formattedPostalAddressDescription: "5 פלוגת מסלול / 723938 הרצליה / IL",
        eMail: "May232@walla.com",
        phoneFormattedNumber: "+972 52342321",
        phoneNormalisedNumber: "+97252342321",
        phone: {
          country: "IL",
          subscriberId: "052342321"
        },
        billToAddressRelevance: "NO",
        deliveryAddressRelevance: "NO",
        id: "019e1af0-a689-744c-a746-8d3e87d2e1c0",
        parentId: "019e1aef-cbfa-7bbd-8841-7d9a122c1750",
        addressId: "019e1af0-a689-744c-a746-953e87d2e1c0"
      }
    ],
    salesArrangements: [
      {
        blockingReasons: {
          isSalesSupportBlocked: false
        },
        id: "019e1af1-1e6d-7993-8969-fb6174948b6d",
        salesOrganizationId: "00163e96-06a0-1eda-889a-28de1995878b",
        distributionChannel: "01",
        division: "00",
        isMarkedForDeletion: false,
        isCompleteDeliveryRequested: false
      }
    ],
    accountTeamMembers: [
      {
        employeeId: "019d01a7-562a-7aa3-b62d-1957451cc73d",
        role: "BUR011-1",
        isDefault: true,
        id: "019e1af0-0167-7dd4-840f-490b855c5062",
        validFrom: "0001-01-01",
        validTo: "9999-12-31"
      }
    ],
    accessControlEntries: [
      "019d01a7-562a-7aa3-b62d-1957451cc73d",
      "89a4a58c-dee9-304a-809b-ecd6b5a70931",
      "dd404fb3-004a-3072-b393-3d09f5af8b95",
      "af3c45a0-a7df-38c6-a8fc-8a6f762bfc8c"
    ]
  },
  dataContext: {
    requestedByUser: "81d0b8c8-16e4-11f1-9705-2967b1784c9f",
    requestProcessedOn: "2026-05-12T06:47:53.456Z"
  }
};

async function run() {
  console.log("[Test Integration] Sending webhook simulation to:", endpoint);
  console.log("[Test Integration] Payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = responseText;
  }

  console.log("[Test Integration] HTTP Status:", response.status);
  console.log("[Test Integration] Response Body:", JSON.stringify(parsed, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[Test Integration] Failed to run:", error);
  process.exit(1);
});
