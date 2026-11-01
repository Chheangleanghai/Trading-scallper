# Native compile evidence context — v0.8.0

**Reviewed:** 2026-11-01 (Asia/Phnom_Penh)  
**Chart shown:** FOREX.com XAUUSD, 5-minute  
**Source revision under review:** Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`; Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.

The source hashes above are the already verified local/copy-back identities. They are not visible in the screenshots and are not independently tied to the editor buffers shown here.

## Indicator screenshot supplied in chat

- **Visible draft title:** truncated as `XAUUSD SMART …`.
- **Visible editor content:** source tail through line 1333, with cursor at line 1334. This is consistent with the Indicator draft but does not identify or hash the complete buffer.
- **Compile messages:** `11:06:44 AM Compiled.` and `11:06:44 AM Added to chart.` are visible. Earlier compile messages are also present in the pane.
- **Compile result:** successful compile is visible for a TradingView editor/chart instance.
- **Attribution:** exact association to `indicator-tradingview-copy.pine` and SHA-256 `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` is **not independently established**. The screenshot does not show the full draft identity/hash or prove that the displayed editor is the unchanged draft that produced the copy-back.

## Strategy screenshot supplied in chat

- **Visible draft title:** `Untitled script`.
- **Visible editor content:** Strategy source tail through approximately line 1470, with the editor status at line 1472. This is consistent with a Strategy source buffer but does not identify or hash the complete buffer.
- **Compile messages:** the same `11:06:44 AM Compiled.` / `Added to chart` entries are visible as in the Indicator screenshot. They do not provide a separately timed compile event that can be attributed to this Strategy draft.
- **Chart context:** XAUUSD 5-minute chart with Strategy Tester visible.
- **Compile result:** **not independently verified for the Strategy draft**. The shared timestamp and lack of a distinct compile event leave open whether these are earlier messages from another editor instance/script.
- **Attribution:** no direct link from this screenshot to `strategy-tradingview-normalized.pine` and SHA-256 `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` is established.

## Evidence storage and gate decision

The two new screenshots were supplied as inline chat images. Their binary originals are not available as separate workspace files in `reports/native-v080/`, so no image-file SHA-256 can be recorded and they have not been copied over the older `indicator-compile.png` or `strategy-compile.png` files. Preserve the old files. If the new images are uploaded as files, save them under distinct names such as `indicator-compile-2026-11-01.png` and `strategy-compile-2026-11-01.png`.

| Gate | Evidence result |
| --- | --- |
| Indicator visible-instance compilation | Compile messages visible; result applies to the displayed TradingView instance. |
| Indicator exact-hash native compilation | **NOT VERIFIED** — copy-back-to-draft continuity is missing. |
| Strategy visible-instance compilation | Shared compile messages visible, but no distinct Strategy compile event. |
| Strategy exact-hash native compilation | **NOT VERIFIED** — neither a distinct compile event nor copy-back-to-draft continuity is shown. |

No Pine source, trading rule, saved script, chart study, or alert was changed for this review. Keep project version 0.8.0.
