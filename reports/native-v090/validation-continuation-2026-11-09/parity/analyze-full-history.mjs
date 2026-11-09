// Evidence-only: decode genuine native exports and reuse the repository's strict comparator.
// No trading source mutation or mismatch normalization.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { decodePineCapture } from '../../../../scripts/analyze-signal-diagnostics.mjs';
import { parsePlanAudit, comparePlanAudits } from '../../../../scripts/compare-plan-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const out = dirname(fileURLToPath(import.meta.url));
const paths = {
  indicator: 'reports/native-v090/indicator-install-2026-11-09/indicator-native-logs.csv',
  strategy: 'reports/native-v090/tradingview-strategy-diagnostics-2026-11-08-repeat.csv',
  previousIndicator: 'reports/native-v090/tradingview-indicator-signal-diag-2026-11-08-repeat2.csv',
  supportingPriorReview: 'reports/native-v080/recalculation-review-2026-11-05/parity-timelines.json',
};
const read = p => readFileSync(resolve(root, p), 'utf8');
const hash = p => createHash('sha256').update(readFileSync(resolve(root, p))).digest('hex');
const utc = t => new Date(t).toISOString();
const decoded = Object.fromEntries(['indicator','strategy'].map(m => [m,decodePineCapture(read(paths[m]))]));
const plans = Object.fromEntries(Object.entries(decoded).map(([m,t]) => [m,parsePlanAudit(t.split(/\r?\n/).filter(l => l.includes('PLAN_AUDIT ')).join('\n'),paths[m])]));
const cmp = comparePlanAudits(plans.indicator, plans.strategy, 0);
const records = Object.fromEntries(Object.entries(decoded).map(([m,t]) => [m,t.split(/\r?\n/).flatMap((line,index) => {
  const start=line.indexOf('{'); if(start<0)return [];
  const p=JSON.parse(line.slice(start));
  const marker=line.slice(0,start).trim();
  return [{messageIndex:index+1,kind:marker||p.eventType||'JSON',payload:p}];
})]));
const byTime = Object.fromEntries(Object.entries(plans).map(([m,rows]) => [m,new Map(rows.map(r=>[r.timestamp,r]))]));
const common=plans.indicator.filter(p=>byTime.strategy.has(p.timestamp));
const mismatchTimes=[...new Set(cmp.mismatches.map(r=>Number(r.key.split('|').at(-1))))].sort((a,b)=>a-b);
const traceCoverage=Object.fromEntries(Object.entries(records).map(([m,rs])=>{
 const ev=rs.filter(r=>r.kind==='SIGNAL_DIAG').map(r=>r.payload);
 return [m,{diagnosticEvents:ev.length,windowStart:ev[0]?.windowStart,windowEnd:ev[0]?.windowEnd,firstDataTime:ev[0]?.firstDataTime}];
}));
const previous=JSON.parse(read(paths.supportingPriorReview));
const pick = p => Object.fromEntries(['strategy','module','timestamp','planTimestamp','setupTimestamp','eventTimestamp','entryTime','exitTime','closedAt','direction','status','closeReason','exitId','exitComment','entry','sl','tp1','tp2','tp3','actualEntry','actualExit','initialQty','netProfitDelta','executionAccepted','executionModel'].filter(k=>k in p).map(k=>[k,p[k]]));
const cases=mismatchTimes.map(t=>{
 const old=previous.cases.find(c=>c.timestamp===t);
 const rows=cmp.mismatches.filter(r=>Number(r.key.split('|').at(-1))===t);
 const day=utc(t).slice(0,10);
 const prior=Object.fromEntries(Object.entries(plans).map(([m,ps])=>[m,ps.filter(p=>p.timestamp<t&&utc(p.timestamp).slice(0,10)===day&&p.executionAccepted)]));
 const timeline=Object.fromEntries(Object.entries(records).map(([m,rs])=>[m,rs.filter(r=>{
  const p=r.payload;const at=p.eventTimestamp??p.exitTime??p.timestamp??p.planTimestamp;
  return Number.isFinite(at)&&at>=t-75*60000&&at<=t+20*60000&&['PLAN_AUDIT','TRADE_CLOSED','TRADE_EXIT_AUDIT','TRADE_GROUP_AUDIT'].includes(r.kind);
 }).map(r=>({messageIndex:r.messageIndex,kind:r.kind,...pick(r.payload)}))]));
 const quota=prior.indicator.length===5&&prior.strategy.length===4&&!byTime.indicator.has(t)&&byTime.strategy.has(t);
 const setupOrigin=Math.min(byTime.indicator.get(t)?.setupTimestamp??t,byTime.strategy.get(t)?.setupTimestamp??t);
 const precedingShared=common.filter(p=>p.timestamp<setupOrigin).at(-1);
 const precedingClosures=Object.fromEntries(Object.entries(records).map(([m,rs])=>[m,rs.filter(r=>r.kind==='TRADE_CLOSED'&&r.payload.timestamp===precedingShared?.timestamp).map(r=>pick(r.payload))]));
 const iClosed=precedingClosures.indicator.at(-1),sClosed=precedingClosures.strategy.at(-1);
 const closeLag=iClosed&&sClosed?sClosed.eventTimestamp-iClosed.eventTimestamp:null;
 return {timestamp:t,utc:utc(t),mismatches:rows,indicatorPlan:byTime.indicator.get(t)??null,strategyPlan:byTime.strategy.get(t)??null,
  acceptedPlansEarlierOnSameLondonSessionDate:Object.fromEntries(Object.entries(prior).map(([m,ps])=>[m,ps.length])),
  currentTimeline:timeline,currentDiagnosticEngineEvidence:[],
  currentLifecycleFacts:{precedingSharedPlanTimestamp:precedingShared?.timestamp??null,precedingClosures,strategyMinusIndicatorClosureObservationMilliseconds:closeLag},
  classification:quota?'CURRENT_PLAN_COUNTS_CONSISTENT_WITH_QUOTA_BLOCK':closeLag===300000?'CURRENT_LIFECYCLE_SUPPORTS_EXECUTION_STATE_DIVERGENCE':'CAUSE_NOT_PROVEN_BY_CURRENT_FULL_HISTORY_CAPTURE',
  candidateCausalStatus:'NOT_FULLY_PROVEN_WITHOUT_CURRENT_ENGINE_AND_CHECKS_AT_SETUP_ORIGIN',
  archivedSupportingAssessment:old?{source:paths.supportingPriorReview,assessment:old.assessment,explanation:old.explanation}:null};
});
const previousIndicatorPlans=parsePlanAudit(decodePineCapture(read(paths.previousIndicator)).split(/\r?\n/).filter(l=>l.includes('PLAN_AUDIT ')).join('\n'));
const summary={schema:'full-history-plan-parity-evidence/v1',status:cmp.parity?'MATCH':'STRICT_PLAN_PARITY_FAILED',
 scope:'All PLAN_AUDIT records in the two preserved exports; no date-window filtering and no mismatch normalization.',
 artifacts:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:hash(p)}])),
 counts:{indicatorPlans:plans.indicator.length,strategyPlans:plans.strategy.length,commonPlans:common.length,exactCommonPlans:common.filter(p=>!cmp.mismatches.some(r=>Number(r.key.split('|').at(-1))===p.timestamp)).length,differingCommonPlans:common.filter(p=>cmp.mismatches.some(r=>Number(r.key.split('|').at(-1))===p.timestamp)).length,indicatorOnlyPlans:plans.indicator.filter(p=>!byTime.strategy.has(p.timestamp)).length,strategyOnlyPlans:plans.strategy.filter(p=>!byTime.indicator.has(p.timestamp)).length,mismatchPlanKeys:mismatchTimes.length,fieldOrMissingPlanMismatches:cmp.mismatches.length},
 planRange:Object.fromEntries(Object.entries(plans).map(([m,ps])=>[m,{first:utc(ps[0].timestamp),last:utc(ps.at(-1).timestamp)}])),
 diagnosticCoverage:traceCoverage,comparison:cmp,cases,
 availableHistoryIndicatorRepeatability:{previousPath:paths.previousIndicator,...comparePlanAudits(plans.indicator,previousIndicatorPlans,0),interpretation:'Exact plan repeatability of available exports only; not a controlled replay/reload or non-repainting certification.'},
 limitations:['Native diagnostic ENGINE/CHECKS coverage is only Nov6 14:00–17:00 UTC; all strict full-history mismatch keys are outside that window. Missing ENGINE events outside the window are unavailable evidence, not zero failures.',
 'Prior source/trace variants support an execution-state mechanism but do not prove identity of inputs, candles and engine state for the current mismatches.',
 'Plan records are genuine observed export data; the full-history PLAN_AUDIT stream has no capture-boundary/sequence contract, so omitted earlier plans cannot be excluded from the plan stream alone.',
 'The fresh Indicator has exact source copy-back/full Inputs evidence; the preserved Strategy has prior source copy-back and partial UI-observed settings context, not a new complete settings/Properties capture.',
 'No rule change is justified from these mismatches without equivalent-state evidence. Full-history strict parity is not passed.']};
writeFileSync(resolve(out,'full-history-comparison.json'),JSON.stringify(summary,null,2)+'\n');
writeFileSync(resolve(out,'indicator-plans.json'),JSON.stringify(plans.indicator,null,2)+'\n');
writeFileSync(resolve(out,'strategy-plans.json'),JSON.stringify(plans.strategy,null,2)+'\n');
console.log(JSON.stringify({status:summary.status,counts:summary.counts,cases:cases.map(c=>({utc:c.utc,fields:c.mismatches.map(m=>m.field),classification:c.classification,archivedAssessment:c.archivedSupportingAssessment?.assessment}))},null,2));
