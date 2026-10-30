// Context is always calculated; optional overlays never become mandatory strategy votes.
[pdh, pdl] = request.security(syminfo.tickerid, 'D', [high[1], low[1]], lookahead=barmerge.lookahead_on)
[pwh, pwl] = request.security(syminfo.tickerid, 'W', [high[1], low[1]], lookahead=barmerge.lookahead_on)
var float sessionHigh = na
var float sessionLow = na
var float previousSessionHigh = na
var float previousSessionLow = na
var float bullOBLow = na
var float bullOBHigh = na
var float bearOBLow = na
var float bearOBHigh = na
var float bullBreaker = na
var float bearBreaker = na
var float equalHigh = na
var float equalLow = na
var bool bullSpring = false
var bool bearUpthrust = false
var float managedStop = na
var float filledEntry = na
var int fillBar = na
var float initialQty = na
var string targetSource = 'Fixed R projection'
var string signalTrend = 'Unknown'
var int signalSetupTime = na
var float signalInvalidation = na
var float signalPrice = na

getTargets(int direction, float planned, float risk) =>
    array<float> known = array.from(sh, slw, srHigh, srLow, pdh, pdl, pwh, pwl, previousSessionHigh, previousSessionLow, equalHigh, equalLow)
    if direction == -1 and candDemand.stage > 0
        array.push(known, candDemand.upper)
    if direction == 1 and candSupply.stage > 0
        array.push(known, candSupply.lower)
    array<float> opposing = array.new<float>()
    for level in known
        float rounded = math.round_to_mintick(level)
        if not na(rounded) and direction * (rounded - planned) >= syminfo.mintick * 2 and not array.includes(opposing, rounded)
            array.push(opposing, rounded)
    array.sort(opposing, direction == 1 ? order.ascending : order.descending)
    bool enough = array.size(opposing) >= 3
    bool structural = targetMode != 'Fixed R' and enough
    float targetOne = structural ? array.get(opposing, 0) : math.round_to_mintick(planned + direction * risk * r1)
    float targetTwo = structural ? array.get(opposing, 1) : math.round_to_mintick(planned + direction * risk * r2)
    float targetThree = structural ? array.get(opposing, 2) : math.round_to_mintick(planned + direction * risk * r3)
    string source = structural ? 'Confirmed structure' : targetMode == 'Hybrid' ? 'Hybrid: fixed-R fallback' : 'Fixed R projection'
    bool available = targetMode != 'Structure' or enough
    [targetOne, targetTwo, targetThree, source, available]

optionalLiquidity(int direction) =>
    bool equalSweep = direction == 1 ? not na(equalLow) and low < equalLow and close > equalLow : not na(equalHigh) and high > equalHigh and close < equalHigh
    bool daySweep = direction == 1 ? low < pdl and close > pdl : high > pdh and close < pdh
    bool weekSweep = direction == 1 ? low < pwl and close > pwl : high > pwh and close < pwh
    bool spring = direction == 1 ? bullSpring : bearUpthrust
    // One liquidity category: never stack points for different names of the same sweep.
    equalSweep or daySweep or weekSweep or spring
