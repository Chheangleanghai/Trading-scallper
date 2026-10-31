// INCLUDE_CANDIDATE_STATE
// Independent, persistent candidates. All mutation happens inside confirmed-bar scope.
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
