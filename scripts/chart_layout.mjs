// Offline layout checks for maintainers who replace source IDs in an owned chart.
// Pine prices must share the main series scale; copying only a source is insufficient.
function mainAxis(pane) {
  const id = pane.mainSourceId;
  const axes = [...(pane.leftAxisesState ?? []), ...(pane.rightAxisesState ?? [])];
  const matches = axes.filter((axis) => axis.sources.includes(id));
  if (!id || !pane.sources.some((source) => source.id === id && source.type === 'MainSeries') || matches.length !== 1) throw new Error('Expected one main-series price axis');
  return { axis: matches[0], axes };
}
export function assertSharedPriceScale(pane, studyId) {
  if (!pane.sources.some((source) => source.id === studyId && ['Study', 'StudyStrategy'].includes(source.type)))
    throw new Error('Study does not exist in pane');
  const { axis, axes } = mainAxis(pane);
  if (pane.overlayPriceScales?.[studyId] ||
      axes.reduce((n, item) => n + item.sources.filter((id) => id === studyId).length, 0) !== 1 ||
      !axis.sources.includes(studyId))
    throw new Error('Study is detached from the main-series price scale');
  return true;
}
export function pinStudyToMainScale(pane, studyId) {
  const result = structuredClone(pane);
  if (!result.sources.some((source) => source.id === studyId && ['Study', 'StudyStrategy'].includes(source.type)))
    throw new Error('Study does not exist in pane');
  const { axis, axes } = mainAxis(result);
  for (const item of axes) item.sources = item.sources.filter((id) => id !== studyId);
  axis.sources.push(studyId);
  if (result.overlayPriceScales) delete result.overlayPriceScales[studyId];
  result.leftAxisesState = (result.leftAxisesState ?? []).filter((item) => item.sources.length);
  result.rightAxisesState = (result.rightAxisesState ?? []).filter((item) => item.sources.length);
  assertSharedPriceScale(result, studyId);
  return result;
}
