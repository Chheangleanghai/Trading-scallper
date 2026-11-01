# Security, share exports, and delivery adapter

**Status:** local engineering only, 2026-11-01. No credential values are recorded here.

## Credential exposure response

The user reports that a previously distributed project ZIP contained non-placeholder values for `TELEGRAM_BOT_TOKEN` and `TRADINGVIEW_WEBHOOK_SECRET`. This workspace review did not print or inspect those values, and this report intentionally records only variable names.

- Rotate `TELEGRAM_BOT_TOKEN` with BotFather, then update the intended deployment secret store and any authorized local configuration. Revoke the exposed token.
- Rotate `TRADINGVIEW_WEBHOOK_SECRET` to a new high-entropy value, update its deployment configuration, and update only the intended TradingView alert URL/configuration. Treat prior copies as exposed.
- `TELEGRAM_CHAT_ID` is excluded from exports as private configuration even though it is not an authentication token.
- No credentials were rotated and no Vercel settings were changed in this implementation pass. Rotation is an external account action that needs the owner/operator to perform.
- The existing local `.env` was not read into output, copied into an archive, or edited. Keep it untracked and out of all shared archives.

## Safe project archive

`npm run package:share` invokes `scripts/package_share.py` and writes `../xauusd-smart-scalper-share.zip`. The archive must be outside the repository. The allow-by-exclusion policy filters `.env`/environment variants (while including root `.env.example`), `.git`, `.vercel`, `node_modules`, build/cache directories, local SQLite/database files, npm config, common private-key files, and symlinks. An automated fixture test verifies the archive file list and checks that sentinel contents do not appear.

The command was not run against this worktree, which contains the local `.env`; only its temporary fixture test was run. Before sharing, inspect the generated archive listing and use the script rather than manually zipping the project directory.

## Delivery implementation and limits

`src/delivery.ts` validates queued signals using the webhook's shared payload validator and size limit, hashes canonical JSON, distinguishes duplicate payloads from event-ID collisions, and makes retry decisions. Telegram 429 delays are never shortened to the local exponential-backoff cap. Numeric policy, attempt, retry and timestamp ranges are validated.

`src/local-outbox.ts` provides local SQLite transactions and a worker state machine for research/development: atomic `(source,eventId)` uniqueness, payload-collision quarantine, queue claims, leases, retry timestamps, sent/dead-letter/ambiguous outcomes, and restart recovery. If a lease expires before a request starts, the row can be queued again; if the request may have started, recovery marks it ambiguous and does not automatically resend. An ambiguous outcome can still mean Telegram accepted a message, so exactly-once Telegram delivery is not guaranteed.

The adapter is not connected to `api/webhook.ts`. Local SQLite files are not durable or coordinated storage for Vercel/serverless workers. Production integration still needs an approved persistent database/queue, atomic database semantics, worker runtime/leases, secret configuration, observability, retention, and operator procedures for ambiguous and dead-letter cases. No paid service, deployment, Telegram request, alert, or trade was used.
