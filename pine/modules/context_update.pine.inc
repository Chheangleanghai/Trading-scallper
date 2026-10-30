bullSpring := not na(slw) and low < slw and close > slw and close > open and close > low + (high - low) * 0.65
bearUpthrust := not na(sh) and high > sh and close < sh and close < open and close < high - (high - low) * 0.65
if newSession
    previousSessionHigh := sessionHigh
    previousSessionLow := sessionLow
    sessionHigh := high
    sessionLow := low
else if inSession
    sessionHigh := na(sessionHigh) ? high : math.max(sessionHigh, high)
    sessionLow := na(sessionLow) ? low : math.min(sessionLow, low)
// Broken OBs become breaker-level heuristics only after a confirmed close through the far boundary.
if not na(bullOBLow) and close < bullOBLow
    bearBreaker := bullOBLow
    bullOBLow := na
    bullOBHigh := na
if not na(bearOBHigh) and close > bearOBHigh
    bullBreaker := bearOBHigh
    bearOBHigh := na
    bearOBLow := na
if bodyDisplacement and close > open and close[1] < open[1] and close > high[1]
    bullOBLow := low[1]
    bullOBHigh := high[1]
if bodyDisplacement and close < open and close[1] > open[1] and close < low[1]
    bearOBLow := low[1]
    bearOBHigh := high[1]
if not na(ph) and not na(sh) and math.abs(ph - sh) <= atr * 0.1
    equalHigh := math.round_to_mintick((ph + sh) / 2)
if not na(pl) and not na(slw) and math.abs(pl - slw) <= atr * 0.1
    equalLow := math.round_to_mintick((pl + slw) / 2)
