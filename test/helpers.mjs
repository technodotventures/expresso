import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "../src/compiler/compile.mjs";
import { parse } from "../src/language/parser.mjs";
import { loadCatalog } from "../src/providers/catalog.mjs";

export async function fixture(path) {
  return readFile(resolve(path), "utf8");
}

export async function foundation() {
  const source = await fixture("examples/refund.expresso");
  const catalog = await loadCatalog(resolve("providers/catalog.json"));
  const parsed = parse(source);
  if (!parsed.ok) throw new Error("Foundation example did not parse.");
  const compiled = compile(parsed.ast, catalog, { source });
  if (!compiled.executable) throw new Error("Foundation example did not compile.");
  return { source, catalog, parsed, compiled };
}

export const input = {
  case_id: "case-2026-0001",
  order_id: "order-100",
  customer_id: "customer-1",
  remaining_paid: 500,
};

export const runtimeGrants = [
  "ai.propose_refund",
  "payments.refund",
  "payments.lookup_refund",
];
