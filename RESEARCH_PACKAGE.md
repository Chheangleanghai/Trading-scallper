# Research snapshot packaging

The project remains v0.8.0. The diagnostic Indicator and compact diagnostic Strategy are experiments toward v0.9.0. A ZIP produced here is a local review snapshot; packaging does not pass TradingView, profitability, Replay, or live-readiness gates.

Install the locked development tools and run local verification before packaging. Tests mock delivery; these commands do not send Telegram messages. Verification includes both frozen-source and diagnostic-source generation checks plus the independent Pine parser; the parser does not certify TradingView compilation.

```sh
npm ci
npm run verify
```

After completing verification, create a new snapshot outside the repository:

```sh
npm run package:research -- --output ../xauusd-smart-scalper-research-2026-11-08.zip
```

Use a new filename for each snapshot. The command refuses to replace an existing ZIP or its receipt. It reuses `scripts/package_share.py` to exclude `.env` files, credentials, Git history, dependencies, caches, databases, archives, and symlinks. Credential-shaped values are checked in every included file, including `.pine.inc` sources and copied logs. Standard JPEG Huffman symbol arrays can mimic token text; matches fully inside structurally validated DHT symbol arrays are ignored. JPEG detection uses file bytes rather than the suffix, and metadata, appended text, and malformed JPEGs remain scanned. This is marker validation, not full image decoding or detection of secrets deliberately hidden in image data. Pattern checks cannot guarantee that every possible secret is absent; review the intended inputs before sharing.

The ZIP contains `RESEARCH_MANIFEST.json`, with a SHA-256 and byte size for every other member. The manifest pins both frozen baseline hashes, both diagnostic sources and their actual parent files, and the retained November 8 raw Strategy capture. A changed baseline, mismatched diagnostic parent declaration, or changed preserved raw capture prevents packaging. It records native/parity gates as blocked and performance as inconclusive, and explicitly states that the packager did not execute tests.

A separate `<archive>.receipt.json` pins the ZIP digest and embedded manifest digest. Keep the receipt beside the ZIP. Verify a downloaded or copied snapshot without extracting it:

```sh
npm run package:research -- --verify ../xauusd-smart-scalper-research-2026-11-08.zip
```

Verification checks allowed archive paths, credential patterns, unique paths, the complete member inventory, frozen source hashes, and diagnostic parent relationships. Compare the resulting `archiveSha256` with the original receipt. Hashes identify local bytes; they do not authenticate TradingView authorship, prove exact editor copy-back, or certify native parity.

For native installation, use `pine/experiments/indicator_signal_diagnostics.pine` and `pine/experiments/strategy_signal_diagnostics.pine` as temporary research drafts. Keep their actual trading inputs matched and enable their bounded diagnostic window only for the capture being investigated. The compact Strategy omits several Indicator display panels to reduce compiled size. Preserve the saved chart and restore Autosave after testing. Current native evidence and open gates are documented in `reports/native-v090/`.
