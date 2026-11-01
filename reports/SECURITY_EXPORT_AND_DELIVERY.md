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

`npm run package:share` invokes `scripts/package_share.py` and writes `../xauusd-smart-scalper-share.zip`. The archive must be outside the repository. The allow-by-exclusion policy filters `.env`/environment variants (while including root `.env.example`), `.git`, `.vercel`, `node_modules`, build/cache directories, local SQLite/database files, credential/secret filenames, cloud credential directories, archives, npm config, common private-key files, and symlinks. The generated ZIP is validated before it is atomically moved into place; selected text files are scanned for common credential/token shapes, and failures identify only a filename, never matched contents. An automated fixture test verifies nested paths and symlinks are excluded, `.env.example` remains, sentinel contents do not appear, and a credential-pattern fixture is rejected.

The command generated `/Users/macbook/Documents/Trading2/xauusd-smart-scalper-share.zip`. Script verification and independent archive checks found 142 members, root `.env.example`, zero forbidden paths, and zero matches for checked token patterns. The local `.env` was not included or read. The archive is outside the repository and ready for user review; review its contents before sending it onward.

## Delivery implementation and limits

`src/delivery.ts` validates queued signals using the webhook's shared payload validator and size limit, hashes canonical JSON, distinguishes duplicate payloads from event-ID collisions, and makes retry decisions. Telegram 429 delays are never shortened to the local exponential-backoff cap. Numeric policy, attempt, retry and timestamp ranges are validated.

`src/local-outbox.ts` provides local SQLite transactions and a portable async worker-repository contract for research/development: atomic `(source,eventId)` uniqueness, payload-collision quarantine, queue claims, leases, retry timestamps, sent/dead-letter/ambiguous outcomes, and restart recovery. Pre-send crashes are requeued only until the configured attempt limit; expired request-started leases become ambiguous. Lease tokens, send-start uniqueness, and strict lease-time checks reject stale workers and late completions. An ambiguous outcome can still mean Telegram accepted a message, so exactly-once Telegram delivery is not guaranteed.

The adapter is not connected to `api/webhook.ts`. Local SQLite files are not durable or coordinated storage for Vercel/serverless workers. Production integration still needs an approved persistent database/queue, atomic database semantics, worker runtime/leases, secret configuration, observability, retention, and operator procedures for ambiguous and dead-letter cases. No paid service, deployment, Telegram request, alert, or trade was used.

## Direct webhook versus a future durable queue

| Behavior | Current direct webhook | Proposed durable queued path |
| --- | --- | --- |
| HTTP success | Waits for Telegram; returns success only after Telegram acknowledges. A timeout/error can return 502 even if Telegram received the request. | Returns accepted only after an atomic durable insert/duplicate decision. Telegram delivery can happen later. |
| Duplicate event ID | Each valid HTTP request can call Telegram again; production webhook currently has no persistent deduplication. | Unique `(source,eventId)` prevents a second enqueue. Same ID/different payload is quarantined. |
| Retry | No automatic retry in `api/webhook.ts`. Caller retry may resend after an ambiguous timeout. | Worker schedules retryable outcomes including Telegram's full `retry_after`; attempts are bounded. |
| Failure visibility | Request-level 502 only; no persistent event state. | Durable sent/retry/dead-letter/ambiguous state and lease recovery. Ambiguous outcomes need review; no exactly-once promise. |

For a future Vercel deployment, keep the HTTP handler thin: validate/authenticate, atomically insert into a managed relational outbox with `UNIQUE(source,event_id)`, and return only after commit. Duplicate same-hash events should return accepted without enqueueing; mismatched hashes should be quarantined and surfaced. A separately invoked worker should claim rows in a short transaction using a lease and database locking, commit before network I/O, mark request-start before calling Telegram, and condition updates on the lease token plus unexpired lease. Reap expired pre-send leases up to the max-attempt bound; move expired post-start leases to ambiguous. Store credentials only in the managed secret store. This design is not implemented or deployed; the current `api/webhook.ts` remains unchanged.
