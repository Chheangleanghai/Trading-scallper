import { expect, it } from 'vitest';
import { assertSharedPriceScale, pinStudyToMainScale } from '../scripts/chart_layout.mjs';
const pane = () => ({
  mainSourceId: 'candles',
  sources: [{ id: 'candles', type: 'MainSeries' }, { id: 'new-scalper', type: 'StudyStrategy' }, { id: 'other', type: 'Study' }],
  leftAxisesState: [],
  rightAxisesState: [{ state: { id: 'price-A', isLog: false }, sources: ['candles', 'other'] }],
  overlayPriceScales: { 'new-scalper': { id: 'independent-scale' } },
});
it('detects the detached source mapping that displaced the actual chart overlays', () => {
  expect(() => assertSharedPriceScale(pane(), 'new-scalper')).toThrow('detached');
});
it('pins a replacement study to candles without changing the original or unrelated study state', () => {
  const original = pane();
  const repaired = pinStudyToMainScale(original, 'new-scalper');
  expect(assertSharedPriceScale(repaired, 'new-scalper')).toBe(true);
  expect(repaired.rightAxisesState[0].sources).toEqual(['candles', 'other', 'new-scalper']);
  expect(repaired.rightAxisesState[0].state).toEqual(original.rightAxisesState[0].state);
  expect(repaired.sources).toEqual(original.sources);
  expect(original.overlayPriceScales['new-scalper']).toBeDefined();
});
it('repeated pinning is idempotent and never duplicates the study on the price axis', () => {
  const once = pinStudyToMainScale(pane(), 'new-scalper');
  expect(pinStudyToMainScale(once, 'new-scalper')).toEqual(once);
});
it('rejects missing studies and ambiguous main axes instead of guessing', () => {
  expect(() => pinStudyToMainScale(pane(), 'missing')).toThrow('does not exist');
  const wrongMain = pane();
  wrongMain.sources[0].type = 'Study';
  expect(() => pinStudyToMainScale(wrongMain, 'new-scalper')).toThrow('one main-series');
  const ambiguous = pane();
  ambiguous.leftAxisesState.push({ sources: ['candles'] });
  expect(() => pinStudyToMainScale(ambiguous, 'new-scalper')).toThrow('one main-series');
});
it('removes a vacated independent axis while preserving other left-axis studies', () => {
  const input = pane();
  input.leftAxisesState = [{ state: { id: 'own-axis' }, sources: ['new-scalper'] }, { state: { id: 'other-left' }, sources: ['other'] }];
  input.rightAxisesState[0].sources = ['candles'];
  const fixed = pinStudyToMainScale(input, 'new-scalper');
  expect(fixed.leftAxisesState).toEqual([{ state: { id: 'other-left' }, sources: ['other'] }]);
  expect(assertSharedPriceScale(fixed, 'new-scalper')).toBe(true);
});

it("supports indicator sources as well as native strategy sources", () => {
  const input = pane();
  input.sources.find(s => s.id === "new-scalper").type = "Study";
  expect(assertSharedPriceScale(pinStudyToMainScale(input, "new-scalper"), "new-scalper")).toBe(true);
});
