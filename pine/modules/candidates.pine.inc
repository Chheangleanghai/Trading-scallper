// Independent, persistent candidates. All mutation happens inside confirmed-bar scope.
type Candidate
    string id = ''
    bool enabled = false
    int stage = 0
    int direction = 0
    int setupBar = na
    int setupTime = na
    int confirmationTime = na
    int readyBar = na
    float trigger = na
    float upper = na
    float lower = na
    float invalidation = na
    int structurePoints = 0
    int liquidityPoints = 0
    int tests = 0
    string status = 'IDLE'
    bool ready = false
    string mode = ''
    string entryMode = ''
    string targetSource = ''
    float plannedEntry = na
    float suggestedStop = na
    float target1 = na
    float target2 = na
    float target3 = na
    int quality = 0

method begin(Candidate c, int direction, float lower, float upper, float invalidation, float trigger, int structurePoints, int liquidityPoints, string mode) =>
    c.stage := 1
    c.direction := direction
    c.setupBar := bar_index
    c.setupTime := time_close
    c.confirmationTime := na
    c.readyBar := na
    c.lower := lower
    c.upper := upper
    c.invalidation := invalidation
    c.trigger := trigger
    c.structurePoints := structurePoints
    c.liquidityPoints := liquidityPoints
    c.tests := 0
    c.ready := false
    c.status := 'WAITING_CONFIRMATION'
    c.mode := mode
    c.targetSource := ''
    c.plannedEntry := na
    c.suggestedStop := na
    c.target1 := na
    c.target2 := na
    c.target3 := na
    c.quality := 0

method maintain(Candidate c) =>
    c.ready := false
    if c.stage > 0
        bool invalid = c.direction == 1 ? low < c.invalidation : high > c.invalidation
        if invalid or bar_index - c.setupBar > expiry or not c.enabled
            c.stage := 0
            c.status := invalid ? 'INVALIDATED' : 'EXPIRED'

method confirmBreak(Candidate c) =>
    if c.stage > 0 and bar_index > c.setupBar
        bool confirmed = breakConfirmed(c.direction, c.trigger, open, close)
        if confirmed
            c.ready := true
            c.readyBar := bar_index
            c.confirmationTime := time_close
            c.status := 'WAITING_CONFIRMATION'

method confirmRetest(Candidate c) =>
    if c.stage > 0 and bar_index > c.setupBar
        if retestConfirmed(c.direction, c.lower, c.upper, high, low, open, close)
            c.ready := true
            c.readyBar := bar_index
            c.confirmationTime := time_close
            c.status := 'WAITING_CONFIRMATION'

var Candidate candA = Candidate.new(id='A_SWEEP_MSS_FVG', enabled=enableA)
var Candidate candB = Candidate.new(id='B_CRT', enabled=enableB)
var Candidate candC = Candidate.new(id='C_TURTLE_SOUP', enabled=enableC)
var Candidate candD = Candidate.new(id='D_SNR', enabled=enableD)
var Candidate candDemand = Candidate.new(id='E_DEMAND', enabled=enableE)
var Candidate candSupply = Candidate.new(id='E_SUPPLY', enabled=enableE)
var Candidate candF = Candidate.new(id='F_TREND_PULLBACK', enabled=enableF)
var Candidate candG = Candidate.new(id='G_AMD', enabled=enableG)
var Candidate candH = Candidate.new(id='H_QUASIMODO', enabled=enableH)
var array<Candidate> candidates = array.from(candA, candB, candC, candD, candDemand, candSupply, candF, candG, candH)
var float srHigh = na
var float srLow = na
var int srHighTouches = 0
var int srLowTouches = 0
var array<int> pivotDirs = array.new<int>()
var array<float> pivotPrices = array.new<float>()
var array<int> pivotTimes = array.new<int>()

// Requests are top-level: confirmed source candles only, never synthetic lower-TF entries.
[crtHigh, crtLow, crtTime] = request.security(syminfo.tickerid, crtTF, [high[1], low[1], time[1]], lookahead=barmerge.lookahead_on)
accHigh = ta.highest(high[1], accumulationBars)
accLow = ta.lowest(low[1], accumulationBars)
ema50 = ta.ema(close, 50)
bodyDisplacement = math.abs(close - open) >= atr * minDisp

type ModuleMemory
    int crtUsed = na
    int turtleUsedLow = na
    int turtleUsedHigh = na
    int demandUsed = na
    int supplyUsed = na
    int amdUsed = na
    int qmUsed = na
var ModuleMemory memory = ModuleMemory.new()
