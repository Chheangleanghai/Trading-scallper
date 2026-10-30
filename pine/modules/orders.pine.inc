// Submit a plan once. No stop widening or exit level recalculation after confirmation.
if newSignal and strategy.position_size == 0
    float accountRisk = strategy.convert_to_account(math.abs(entry - stop) * syminfo.pointvalue)
    float unitNotional = strategy.convert_to_account(entry * syminfo.pointvalue)
    float riskQty = accountRisk > 0 ? strategy.equity * riskPct / 100 / accountRisk : na
    float exposureQty = unitNotional > 0 ? strategy.equity * maxExposurePct / 100 / unitNotional : na
    float rawQty = math.min(riskQty, exposureQty)
    float qty = syminfo.mincontract > 0 ? math.floor(rawQty / syminfo.mincontract) * syminfo.mincontract : na
    if not na(qty) and qty > 0
        initialQty := qty
        strategy.entry(selectedStrategy, dir == 1 ? strategy.long : strategy.short, qty=qty, limit=entryMode == 'Limit' ? entry : na, stop=entryMode == 'Breakout' ? entry : na)
    else
        pending := false
        active := false
        status := 'REJECTED: INVALID UNIT SIZE'
        rejectedSizes += 1
if (newSignal and pending) or strategy.position_size != 0
    float q1 = partial ? math.floor(initialQty * 0.33 / syminfo.mincontract) * syminfo.mincontract : 0
    float q2 = partial ? math.floor(initialQty * 0.33 / syminfo.mincontract) * syminfo.mincontract : 0
    float q3 = initialQty - q1 - q2
    if not hit1 and q1 > 0
        strategy.exit('TP1', selectedStrategy, stop=managedStop, limit=tp1, qty=q1, comment_profit='TP1_HIT', comment_loss='STOP_LOSS_HIT')
    if not hit2 and q2 > 0
        strategy.exit('TP2', selectedStrategy, stop=managedStop, limit=tp2, qty=q2, comment_profit='TP2_HIT', comment_loss='STOP_LOSS_HIT')
    if q3 > 0
        strategy.exit('TP3', selectedStrategy, stop=managedStop, limit=tp3, qty=q3, comment_profit='TP3_HIT', comment_loss='STOP_LOSS_HIT')
if cancelOrder
    strategy.cancel(selectedStrategy)
    strategy.cancel('TP1')
    strategy.cancel('TP2')
    strategy.cancel('TP3')
if strategy.position_size != 0 and timeExit > 0 and time_close - strategy.opentrades.entry_time(0) >= timeExit * 60000
    strategy.close(selectedStrategy, comment='TRADE_CLOSED', immediately=false)
