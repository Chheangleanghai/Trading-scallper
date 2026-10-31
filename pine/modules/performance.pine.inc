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
var table performance = table.new(position.bottom_right, 6, 10, bgcolor=panelBackground, frame_color=color.rgb(71, 85, 105), frame_width=1)
if barstate.islast or barstate.islastconfirmedhistory
    table.clear(performance, 0, 0, 5, 9)
    if showPerformance and visualLayout == 'Dashboard'
        array<string> headers = array.from('Strategy', 'Closed trades', 'Win rate', 'Profit factor', 'Avg net P&L (' + strategy.account_currency + ')', 'Avg hold')
        for col = 0 to 5
            table.cell(performance, col, 0, array.get(headers, col), text_color=panelValue, text_size=panelText, bgcolor=panelHeader)
        int visibleRow = 1
        for index = 0 to 7
            int count = array.get(moduleTrades, index)
            float losses = array.get(moduleGrossLoss, index)
            if showUnusedModules or count > 0
                color rowBackground = visibleRow % 2 == 0 ? panelAlternate : panelBackground
                table.cell(performance, 0, visibleRow, strategyName(str.substring('ABCDEFGH', index, index + 1) + '_'), text_color=panelValue, text_size=panelText, text_halign=text.align_left, bgcolor=rowBackground)
                table.cell(performance, 1, visibleRow, str.tostring(count), text_color=panelValue, text_size=panelText, bgcolor=rowBackground)
                table.cell(performance, 2, visibleRow, count > 0 ? str.tostring(100.0 * array.get(moduleWins, index) / count, '#.##') + '%' : 'No trades', text_color=panelValue, text_size=panelText, bgcolor=rowBackground)
                table.cell(performance, 3, visibleRow, losses > 0 ? str.tostring(array.get(moduleGrossWin, index) / losses, '#.##') : '—', text_color=panelValue, text_size=panelText, bgcolor=rowBackground)
                table.cell(performance, 4, visibleRow, count > 0 ? str.tostring(array.get(moduleNet, index) / count, '#.##') : '—', text_color=panelValue, text_size=panelText, bgcolor=rowBackground)
                table.cell(performance, 5, visibleRow, count > 0 ? str.tostring(array.get(moduleHold, index) / count, '#.#') + ' min' : '—', text_color=panelValue, text_size=panelText, bgcolor=rowBackground)
                visibleRow += 1
        if visibleRow == 1
            table.cell(performance, 0, visibleRow, 'No closed trades yet', text_color=panelMuted, text_size=panelText, bgcolor=panelBackground)
            for col = 1 to 5
                table.cell(performance, col, visibleRow, col == 1 ? '0' : '—', text_color=panelMuted, text_size=panelText, bgcolor=panelBackground)
            visibleRow += 1
        table.cell(performance, 0, visibleRow, 'Max drawdown', text_color=panelMuted, text_size=panelText, bgcolor=panelAlternate)
        table.cell(performance, 1, visibleRow, str.tostring(strategy.max_drawdown, '#.##') + ' ' + strategy.account_currency, text_color=panelValue, text_size=panelText, bgcolor=panelAlternate)
        table.cell(performance, 2, visibleRow, 'Total net P&L', text_color=panelMuted, text_size=panelText, bgcolor=panelAlternate)
        table.cell(performance, 3, visibleRow, str.tostring(strategy.netprofit, '#.##') + ' ' + strategy.account_currency, text_color=panelValue, text_size=panelText, bgcolor=panelAlternate)
        table.cell(performance, 4, visibleRow, 'Plans / size skips', text_color=panelMuted, text_size=panelText, bgcolor=panelAlternate)
        table.cell(performance, 5, visibleRow, str.tostring(totalPlans) + ' / ' + str.tostring(rejectedSizes), text_color=panelValue, text_size=panelText, bgcolor=panelAlternate)
