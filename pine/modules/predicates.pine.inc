// Pure predicates shared by the engine and the standalone synthetic Pine test harness.
breakConfirmed(int direction, float trigger, float o, float c) =>
    direction == 1 ? c > trigger and c > o : c < trigger and c < o
retestConfirmed(int direction, float lower, float upper, float h, float l, float o, float c) =>
    h >= lower and l <= upper and (direction == 1 ? c > upper and c > o : c < lower and c < o)
rangeSweep(int direction, float lower, float upper, float h, float l, float c) =>
    direction == 1 ? l < lower and c > lower and c < upper : h > upper and c < upper and c > lower
pivotSweep(int direction, float level, float h, float l, float c) =>
    direction == 1 ? l < level and c > level : h > level and c < level
zoneDeparture(int direction, float swingLevel, float previousClose, float previousOpen, float o, float c, bool displaced) =>
    displaced and (direction == 1 ? c > o and previousClose < previousOpen and c > swingLevel and previousClose <= swingLevel : c < o and previousClose > previousOpen and c < swingLevel and previousClose >= swingLevel)
trendPullback(int direction, bool trend, float fast, float slow, float h, float l, float c, float atrValue, float depth) =>
    trend and (direction == 1 ? l <= fast and l >= slow - atrValue * depth and c > slow : h >= fast and h <= slow + atrValue * depth and c < slow)
compressedRange(float upper, float lower, float atrValue, float width) =>
    upper > lower and upper - lower <= atrValue * width
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
