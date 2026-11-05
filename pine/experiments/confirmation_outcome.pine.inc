// REVIEW_OUTCOME_HELPER_BEGIN — presentation and closure metadata only.
reviewCloseCode(bool stopped, bool finalTarget, bool timed) =>
    stopped ? 'STOP' : finalTarget ? 'TP3' : timed ? 'TIME_EXIT' : 'CLOSED_OTHER'
reviewExitCode(string comment, bool timeOrder) =>
    comment == 'STOP_LOSS_HIT' ? 'STOP' : comment == 'TP1_HIT' ? 'TP1' : comment == 'TP2_HIT' ? 'TP2' : comment == 'TP3_HIT' ? 'TP3' : timeOrder ? 'TIME_EXIT' : 'CLOSED_OTHER'
reviewCloseCaption(string code, bool broker) =>
    string caption = code == 'STOP' ? 'SL exit' : code == 'TIME_EXIT' ? 'Time exit' : code == 'TP1' ? 'TP1 exit' : code == 'TP2' ? 'TP2 exit' : code == 'TP3' ? 'TP3 exit' : 'Closed'
    caption + (broker ? ' (sim.)' : ' (est.)')
reviewModuleName(string id) =>
    str.startswith(id, 'A_') ? 'A Sweep/MSS/FVG' : str.startswith(id, 'B_') ? 'B CRT' : str.startswith(id, 'C_') ? 'C Pivot false break' : str.startswith(id, 'D_') ? 'D K-SNR' : str.startswith(id, 'E_') ? 'E Supply/demand' : str.startswith(id, 'F_') ? 'F Trend pullback' : str.startswith(id, 'G_') ? 'G AMD range' : str.startswith(id, 'H_') ? 'H Quasimodo' : 'No plan'
type ReviewOutcome
    int planTime = na
    int closeTime = na
    string code = ''
    float price = na
    float net = na
    string accountCurrency = ''
var ReviewOutcome reviewOutcome = ReviewOutcome.new()
reviewOutcomeJson(string kind, int planTime) =>
    bool known = kind == 'TRADE_CLOSED' and reviewOutcome.planTime == planTime and not na(reviewOutcome.closeTime)
    string values = known ? ',"closeReason":"' + reviewOutcome.code + '","closedAt":' + str.tostring(reviewOutcome.closeTime) : ''
    if known and useBroker and not na(reviewOutcome.price)
        values += ',"exitPrice":' + str.tostring(reviewOutcome.price, format.mintick)
    if known and useBroker and not na(reviewOutcome.net)
        values += ',"realizedNet":' + str.tostring(reviewOutcome.net, '#.########') + ',"realizedCurrency":"' + jsonEscape(reviewOutcome.accountCurrency) + '"'
    values
// REVIEW_OUTCOME_HELPER_END
