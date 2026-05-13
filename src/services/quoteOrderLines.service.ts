import { env } from "../config/env";
import { sapB1Service } from "./sapB1.service";

export interface B1OrderLinePayload {
  LineNum?: number;
  ItemCode?: string;
  ItemDescription?: string;
  Quantity?: number;
  UnitPrice?: number;
  Currency?: string;
  WarehouseCode?: string;
  UoMCode?: string;
  U_ExItemCode?: string;
  U_ExPrice?: number;
}

/**
 * Ensures each line uses an ItemCode that exists in B1.
 * If the mapped code is missing, uses generic item (spec §10 / generic product fallback).
 * If generic is also unavailable, sends alert email and throws.
 */
export async function resolveOrderLinesItemCodes(lines: B1OrderLinePayload[]): Promise<B1OrderLinePayload[]> {
  const genericCode = env.defaults.b1GenericItemCode?.trim();

  const resolved: B1OrderLinePayload[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = { ...lines[i] };
    const requested = (line.ItemCode ?? "").trim();

    const exists = requested ? await sapB1Service.itemExists(requested) : false;

    if (exists) {
      resolved.push(line);
      continue;
    }

    console.warn("[Quote] Item not found in B1, attempting generic fallback", {
      lineIndex: i,
      requestedItemCode: requested || "(empty)"
    });

    if (!genericCode) {
      throw new Error(
        `Product ItemCode "${requested || "(empty)"}" does not exist in B1 and B1_GENERIC_ITEM_CODE is not set. Line: ${JSON.stringify(
          line
        )}`
      );
    }

    const genericOk = await sapB1Service.itemExists(genericCode);
    if (!genericOk) {
      throw new Error(
        `Original ItemCode "${requested}" missing in B1; configured generic ItemCode "${genericCode}" also does not exist in B1. Line: ${JSON.stringify(
          line
        )}`
      );
    }

    line.ItemCode = genericCode;
    if (!line.ItemDescription?.trim()) {
      line.ItemDescription = `Generic fallback (was: ${requested || "n/a"})`;
    }

    resolved.push(line);
  }

  return resolved;
}
