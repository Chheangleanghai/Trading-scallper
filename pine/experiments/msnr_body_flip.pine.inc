// MSNR research: track the latest confirmed A resistance and V support, using the first candle's close.
type MsnrBodyLevels
    float resistance = na
    float support = na
    int resistanceBar = na
    int supportBar = na

msnrBodyLevel(int direction, float previousOpen, float previousClose, float currentOpen, float currentClose, float tolerance) =>
    bool reversed = direction * (previousClose - previousOpen) > 0 and direction * (currentClose - currentOpen) < 0 and direction * (currentClose - previousClose) < 0
    reversed and math.abs(currentOpen - previousClose) <= tolerance ? previousClose : na

method observeMsnr(MsnrBodyLevels levels, int currentBar, int maximumAge, float previousOpen, float previousClose, float currentOpen, float currentClose, float tolerance) =>
    if not na(levels.resistance) and (currentClose > levels.resistance or currentBar - levels.resistanceBar >= maximumAge)
        levels.resistance := na
    if not na(levels.support) and (currentClose < levels.support or currentBar - levels.supportBar >= maximumAge)
        levels.support := na
    float resistance = msnrBodyLevel(1, previousOpen, previousClose, currentOpen, currentClose, tolerance)
    float support = msnrBodyLevel(-1, previousOpen, previousClose, currentOpen, currentClose, tolerance)
    if not na(resistance)
        levels.resistance := resistance
        levels.resistanceBar := currentBar
    if not na(support)
        levels.support := support
        levels.supportBar := currentBar
    0

msnrBreak(int direction, float level, float tolerance, float previousClose, float currentOpen, float currentClose, bool displaced) =>
    not na(level) and displaced and direction * (previousClose - level) <= 0 and breakConfirmed(direction, level + direction * tolerance, currentOpen, currentClose)

method updateMsnr(Candidate c, MsnrBodyLevels levels, int currentBar, int currentTime, float previousClose, float currentOpen, float currentHigh, float currentLow, float currentClose, float tolerance, bool displaced) =>
    if c.stage > 0 and currentBar > c.setupBar
        if c.tests > 0
            c.stage := 0
            c.status := 'EXPIRED'
            diagEmit('EXPIRED', c.id, diagCandidateId(c.id, c.direction, c.setupTime), ',"reason":"MSNR first retest already evaluated"')
        else if currentHigh >= c.lower and currentLow <= c.upper
            c.tests := 1
            c.confirmRetest(currentBar, currentTime, currentHigh, currentLow, currentOpen, currentClose)
            if not c.ready
                c.stage := 0
                c.status := 'INVALIDATED'
                diagEmit('INVALIDATED', c.id, diagCandidateId(c.id, c.direction, c.setupTime), ',"reason":"MSNR first retest did not confirm"')
    if c.stage == 0
        bool up = msnrBreak(1, levels.resistance, tolerance, previousClose, currentOpen, currentClose, displaced)
        bool down = msnrBreak(-1, levels.support, tolerance, previousClose, currentOpen, currentClose, displaced)
        if up != down
            float level = up ? levels.resistance : levels.support
            float invalidation = up ? math.min(currentLow, level - tolerance) : math.max(currentHigh, level + tolerance)
            c.begin(currentBar, currentTime, up ? 1 : -1, level - tolerance, level + tolerance, invalidation, level, 20, 0, 'Breakout retest')
    0

var MsnrBodyLevels msnrLevels = MsnrBodyLevels.new()
