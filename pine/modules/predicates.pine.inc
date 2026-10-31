// Pure predicates shared by the engine and the standalone synthetic Pine test harness.
breakConfirmed(int direction, float trigger, float o, float c) =>
    direction == 1 ? c > trigger and c > o : c < trigger and c < o
retestConfirmed(int direction, float lower, float upper, float h, float l, float o, float c) =>
    h >= lower and l <= upper and (direction == 1 ? c > upper and c > o : c < lower and c < o)
rangeSweep(int direction, float lower, float upper, float h, float l, float c) =>
    direction == 1 ? l < lower and c > lower and c < upper : h > upper and c < upper and c > lower
pivotSweep(int direction, float level, float h, float l, float c) =>
    direction == 1 ? l < level and c > level : h > level and c < level
swingSweep(int direction, float sweptLevel, float oppositeLevel, float h, float l, float c, bool pivotUnused) =>
    pivotUnused and not na(sweptLevel) and not na(oppositeLevel) and (direction == 1 ? l < sweptLevel and c > sweptLevel and c < oppositeLevel : direction == -1 and h > sweptLevel and c < sweptLevel and c > oppositeLevel)
referenceUnused(int currentReferenceTime, int usedReferenceTime) =>
    not na(currentReferenceTime) and (na(usedReferenceTime) or currentReferenceTime != usedReferenceTime)
pivotAgeAvailable(int currentBar, int pivotBar, int minimumAge, int usedPivotBar) =>
    not na(pivotBar) and currentBar - pivotBar >= minimumAge and (na(usedPivotBar) or usedPivotBar != pivotBar)
zoneTestsWithinLimit(int priorTests, bool touched, int maximumTests) =>
    priorTests + (touched ? 1 : 0) <= maximumTests
trendStillValid(int direction, bool bullishTrend, bool bearishTrend) =>
    direction == 1 ? bullishTrend : direction == -1 and bearishTrend
amdCooldownElapsed(int currentBar, int lastSetupBar, int rangeLength) =>
    na(lastSetupBar) or currentBar - lastSetupBar > rangeLength
fairValueGap(int direction, float currentHigh, float currentLow, float highTwoBarsAgo, float lowTwoBarsAgo) =>
    direction == 1 ? currentLow > highTwoBarsAgo : direction == -1 and currentHigh < lowTwoBarsAgo
zoneDeparture(int direction, float swingLevel, float previousClose, float previousOpen, float o, float c, bool displaced) =>
    displaced and (direction == 1 ? c > o and previousClose < previousOpen and c > swingLevel and previousClose <= swingLevel : c < o and previousClose > previousOpen and c < swingLevel and previousClose >= swingLevel)
trendPullback(int direction, bool trend, float fast, float slow, float h, float l, float c, float atrValue, float depth) =>
    trend and (direction == 1 ? l <= fast and l >= slow - atrValue * depth and c > slow : h >= fast and h <= slow + atrValue * depth and c < slow)
compressedRange(float upper, float lower, float atrValue, float width) =>
    upper > lower and upper - lower <= atrValue * width
snrBreakout(int direction, float level, float tolerance, int confirmedTouches, float previousClose, float o, float c, bool displaced) =>
    confirmedTouches >= 2 and displaced and (direction == 1 ? c > level + tolerance and previousClose <= level and c > o : direction == -1 and c < level - tolerance and previousClose >= level and c < o)
snrRejection(int direction, float level, float tolerance, int confirmedTouches, float h, float l, float o, float c) =>
    confirmedTouches >= 2 and (direction == 1 ? l <= level + tolerance and c > level + tolerance and c > o : direction == -1 and h >= level - tolerance and c < level - tolerance and c < o)
qmPattern(int direction, int firstType, float p0, float p1, float p2, float p3, float p4, float c) =>
    direction == 1 ? firstType == -1 and p2 < p0 and p3 > p1 and p4 > p2 and c > p0 : firstType == 1 and p2 > p0 and p3 < p1 and p4 < p2 and c < p0
orderedPrices(int direction, float planned, float stopPrice, float targetOne, float targetTwo, float targetThree) =>
    direction == 1 ? stopPrice < planned and planned < targetOne and targetOne < targetTwo and targetTwo < targetThree : stopPrice > planned and planned > targetOne and targetOne > targetTwo and targetTwo > targetThree
qualityScore(int structure, int liquidity, bool aligned, bool rr, bool volatility, bool session) =>
    structure + liquidity + 20 + (aligned ? 15 : 0) + (rr ? 10 : 0) + (volatility ? 10 : 0) + (session ? 5 : 0)
tightenStop(int direction, float current, float proposed) =>
    direction == 1 ? math.max(current, proposed) : math.min(current, proposed)

rrFeasible(int direction, float planned, float stopPrice, float targetPrice, float minimum, float tick) =>
    float riskTicks = tick > 0 ? math.round(direction * (planned - stopPrice) / tick) : na
    float rewardTicks = tick > 0 ? math.round(direction * (targetPrice - planned) / tick) : na
    riskTicks > 0 and rewardTicks >= math.ceil(riskTicks * minimum - 0.000000001)

// Time inputs are absolute timestamps. Require the whole signal bar inside the window.
researchBarAllowed(bool enabled, int startTime, int endTime, int barOpen, int barClose) =>
    not enabled or (endTime > startTime and barOpen >= startTime and barClose < endTime)
directionAllowed(string selection, int direction) =>
    (direction == 1 or direction == -1) and (selection == 'Both' or (selection == 'BUY only' and direction == 1) or (selection == 'SELL only' and direction == -1))
planSlotAvailable(bool isActive, bool isPending, bool brokerOccupied, bool cancelling) =>
    not isActive and not isPending and not brokerOccupied and not cancelling

// Consume a confirmed swing only once. Wick touches and repeated recrosses are not new BOS.
freshStructureBreak(int direction, float level, int pivotId, int consumedId, float previousClose, float currentClose) =>
    bool known = not na(level) and not na(pivotId) and (na(consumedId) or pivotId != consumedId)
    known and (direction == 1 ? previousClose <= level and currentClose > level : direction == -1 ? previousClose >= level and currentClose < level : false)
uniqueStructureDirection(bool upward, bool downward) =>
    upward == downward ? 0 : upward ? 1 : -1
structureBreakTime(array<int> pivotIds, array<int> breakBars, int targetId) =>
    int found = na
    if array.size(pivotIds) == array.size(breakBars) and array.size(pivotIds) > 0 and not na(targetId)
        for i = 0 to array.size(pivotIds) - 1
            if array.get(pivotIds, i) == targetId
                found := array.get(breakBars, i)
    found
qmQualified(bool geometry, int necklineBreakBar, int headConfirmedBar, int shoulderConfirmedBar) =>
    geometry and not na(necklineBreakBar) and necklineBreakBar > headConfirmedBar and necklineBreakBar <= shoulderConfirmedBar

// Same mandatory filter conjunction as earlier versions, with an explicit first-failure reason.
candidateRejection(bool windowOK, bool sideOK, bool invalidationOK, bool targetsOK, bool fibOK, bool discountOK, bool volatilityOK, bool paused, bool sessionOK, bool trendOK, bool emaOK, bool stopOK, bool distanceOK, bool rrOK, bool pricesOK, bool quotaOK, bool cooldownOK, int score, int requiredScore) =>
    not windowOK ? 'Outside research date window' : not sideOK ? 'Direction disabled' : not invalidationOK ? 'Missing structural invalidation' : not targetsOK ? 'Insufficient structure targets' : not fibOK ? 'Fibonacci location filter' : not discountOK ? 'Premium/discount filter' : not volatilityOK ? 'ATR volatility filter' : paused ? 'Manual news pause' : not sessionOK ? 'Outside selected session' : not trendOK ? 'Setup opposes H1 trend' : not emaOK ? 'EMA alignment filter' : not stopOK ? 'Stop distance invalid' : not distanceOK ? 'Entry too far from setup' : not rrOK ? 'Minimum reward/risk not met' : not pricesOK ? 'Invalid Entry/SL/TP order' : not quotaOK ? 'Session plan limit' : not cooldownOK ? 'Signal cooldown' : score < requiredScore ? 'Quality below threshold' : ''
readinessState(int direction, bool pendingOrder, bool activeTrade, bool triggered) =>
    direction != 1 and direction != -1 ? 'WAIT' : pendingOrder ? (direction == 1 ? 'BUY READY' : 'SELL READY') : activeTrade ? (direction == 1 ? (triggered ? 'BUY CONFIRMED' : 'BUY ACTIVE (sim.)') : (triggered ? 'SELL CONFIRMED' : 'SELL ACTIVE (sim.)')) : 'WAIT'
