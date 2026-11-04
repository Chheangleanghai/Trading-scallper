import { readFileSync } from "node:fs";
import { canTranspilePineScript } from "@opus-aether-ai/pine-transpiler";
let failed = false;
for (const name of [
  "indicator.pine",
  "strategy.pine",
  "validation.pine",
  "experiments/strategy_exit_audit.pine",
  "experiments/quantity_rounding_probe.pine",
  "experiments/strategy_quantity_units.pine",
  "experiments/quantity_units_matrix.pine",
]) {
  const result = canTranspilePineScript(
    readFileSync(new URL(`../pine/${name}`, import.meta.url), "utf8"),
  );
  console.log(
    `${name}: ${result.valid ? "independent parse passed" : result.reason}`,
  );
  failed ||= !result.valid;
}
console.log(
  "This independent parser does not certify TradingView compilation or broker-emulator behavior.",
);
if (failed) process.exitCode = 1;
