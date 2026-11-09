import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const script = resolve("scripts/package_research.py");
const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const run = (...args: string[]) => spawnSync("python3", [script, ...args], { encoding: "utf8" });

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "xauusd-research-package-"));
  roots.push(directory);
  const root = join(directory, "project"), output = join(directory, "candidate.zip");
  mkdirSync(root);
  for (const file of [".env.example", "package.json", "pine/indicator.pine", "pine/strategy.pine",
    "pine/experiments/indicator_signal_diagnostics.pine", "pine/experiments/strategy_signal_diagnostics.pine",
    "pine/experiments/indicator_signal_clarity.pine", "pine/experiments/strategy_signal_clarity.pine",
    "reports/native-v090/tradingview-strategy-signal-diag-2026-11-08.csv"]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(resolve(file), join(root, file));
  }
  writeFileSync(join(root, "README.md"), "research only\n");
  writeFileSync(join(root, ".env"), "SENSITIVE_SENTINEL_DO_NOT_EXPORT");
  return { root, output, directory };
}

it("pins every included file and source relationship without claiming native or test success", () => {
  const { root, output } = fixture();
  const result = run("--root", root, "--output", output);
  expect(result.status, result.stderr).toBe(0);
  const receipt = JSON.parse(result.stdout);
  expect(receipt.archiveSha256).toBe(sha(output));
  expect(receipt.releaseStatus).toBe("RESEARCH_ONLY_NOT_RELEASED");
  expect(receipt.gates.localVerification).toBe("NOT_EXECUTED_BY_PACKAGER");
  expect(receipt.gates.nativeSourceAttributionAndParity).toBe("BLOCKED");
  const inspect = spawnSync("python3", ["-c", "import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(z.read('RESEARCH_MANIFEST.json').decode())", output], { encoding: "utf8" });
  expect(inspect.status).toBe(0);
  const manifest = JSON.parse(inspect.stdout);
  expect(manifest.files[".env"]).toBeUndefined();
  expect(manifest.files["pine/indicator.pine"].sha256).toBe(sha(join(root, "pine/indicator.pine")));
  expect(manifest.sources.diagnosticSources["pine/experiments/strategy_signal_diagnostics.pine"].parentSha256)
    .toBe(sha(join(root, "pine/experiments/strategy_signal_clarity.pine")));
  expect(JSON.parse(readFileSync(output + ".receipt.json", "utf8"))).toEqual(receipt);
  expect(run("--verify", output).status).toBe(0);
  const second = run("--root", root, "--output", output);
  expect(second.status).toBe(2);
  expect(second.stderr).toContain("already exists");
  expect(sha(output)).toBe(receipt.archiveSha256);
});

it("rejects an altered frozen baseline before publishing a snapshot", () => {
  const { root, output } = fixture();
  writeFileSync(join(root, "pine/indicator.pine"), "changed baseline");
  const result = run("--root", root, "--output", output);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("frozen baseline hash mismatch");
  expect(existsSync(output)).toBe(false);
  expect(existsSync(output + ".receipt.json")).toBe(false);
});

it("detects member-content tampering and duplicate archive paths during independent verification", () => {
  const { root, output, directory } = fixture();
  expect(run("--root", root, "--output", output).status).toBe(0);
  const tampered = join(directory, "tampered.zip");
  const changed = spawnSync("python3", ["-c", [
    "import sys,zipfile",
    "source=zipfile.ZipFile(sys.argv[1])",
    "target=zipfile.ZipFile(sys.argv[2],'w')",
    "[target.writestr(n, b'altered' if n=='README.md' else source.read(n)) for n in source.namelist()]",
    "target.close()",
  ].join(";"), output, tampered], { encoding: "utf8" });
  expect(changed.status).toBe(0);
  const rejected = run("--verify", tampered);
  expect(rejected.status).toBe(2);
  expect(rejected.stderr).toContain("file inventory mismatch");
  const duplicate = spawnSync("python3", ["-c", "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],'a'); z.writestr('README.md','research only\\n'); z.close()", output], { encoding: "utf8" });
  expect(duplicate.status).toBe(0);
  expect(run("--verify", output).stderr).toContain("duplicate archive paths");
});
