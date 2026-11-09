# Packaged clean-install verification — 2026-11-08

The immutable research ZIP was verified, extracted into a new disposable directory, installed from its included lockfile, and tested independently of the working checkout. All packaged source files remained unchanged. The extraction was removed afterward; the original ZIP and sidecar receipt were preserved.

| Check | Result |
| --- | --- |
| ZIP and sidecar SHA-256 / embedded manifest | PASS |
| Safe unique archive paths and extraction hashes | PASS — 1,036 members; no symlinks |
| Fresh `npm ci --no-fund` | PASS — 40 packages added, 41 audited, zero reported vulnerabilities |
| Fresh `npm run verify` | PASS — 238 tests in 27 files; zero failures or skips |
| Typecheck and both Pine generation checks | PASS |
| Independent Pine parser | PASS — 31 files; not the TradingView compiler |
| Packaged source/code/config/test hashes versus current checkout | PASS — no mismatches |
| Packaged files changed by installation/verification | None |
| Localhost EPERM integration failure | Not observed |
| Native TradingView compile, parity, Replay, OOS | Not performed by this installation check |

Environment: Node v24.21.0 and npm 11.19.0. npm reported unapproved optional `fsevents@2.3.3` install scripts; no approval setting was changed, and all verification passed.

Archive: `../../../xauusd-smart-scalper-v090-research-2026-11-08-hardening.zip` (112,489,600 bytes), SHA-256 `b2ae1940082125f22f5fa090f1ff02a6aef35c4c036cfa9d9d94f1fab83aa4e2`.

The separate evidence directory is [xauusd-v090-clean-install-2026-11-08-yy5ezb0l](../../../xauusd-v090-clean-install-2026-11-08-yy5ezb0l/receipt.json), containing the machine-readable receipt plus `npm-ci.log` and `npm-verify.log`. This follow-up evidence is outside the earlier immutable ZIP; no new archive or replacement was created.

The frozen v0.8.0 Indicator/Strategy hashes still match their recorded baselines. This proves local package installation and test reproducibility on this Mac. It does not establish TradingView source identity, signal parity, non-repainting, profitability, live broker fills, or Telegram delivery.
