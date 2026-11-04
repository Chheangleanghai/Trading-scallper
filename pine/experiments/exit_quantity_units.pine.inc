// Research-only allocation: conserve integer minimum-contract units before converting to quantities.
exitQuantityUnits(float quantity, float step, bool usePartials) =>
    int totalUnits = int(math.round(quantity / step))
    int firstUnits = usePartials ? int(math.floor(totalUnits * 33.0 / 100.0)) : 0
    int thirdUnits = totalUnits - firstUnits - firstUnits
    [firstUnits * step, firstUnits * step, thirdUnits * step]
