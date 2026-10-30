// Closed-position aggregation: partial exits are combined by actual entry time and module ID.
var int countedRows = 0
var float previousClosedNet = 0
var int groupedLastExit = na
var int groupedEntryTime = na
var string groupedId = ''
var array<int> moduleTrades = array.new<int>(8, 0)
var array<int> moduleWins = array.new<int>(8, 0)
var array<float> moduleGrossWin = array.new<float>(8, 0)
var array<float> moduleGrossLoss = array.new<float>(8, 0)
var array<float> moduleNet = array.new<float>(8, 0)
var array<float> moduleHold = array.new<float>(8, 0)
moduleIndex(string id) =>
    str.startswith(id, 'A_') ? 0 : str.startswith(id, 'B_') ? 1 : str.startswith(id, 'C_') ? 2 : str.startswith(id, 'D_') ? 3 : str.startswith(id, 'E_') ? 4 : str.startswith(id, 'F_') ? 5 : str.startswith(id, 'G_') ? 6 : 7
if strategy.closedtrades > countedRows
    for row = countedRows to strategy.closedtrades - 1
        string id = strategy.closedtrades.entry_id(row)
        int entered = strategy.closedtrades.entry_time(row)
        if na(groupedEntryTime)
            groupedEntryTime := entered
            groupedId := id
        int exited = strategy.closedtrades.exit_time(row)
        groupedLastExit := na(groupedLastExit) ? exited : math.max(groupedLastExit, exited)
    countedRows := strategy.closedtrades
// Flat after all exit rows means the position group is complete; pyramiding is disabled.
if strategy.position_size == 0 and not na(groupedEntryTime)
    int index = moduleIndex(groupedId)
    // Net-profit delta at complete closure includes emulator transaction costs.
    float net = strategy.netprofit - previousClosedNet
    previousClosedNet := strategy.netprofit
    array.set(moduleTrades, index, array.get(moduleTrades, index) + 1)
    array.set(moduleWins, index, array.get(moduleWins, index) + (net > 0 ? 1 : 0))
    array.set(moduleNet, index, array.get(moduleNet, index) + net)
    array.set(moduleGrossWin, index, array.get(moduleGrossWin, index) + math.max(net, 0))
    array.set(moduleGrossLoss, index, array.get(moduleGrossLoss, index) + math.abs(math.min(net, 0)))
    array.set(moduleHold, index, array.get(moduleHold, index) + (groupedLastExit - groupedEntryTime) / 60000.0)
    groupedLastExit := na
    groupedEntryTime := na
    groupedId := ''
var table performance = table.new(position.bottom_right, 6, 10, bgcolor=color.new(color.black, 15))
if barstate.islast or barstate.islastconfirmedhistory
    array<string> headers = array.from('Module', 'Positions', 'Win %', 'PF', 'Avg P&L', 'Avg min')
    for col = 0 to 5
        table.cell(performance, col, 0, array.get(headers, col), text_color=color.silver, text_size=size.tiny)
    for index = 0 to 7
        int count = array.get(moduleTrades, index)
        float losses = array.get(moduleGrossLoss, index)
        table.cell(performance, 0, index + 1, str.substring('ABCDEFGH', index, index + 1), text_color=color.white, text_size=size.tiny)
        table.cell(performance, 1, index + 1, str.tostring(count), text_color=color.white, text_size=size.tiny)
        table.cell(performance, 2, index + 1, count > 0 ? str.tostring(100.0 * array.get(moduleWins, index) / count, '#.##') : '—', text_color=color.white, text_size=size.tiny)
        table.cell(performance, 3, index + 1, losses > 0 ? str.tostring(array.get(moduleGrossWin, index) / losses, '#.##') : '—', text_color=color.white, text_size=size.tiny)
        table.cell(performance, 4, index + 1, count > 0 ? str.tostring(array.get(moduleNet, index) / count, '#.##') : '—', text_color=color.white, text_size=size.tiny)
        table.cell(performance, 5, index + 1, count > 0 ? str.tostring(array.get(moduleHold, index) / count, '#.##') : '—', text_color=color.white, text_size=size.tiny)
    table.cell(performance, 0, 9, 'Max DD', text_color=color.silver, text_size=size.tiny)
    table.cell(performance, 1, 9, str.tostring(strategy.max_drawdown, '#.##'), text_color=color.white, text_size=size.tiny)
    table.cell(performance, 2, 9, 'Net P&L', text_color=color.silver, text_size=size.tiny)
    table.cell(performance, 3, 9, str.tostring(strategy.netprofit, '#.##'), text_color=color.white, text_size=size.tiny)

    table.cell(performance, 4, 9, 'Plans / size skips', text_color=color.silver, text_size=size.tiny)
    table.cell(performance, 5, 9, str.tostring(totalPlans) + ' / ' + str.tostring(rejectedSizes), text_color=color.white, text_size=size.tiny)
