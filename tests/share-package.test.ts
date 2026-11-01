import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
  writeFileSync(join(project, ".env.example"), ["TELEGRAM_BOT_TOKEN=", "TELEGRAM_CHAT_ID=", "TRADINGVIEW_WEBHOOK_SECRET="].join("\n") + "\n");
  writeFileSync(join(project, ".env"), "SENSITIVE_SENTINEL_ENV");
  writeFileSync(join(project, ".env.production"), "SENSITIVE_SENTINEL_PROD");
  writeFileSync(join(project, "README.md"), "safe project file");
  for (const path of [".git/config", "node_modules/pkg/index.js", "__pycache__/mod.pyc", ".vercel/project.json", "certs/private.pem", "certs/key.p12", "local.sqlite", ".npmrc", "app/.env.staging", "app/secrets.json", "app/production-secrets.toml", "config/api-credentials.json", ".aws/credentials", ".ssh/id_ed25519", ".config/gcloud/application_default_credentials.json", "service.envrc", "project-backup.zip"]) {
    const full = join(project, path);
    mkdirSync(resolve(full, ".."), { recursive: true });
    writeFileSync(full, "SENSITIVE_SENTINEL_ARTIFACT");
  }
  symlinkSync(join(project, "README.md"), join(project, "linked-readme.md"));
  const script = resolve("scripts/package_share.py");
  const created = spawnSync("python3", [script, "--root", project, "--output", output], { encoding: "utf8" });
  expect(created.status, created.stderr).toBe(0);
  const inspect = spawnSync("python3", ["-c", [
    "import json,sys,zipfile",
    "z=zipfile.ZipFile(sys.argv[1])",
    "print(json.dumps({'names':z.namelist(),'contents':[z.read(n).decode('utf8','replace') for n in z.namelist()]}))",
  ].join(";"), output], { encoding: "utf8" });
  expect(inspect.status).toBe(0);
  const archive = JSON.parse(inspect.stdout) as { names: string[]; contents: string[] };
  expect(archive.names).toContain(".env.example");
  expect(archive.names).toContain("README.md");
  for (const forbidden of [".env", ".env.production", ".git/config", "node_modules/pkg/index.js", "__pycache__/mod.pyc", ".vercel/project.json", "certs/private.pem", "certs/key.p12", "local.sqlite", ".npmrc", "app/.env.staging", "app/secrets.json", "app/production-secrets.toml", "config/api-credentials.json", ".aws/credentials", ".ssh/id_ed25519", ".config/gcloud/application_default_credentials.json", "service.envrc", "project-backup.zip", "linked-readme.md"]) {
    expect(archive.names).not.toContain(forbidden);
  }
  expect(archive.contents.join("\n")).not.toContain("SENSITIVE_SENTINEL");
  expect(readFileSync(join(project, ".env.example"), "utf8")).toContain("TRADINGVIEW_WEBHOOK_SECRET=");

  mkdirSync(join(project, "logs"), { recursive: true });
  writeFileSync(join(project, "logs/pasted-log.txt"), `token=${"1234567890" + ":" + "A".repeat(40)}`);
  const contaminated = spawnSync("python3", [script, "--root", project, "--output", output], { encoding: "utf8" });
  expect(contaminated.status).not.toBe(0);
  expect(contaminated.stderr).toContain("credential-like value");
  expect(contaminated.stderr).not.toContain("1234567890" + ":");
});
