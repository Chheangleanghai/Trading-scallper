# Native compile evidence context — v0.8.0

## Current compile gate decisions — updated 2026-11-01

The current local source hashes remain Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` and Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.

- **Indicator exact-hash native compile: PASSED — user-attested.** The preserved `indicator-editor-verified-new.pine` copy-back is 1,333 lines; CRLF/CR-to-LF normalization produces the exact current Indicator SHA-256. Its raw file SHA-256 is `762f5f3cd2c80e93bb0277511b87dd62400d82a4712015a97c435ac672644406`. The user reports that the unchanged editor buffer compiled on FOREXCOM:XAUUSD M5 at `5:22:07 PM Compiling…`, `5:22:09 PM Compiled.`, and `5:22:09 PM Added to chart.` The screenshot binary is not present in the workspace, so those visible UI details are user-reported rather than independently re-inspected here. The earlier `indicator-editor-after-170828.pine` is preserved as a non-matching intermediate copy-back (normalized SHA-256 `83c9f6c65262c2dea6331fcdaac755a7d1f4afefe0bbc3180de7ff4227c8589f`); it does not supersede the later verified copy.
- **Strategy exact-hash native compile: PASSED.** The saved `strategy-compile-133702.png`, matching 1,470-line copy-back, and user-confirmed unchanged draft continuity are recorded below.
- The compile gate status is now accepted for both current sources. Keep the screenshot binary for the Indicator as a follow-up evidence preservation item; do not repeat compile or copy-back while its draft remains unchanged.

The historical sections below preserve earlier assessments and are superseded where they conflict with these current gate decisions.

## Current-session access note (2026-11-01)

This Codex session has no TradingView browser/computer UI control tool. No TradingView UI action was attempted and the previously denied macOS Apple Events path was not retried. Use [`TRADINGVIEW_EVIDENCE_CHECKLIST.md`](TRADINGVIEW_EVIDENCE_CHECKLIST.md) to capture only the still-missing source-attributed evidence. Existing inline screenshots remain observations, not newly authenticated files.

**Reviewed:** 2026-11-01 (Asia/Phnom_Penh)  
**Chart shown:** FOREX.com XAUUSD, 5-minute  
**Source revision under review:** Indicator `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4`; Strategy `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`.

The source hashes above are the already verified local/copy-back identities. They are not visible in the screenshots and are not independently tied to the editor buffers shown here.

## Indicator screenshot evidence

- **Visible draft title:** truncated as `XAUUSD SMART …`.
- **Visible editor content:** source tail through line 1333, with cursor at line 1334. This is consistent with the Indicator draft but does not identify or hash the complete buffer.
- **Compile messages:** `11:06:44 AM Compiled.` and `11:06:44 AM Added to chart.` are visible. Earlier compile messages are also present in the pane.
- **Compile result:** successful compile is visible for a TradingView editor/chart instance.
- **Attribution:** exact association to `indicator-tradingview-copy.pine` and SHA-256 `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` is **not independently established**. The screenshot does not show the full draft identity/hash or prove that the displayed editor is the unchanged draft that produced the copy-back.
- **Historical workspace image:** `indicator-compile.png` remains unchanged (SHA-256 `2e75680020c4d5b0152477817a80203cba1c274ae8d67e1579a9cb9a5f0f22cc`); its old Pine Logs do not show a compile result.
- **Newly submitted image:** preserved separately as `indicator-submitted-110644.png` (SHA-256 `3b1494d3d2c092d02346f9ff268ffe31ba39fa04be2611aa89ccb5c3345ce32d`). It shows the XAUUSD chart/overlays but no Pine Editor or compiler result, so it does not satisfy the Indicator compile gate. The earlier inline `11:06:44 AM` compile screenshot's binary is still absent.

## Strategy screenshot supplied in chat

- **Visible draft title:** `Untitled script`.
- **Visible editor content:** Strategy source tail through approximately line 1470, with the editor status at line 1472. This is consistent with a Strategy source buffer but does not identify or hash the complete buffer.
- **Earlier compile messages:** the previously supplied Strategy image showed the same `11:06:44 AM` entries as the Indicator image; those did not establish a distinct Strategy event.
- **Chart context:** XAUUSD 5-minute chart with Strategy Tester visible.
- **Earlier result:** the `11:06:44 AM` event remained unattributed to a distinct Strategy compile.
- **Attribution:** no direct link from this screenshot to `strategy-tradingview-normalized.pine` and SHA-256 `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` is established.

## New Strategy compile event reported (2026-11-01)

- Saved as `strategy-compile-133702.png` (SHA-256 `c5222f4ee75c04579487f99b6b45bde248f1dd38ee139ea580865e1629ee75e9`). The older `strategy-compile.png` was restored unchanged (SHA-256 `9bcf5b7dad78b27dc0420d683493cb354efacf2e832af7eb6a4d16879fb2755b`). The new image was visually inspected.
- The image shows `FOREXCOM:XAUUSD` M5, Pine Editor title `Untitled script`, Strategy source tail around line 1470, Strategy Tester, and `1:37:02 PM Compiling…`, `Compiled.`, and `Updated on chart.` This is a distinct native compile event from the Indicator's earlier `11:06:44 AM` event. Screenshot does not establish its calendar date or timezone.
- **Visible Strategy compilation:** OBSERVED SUCCESS in the saved screenshot.
- Fresh `strategy-editor-after-133702.pine` copy-back was compared after CRLF/CR normalization: 1,470 lines, normalized SHA-256 `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`, byte-equal to current `pine/strategy.pine`.
- **Exact-source attribution:** PASSED. The fresh current-buffer copy-back normalizes exactly to the local Strategy SHA-256, and the user confirmed the editor source was unchanged from the 1:37:02 PM compile through copy-back. The filesystem modification time of the copy-back is 1:50:37 PM (+07); it is supporting metadata, while continuity is established by the user's explicit confirmation.

## Evidence storage and gate decision

The historical `indicator-compile.png` and `strategy-compile.png` files remain unchanged. The newly submitted Indicator image is preserved as `indicator-submitted-110644.png`; it does not show a compiler result. The new Strategy compile screenshot is preserved separately as `strategy-compile-133702.png` and has a recorded SHA-256 above.

### Saved-file inspection (2026-11-01)

Both generic screenshot paths requested for inspection exist and were opened:

- `indicator-compile.png` — SHA-256 `2e75680020c4d5b0152477817a80203cba1c274ae8d67e1579a9cb9a5f0f22cc`. It shows the Indicator Pine Editor and Pine Logs, but no visible `Compiled.` result in the saved image. It is historical evidence, not the inline 11:06:44 AM compile image.
- `strategy-compile.png` — SHA-256 `9bcf5b7dad78b27dc0420d683493cb354efacf2e832af7eb6a4d16879fb2755b`. It shows Strategy Pine Logs and Strategy Tester, but no distinct 1:37:02 PM compile result. It is historical evidence; the successful event is in the separate `strategy-compile-133702.png` file.

The fresh copy-back's raw-file SHA-256 is `076f44c961ba065384986e68fc6278597b8e109726f46175467cba41893226ae` (CRLF line endings). After CRLF/CR-to-LF normalization it has 1,470 lines and SHA-256 `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0`, byte-equal to `pine/strategy.pine`. The user explicitly confirmed in the supplied request that they did not edit, replace, or switch the Strategy editor draft between the 1:37:02 PM compile and full copy-back. This continuity remains **user-attested**; it is not inferable from the screenshot or file timestamps alone.

| Gate | Evidence result |
| --- | --- |
| Indicator visible-instance compilation | Earlier inline compile was reported; saved `indicator-compile.png` has no compiler pane/result. |
| Indicator exact-hash native compilation | **NOT VERIFIED** — copy-back-to-draft continuity is missing. |
| Strategy visible-instance compilation | **OBSERVED SUCCESS:** saved `strategy-compile-133702.png` visibly shows distinct `1:37:02 PM Compiled.` / `Updated on chart.` event. |
| Strategy editor copy-back equality | **PASSED:** new 1,470-line buffer normalizes exactly to current local Strategy SHA-256. |
| Strategy exact-hash native compilation | **PASSED:** saved compile screenshot, matching normalized current-buffer copy-back, and user-confirmed unchanged draft continuity. |

No Pine source, trading rule, saved script, chart study, or alert was changed for this review. Keep project version 0.8.0.
