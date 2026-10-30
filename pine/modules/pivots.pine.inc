// Repeated horizontal levels use only pivots confirmed now; usable by modules from the next bar.
if not na(ph)
    if not na(srHigh) and math.abs(ph - srHigh) <= atr * levelTolerance
        srHighTouches += 1
    else
        srHigh := ph
        srHighTouches := 1
if not na(pl)
    if not na(srLow) and math.abs(pl - srLow) <= atr * levelTolerance
        srLowTouches += 1
    else
        srLow := pl
        srLowTouches := 1
// Ambiguous bars confirming both pivot types are excluded from QM sequencing.
if (not na(ph)) != (not na(pl))
    int pDir = not na(ph) ? 1 : -1
    float pPrice = not na(ph) ? ph : pl
    int count = array.size(pivotDirs)
    if count == 0
        array.push(pivotDirs, pDir)
        array.push(pivotPrices, pPrice)
        array.push(pivotTimes, bar_index)
    else if array.get(pivotDirs, count - 1) == pDir
        float previous = array.get(pivotPrices, count - 1)
        if pDir == 1 ? pPrice > previous : pPrice < previous
            array.set(pivotPrices, count - 1, pPrice)
            array.set(pivotTimes, count - 1, bar_index)
    else
        array.push(pivotDirs, pDir)
        array.push(pivotPrices, pPrice)
        array.push(pivotTimes, bar_index)
        if array.size(pivotDirs) > 5
            array.shift(pivotDirs)
            array.shift(pivotPrices)
            array.shift(pivotTimes)
