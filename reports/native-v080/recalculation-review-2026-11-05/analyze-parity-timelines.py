"""Read-only evidence analysis. Does not regenerate or alter source captures."""
from pathlib import Path
import hashlib, json, re, datetime
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
CURRENT=ROOT/'reports/native-v080/confirmation-review-2026-11-05'
ARCHIVE=ROOT/'reports/native-v080/continuation-2026-11-05'
def utc(ms): return datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc).isoformat().replace('+00:00','Z')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def records(p):
 result=[]
 for ln,line in enumerate(p.read_text().splitlines(),1):
  start=line.find('{')
  if start<0:continue
  obj=json.loads(line[start:]);prefix=line[:start]
  marker=prefix[prefix.index(']: ')+3:].strip() if ']: ' in prefix else prefix.strip()
  kind=marker or obj.get('eventType','JSON')
  open_text=re.match(r'\[([^]]+)\]',prefix)
  result.append({'artifact':str(p.relative_to(ROOT)),'line':ln,'kind':kind,'historicalBarOpenPrefix':open_text[1] if open_text else None,'payload':obj})
 return result
current={k:records(CURRENT/f'{k}-native.log') for k in ['indicator','strategy']}
archived={k:records(ARCHIVE/f'{f}-trace-native.txt') for k,f in [('indicator','indicator'),('strategy','quantity')]}
cases=[
 (1792406100000,'INDICATOR_ONLY','EXECUTION_DEPENDENT_SETUP_SUPPORTED', 'F setup at10:20 versus10:25, then trigger4167.79 versus4164.96; archived traces directly show the slot difference.'),
 (1792407900000,'STRATEGY_ONLY','QUOTA_BLOCK_ESTABLISHED', 'Indicator has five accepted plans after its10:35 F; Strategy has four and can take11:05 B.'),
 (1792658100000,'STRATEGY_ONLY','EXECUTION_DEPENDENT_SETUP_SUPPORTED', 'Indicator creates B at08:25 and it invalidates; Strategy is busy until08:30, creates a different later B, then triggers08:35.'),
 (1792683600000,'COMMON_FIELDS_DIFFER','EXECUTION_DEPENDENT_SETUP_SUPPORTED', 'F setupTimestamp15:25 versus15:30 matches prior-position close observation difference.'),
 (1793695200000,'COMMON_FIELDS_DIFFER','EXECUTION_DEPENDENT_SETUP_SUPPORTED', 'F setupTimestamp08:20 versus08:25 matches prior-position close observation difference.'),
 (1793787600000,'COMMON_FIELDS_DIFFER','EXECUTION_DEPENDENT_MODULE_ARBITRATION_SUPPORTED', 'Indicator creates B/F at10:10 and selects B90 over F80; Strategy busy until10:15 misses that B and later selects F80.'),
 (1793880900000,'INDICATOR_ONLY','EXACT_CANDIDATE_CAUSE_UNVERIFIED', 'Indicator F originates11:10 while Strategy is busy until11:15; no Nov5 candidate trace proves which later F state failed.'),
 (1793888400000,'STRATEGY_ONLY','QUOTA_BLOCK_ESTABLISHED', 'Indicator already used five plans including12:15 F and13:45 B; Strategy used four and accepts its fifth at14:20.'),
]
keep_engine=['barOpen','barClose','phase','parentSha256','active','pending','brokerBusy','cancelling','planSlotAvailable','sessionTrades','quotaLimit','status','validationReason','crtUsed']
keep_cand=['barOpen','barClose','phase','parentSha256','id','enabled','stage','direction','setupTimestamp','confirmationTimestamp','ready','trigger','invalidation','quality','status','rejectionReason']
items=[]
for t,case,classification,explanation in cases:
 item={'timestamp':t,'utc':utc(t),'mismatchType':case,'assessment':classification,'explanation':explanation,'currentEvidence':{},'archivedTraceEvidence':{},'countsAndPlans':{}}
 for model,rows in current.items():
  planrows=[r for r in rows if r['kind']=='PLAN_AUDIT']
  day=utc(t)[:10];same_day=[r for r in planrows if utc(r['payload']['timestamp'])[:10]==day]
  before=[r for r in same_day if r['payload']['timestamp']<t]
  item['countsAndPlans'][model]={'acceptedPlansEarlierOnSameLondonSessionDate':len([r for r in before if r['payload'].get('executionAccepted')]),'earlierPlanTimes':[utc(r['payload']['timestamp']) for r in before],'targetPlan':[r for r in planrows if r['payload']['timestamp']==t]}
  evidence=[]
  for r in rows:
   x=r['payload'];pt=x.get('timestamp',x.get('planTimestamp')); event=x.get('eventTimestamp',x.get('exitTime',pt))
   if pt is None or event is None:continue
   if t-75*60000<=event<=t+20*60000 and r['kind'] in ['PLAN_AUDIT','TRADE_CLOSED','TRADE_GROUP_AUDIT','TRADE_EXIT_AUDIT']:
    evidence.append(r)
  item['currentEvidence'][model]=evidence
 # Cover prior-position closure, both possible setup bars and the decision itself.
 prior_by_case={1792406100000:[1792405200000,1792405500000],1792407900000:[1792405200000,1792405500000],1792658100000:[1792657500000,1792657800000],1792683600000:[1792682700000,1792683000000],1793695200000:[1793694000000,1793694300000],1793787600000:[1793787000000,1793787300000]}
 times=set(prior_by_case.get(t,[])+[t])
 for model,rows in archived.items():
  selected=[]
  for r in rows:
   x=r['payload']
   if x.get('barClose') not in times or x.get('phase') not in ['BEFORE_UPDATE','AFTER_UPDATE','AFTER_ARBITRATION']:continue
   if r['kind']=='ENGINE_TRACE':keys=keep_engine
   elif r['kind']=='CANDIDATE_TRACE' and x.get('id') in ['B_CRT','F_TREND_PULLBACK']:keys=keep_cand
   else:continue
   selected.append({**r,'payload':{k:x[k] for k in keys if k in x}})
  item['archivedTraceEvidence'][model]=selected
 items.append(item)
artifacts=[CURRENT/f'{m}-native.log' for m in ['indicator','strategy']]+[CURRENT/'indicator-reload.log',CURRENT/'paired-comparison.json',CURRENT/'runtime-input-comparison.json',ARCHIVE/'indicator-trace-native.txt',ARCHIVE/'quantity-trace-native.txt',ARCHIVE/'native-trace-review.json']
receipt={'schema':'planned-parity-causal-review/v1','status':'PARITY_STILL_NOT_PASSED','scope':'Three mismatched common keys and five unmatched plans from the current source-attributed M5 pair; archived trace captures are supporting experiments, not relabeled as current captures.','assumptionsAndLimits':['London sessions are wholly within their UTC dates here, so current PLAN_AUDIT counting by date does not cross a session reset. Actual inputs confirm London and maximum5.','Current logs identify plans and lifecycle/actual exits, but do not include every rejected candidate state.','Prior trace variants have their own parent hashes and longer history; repeated matching mismatches support the mechanism, not identity of every input candle.','The one historical Entry/TP change after reload is a separate unresolved problem; lifecycle timing cannot explain a change in the chart close itself.'],'artifacts':[{'path':str(p.relative_to(ROOT)),'sha256':sha(p)} for p in artifacts],'cases':items}
(OUT/'parity-timelines.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Wrote',len(items),'cases; all raw inputs preserved.')
