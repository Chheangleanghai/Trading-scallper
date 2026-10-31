// Broker emulator is authoritative in the strategy. Never infer its fills from OHLC touches.
int newlyClosed = strategy.closedtrades - nz(strategy.closedtrades[1])
bool openingFill = strategy.position_size != 0 and (not active or na(filledEntry))
bool roundTripFill = newlyClosed > 0 and pending and strategy.position_size == 0
if openingFill or roundTripFill
    filledEntry := openingFill ? strategy.position_avg_price : strategy.closedtrades.entry_price(strategy.closedtrades - 1)
    fillTime := openingFill ? strategy.opentrades.entry_time(0) : strategy.closedtrades.entry_time(strategy.closedtrades - 1)
    fillBar := openingFill ? strategy.opentrades.entry_bar_index(0) : strategy.closedtrades.entry_bar_index(strategy.closedtrades - 1)
    pending := false
    active := true
    entryTriggered := true
    status := 'ENTRY_TRIGGERED'
    notifyEntry(dir == 1 ? 'BUY_SIGNAL' : 'SELL_SIGNAL')
    notifyLifecycle('ENTRY_TRIGGERED')
if newlyClosed > 0
    bool stopReported = false
    for trade = strategy.closedtrades - newlyClosed to strategy.closedtrades - 1
        string reason = strategy.closedtrades.exit_comment(trade)
        if reason == 'TP1_HIT' and not hit1
            hit1 := true
            notifyLifecycle('TP1_HIT')
        if reason == 'TP2_HIT' and not hit2
            hit2 := true
            notifyLifecycle('TP2_HIT')
        if reason == 'TP3_HIT'
            notifyLifecycle('TP3_HIT')
        if reason == 'STOP_LOSS_HIT' and not stopReported
            stopReported := true
            notifyLifecycle('STOP_LOSS_HIT')
    if strategy.position_size == 0
        active := false
        pending := false
        status := 'CLOSED'
        notifyLifecycle('TRADE_CLOSED')
