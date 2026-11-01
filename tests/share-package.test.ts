import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

it("builds a share archive with the placeholder template and no local secrets or caches", () => {
  const temp = mkdtempSync(join(tmpdir(), "xauusd-share-test-"));
  roots.push(temp);
  const project = join(temp, "project");
  const output = join(temp, "share.zip");
  mkdirSync(project);
  writeFileSync(join(project, ".env.example"), "TELEGRAM_BOT_TOKEN=\nTELEGRAM_CHAT_ID=\nTRADINGVIEW_WEBHOOK_SECRET=\n");
  writeFileSync(join(project, ".env"), "SENSITIVE_SENTINEL_ENV");
  writeFileSync(join(project, ".env.production"), "SENSITIVE_SENTINEL_PROD");
  writeFileSync(join(project, "README.md"), "safe project file");
  for (const path of [".git/config", "node_modules/pkg/index.js", "__pycache__/mod.pyc", ".vercel/project.json", "certs/private.pem", "local.sqlite", ".npmrc"]) {
    const full = join(project, path);
    mkdirSync(resolve(full, ".."), { recursive: true });
    writeFileSync(full, "SENSITIVE_SENTINEL_ARTIFACT");
  }
  const script = resolve("scripts/package_share.py");
  const created = spawnSync("python3", [script, "--root", project, "--output", output], { encoding: "utf8" });
  expect(created.status).toBe(0);
  const inspect = spawnSync("python3", ["-c", [
    "import json,sys,zipfile",
    "z=zipfile.ZipFile(sys.argv[1])",
    "print(json.dumps({'names':z.namelist(),'contents':[z.read(n).decode('utf8','replace') for n in z.namelist()]}))",
  ].join(";"), output], { encoding: "utf8" });
  expect(inspect.status).toBe(0);
  const archive = JSON.parse(inspect.stdout) as { names: string[]; contents: string[] };
  expect(archive.names).toContain(".env.example");
  expect(archive.names).toContain("README.md");
  for (const forbidden of [".env", ".env.production", ".git/config", "node_modules/pkg/index.js", "__pycache__/mod.pyc", ".vercel/project.json", "certs/private.pem", "local.sqlite", ".npmrc"]) {
    expect(archive.names).not.toContain(forbidden);
  }
  expect(archive.contents.join("\n")).not.toContain("SENSITIVE_SENTINEL");
  expect(readFileSync(join(project, ".env.example"), "utf8")).toContain("TRADINGVIEW_WEBHOOK_SECRET=");
});
