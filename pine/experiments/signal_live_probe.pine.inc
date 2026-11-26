// LIVE_SIGNAL_PROBE_BEGIN — observe the completed Indicator engine and its live updates.
liveProbeEnabled = input.bool(false, 'Log candle-close snapshots', group='Live signal research')
liveProbeFrom = input.time(timestamp('23 Nov 2026 08:00 +0000'), 'Capture start (bar open, inclusive)', group='Live signal research')
liveProbeUntil = input.time(timestamp('23 Nov 2026 17:00 +0000'), 'Capture end (bar open, exclusive)', group='Live signal research')
liveProbeRun = input.string('live-1', 'Snapshot run ID (change before recalculating)', group='Live signal research')

var int liveProbeBoot = timenow
var string liveProbeCapture = liveProbeRun + ':' + str.tostring(liveProbeBoot)
varip int liveProbeBar = na
varip int liveProbeUpdates = 0
varip int liveProbeFirstPlanUpdate = na
varip bool liveProbeOpeningSeen = false
bool liveProbeInside = liveProbeEnabled and time >= liveProbeFrom and time < liveProbeUntil
if liveProbeInside
    if na(liveProbeBar) or liveProbeBar != time
        liveProbeBar := time
        liveProbeUpdates := 0
        liveProbeFirstPlanUpdate := na
        liveProbeOpeningSeen := barstate.isrealtime and barstate.isnew and not barstate.isconfirmed
    liveProbeUpdates += 1
    if newSignal and signalTime == time_close and na(liveProbeFirstPlanUpdate)
        liveProbeFirstPlanUpdate := liveProbeUpdates

liveProbeExecution() =>
    '{"schema":"snapshot-execution/v2","parentSourceSha256":"DIAGNOSTIC_SOURCE_SHA","captureId":' + diagQ(liveProbeCapture) + ',"symbol":' + diagQ(syminfo.tickerid) + ',"timeframe":' + diagQ(timeframe.period) + ',"time":' + diagInt(time) + ',"timeClose":' + diagInt(time_close) + ',"windowStart":' + diagInt(liveProbeFrom) + ',"windowEnd":' + diagInt(liveProbeUntil) + ',"bootAt":' + diagInt(liveProbeBoot) + ',"observedAt":' + diagInt(timenow) + ',"realtime":' + diagBool(barstate.isrealtime) + ',"history":' + diagBool(barstate.ishistory) + ',"confirmed":' + diagBool(barstate.isconfirmed) + ',"openingUpdateObserved":' + diagBool(liveProbeOpeningSeen) + ',"updates":' + diagInt(liveProbeUpdates) + ',"firstPlanUpdate":' + diagInt(liveProbeFirstPlanUpdate) + '}'
// LIVE_SIGNAL_PROBE_END
