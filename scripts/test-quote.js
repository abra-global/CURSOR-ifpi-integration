/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const endpoint = process.env.TEST_QUOTE_ENDPOINT || "http://localhost:3000/api/sync/quotes";

const downloadsSq = path.join(process.env.USERPROFILE || "", "Downloads", "SQ.JSON");
const localFixture = path.join(__dirname, "fixtures", "SQ.json");
const defaultFixture = fs.existsSync(downloadsSq) ? downloadsSq : localFixture;
const payloadPath = process.env.TEST_QUOTE_JSON || defaultFixture;

let payload;
try {
  const raw = fs.readFileSync(payloadPath, "utf8");
  payload = JSON.parse(raw);
} catch (e) {
  console.error("[test-quote] Failed to read payload from:", payloadPath, e.message);
  process.exit(1);
}

async function run() {
  console.log("[test-quote] Payload file:", payloadPath);
  console.log("[test-quote] POST", endpoint);
  console.log(
    "[test-quote] Watch server logs for: --- 🔍 Fetching SAP CardCode from V2 Account --- and ✅ Found SAP CardCode..."
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = responseText;
  }

  console.log("[test-quote] HTTP Status:", response.status);
  console.log("[test-quote] Response:", JSON.stringify(parsed, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[test-quote] Failed:", error);
  process.exit(1);
});
