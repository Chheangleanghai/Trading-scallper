// Shared candidate lifecycle. Inputs are explicit so fixtures can exercise this exact production code.
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
    string rejectionReason = 'Waiting for entry confirmation'

method begin(Candidate c, int currentBar, int currentTime, int direction, float lower, float upper, float invalidation, float trigger, int structurePoints, int liquidityPoints, string mode) =>
    c.stage := 1
    c.direction := direction
    c.setupBar := currentBar
    c.setupTime := currentTime
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
    c.rejectionReason := 'Waiting for entry confirmation'

method maintain(Candidate c, int currentBar, float currentLow, float currentHigh, int maxAge) =>
    c.ready := false
    if c.stage > 0
        bool invalid = c.direction == 1 ? currentLow < c.invalidation : currentHigh > c.invalidation
        if invalid or currentBar - c.setupBar > maxAge or not c.enabled
            c.stage := 0
            c.status := invalid ? 'INVALIDATED' : 'EXPIRED'

method confirmBreak(Candidate c, int currentBar, int currentTime, float currentOpen, float currentClose) =>
    if c.stage > 0 and currentBar > c.setupBar
        bool confirmed = breakConfirmed(c.direction, c.trigger, currentOpen, currentClose)
        if confirmed
            c.ready := true
            c.readyBar := currentBar
            c.confirmationTime := currentTime
            c.status := 'WAITING_CONFIRMATION'

method confirmRetest(Candidate c, int currentBar, int currentTime, float currentHigh, float currentLow, float currentOpen, float currentClose) =>
    if c.stage > 0 and currentBar > c.setupBar
        if retestConfirmed(c.direction, c.lower, c.upper, currentHigh, currentLow, currentOpen, currentClose)
            c.ready := true
            c.readyBar := currentBar
            c.confirmationTime := currentTime
            c.status := 'WAITING_CONFIRMATION'
