// CLARITY_HELPERS_BEGIN — read-only presentation; no signal eligibility changes.
clarityPlanEnding(bool openPlan, string ending) => openPlan ? '' : '\nCLOSED · ' + ending
clarityPlanHue(bool openPlan, int index) =>
    not openPlan ? color.rgb(135, 143, 155) : index == 0 ? color.rgb(110, 116, 125) : index == 1 ? color.rgb(239, 68, 68) : color.rgb(76, 175, 80)
clarityNext(Candidate c, int currentStage) =>
    str.startswith(c.id, 'A_') ? (currentStage == 1 ? 'MSS close + displacement + FVG' : 'FVG retest + directional close') : str.startswith(c.id, 'G_') ? 'Displaced close beyond frozen range' : str.startswith(c.id, 'E_') or str.startswith(c.id, 'H_') or (str.startswith(c.id, 'D_') and c.mode == 'Breakout retest') ? 'Zone retest + directional close' : 'Later directional trigger close'
// CLARITY_HELPERS_END
