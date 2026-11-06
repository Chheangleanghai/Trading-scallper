"""Analyze genuine Nov5 trace CSVs without changing sources or raw exports."""
from pathlib import Path
import csv, datetime, hashlib, json
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
MODELS=['indicator','strategy']
def utc(ms):return datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc).isoformat().replace('+00:00','Z')
def read(model):
 p=D/f'{model}-nov5-raw.csv'
 rows=list(csv.DictReader(p.open()))
 parsed=[]
 for line,row in enumerate(rows,2):
  message=row['Message'];start=message.find('{')
  if start<0:continue
  data=json.loads(message[start:]);kind=message[:start].strip() or data.get('eventType','JSON')
  parsed.append({'artifact':p.name,'csvLine':line,'barOpenPrefix':row['Date'],'kind':kind,'payload':data})
 return p,parsed
inputs={m:read(m) for m in MODELS}
phases=['BEFORE_UPDATE','AFTER_UPDATE','AFTER_ARBITRATION']
bars={};traceCounts={}
for model,(p,rows) in inputs.items():
 engines={};candidates={}
 for r in rows:
  x=r['payload'];phase=x.get('phase');t=x.get('barClose')
  if r['kind']=='ENGINE_TRACE':
   assert (t,phase) not in engines,'Duplicate engine phase';engines[t,phase]=r
  elif r['kind']=='CANDIDATE_TRACE' and x.get('id')=='F_TREND_PULLBACK':
   assert (t,phase) not in candidates,'Duplicate F phase';candidates[t,phase]=r
 times=sorted({t for t,phase in engines})
 assert len(times)==16,(model,len(times))
 assert all((t,phase) in engines and (t,phase) in candidates for t in times for phase in phases)
 assert all(1793876700000<=r['payload']['barOpen']<=1793881200000 for r in engines.values())
 bars[model]={str(t):{'barCloseUtc':utc(t),'phases':{phase:{'engine':engines[t,phase],'candidateF':candidates[t,phase]} for phase in phases}} for t in times}
 traceCounts[model]={'rawRecords':len(rows),'bars':len(times),'enginePhases':len(engines),'candidateFPhases':len(candidates),'parentSha256':sorted({r['payload']['parentSha256'] for r in engines.values()}),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
shared=sorted(set(bars['indicator'])&set(bars['strategy']),key=int)
marketDifferences=[]
marketFields=['open','high','low','close','chartStructure','ema9','ema21','ema50','atr','hTrend','inSession','volatilityAllowed']
for t in shared:
 a=bars['indicator'][t]['phases']['BEFORE_UPDATE']['engine']['payload']
 b=bars['strategy'][t]['phases']['BEFORE_UPDATE']['engine']['payload']
 for field in marketFields:
  if a[field]!=b[field]:marketDifferences.append({'barClose':int(t),'barCloseUtc':utc(int(t)),'field':field,'indicator':a[field],'strategy':b[field]})
summary=[]
for t in shared:
 record={'barClose':int(t),'barCloseUtc':utc(int(t))}
 for model in MODELS:
  phasesData=bars[model][t]['phases'];before=phasesData['BEFORE_UPDATE']['engine']['payload'];c=phasesData['AFTER_UPDATE']['candidateF']['payload'];after=phasesData['AFTER_ARBITRATION']['candidateF']['payload'];engineAfter=phasesData['AFTER_ARBITRATION']['engine']['payload']
  evaluated=before['planSlotAvailable'] and c['enabled'] and c['ready']
  if not before['planSlotAvailable']:
   decision='SLOT_OCCUPIED'
  elif c['stage']==0:
   decision='CANDIDATE_INACTIVE'
  elif not c['ready']:
   decision='TRIGGER_NOT_CONFIRMED'
  elif after['rejectionReason']:
   decision='CURRENT_RISK_OR_FILTER_REJECTION'
  else:
   decision='QUALIFIED_AND_ACCEPTED' if engineAfter['sessionTrades']>before['sessionTrades'] and engineAfter['selectedStrategy']=='F_TREND_PULLBACK' else 'QUALIFIED_CHECK_ARBITRATION'
  record[model]={'slotBefore':before['planSlotAvailable'],'activeBefore':before['active'],'brokerBusyBefore':before['brokerBusy'],'close':before['close'],'open':before['open'],'stageAfterUpdate':c['stage'],'setupTimestamp':c['setupTimestamp'],'setupUtc':utc(c['setupTimestamp']) if c['setupTimestamp'] is not None else None,'frozenTrigger':c['trigger'],'invalidation':c['invalidation'],'readyAfterUpdate':c['ready'],'storedReasonAfterArbitration':after['rejectionReason'],'riskChecksEvaluatedThisBar':evaluated,'currentRiskRejection':after['rejectionReason'] if evaluated else None,'currentDecision':decision,'stageAfterArbitration':after['stage'],'candidateStatusAfterArbitration':after['status'],'selectedStrategyAfterArbitration':engineAfter['selectedStrategy'],'activeAfterArbitration':engineAfter['active'],'sessionTradesAfterArbitration':engineAfter['sessionTrades']}
 summary.append(record)
plans={m:[r for r in rows if r['kind']=='PLAN_AUDIT' and r['payload']['timestamp']==1793880900000] for m,(p,rows) in inputs.items()}
priorLifecycle={m:[r for r in rows if r['kind'] not in ['ENGINE_TRACE','CANDIDATE_TRACE'] and r['payload'].get('timestamp')==1793876100000] for m,(p,rows) in inputs.items()}
sourceAttribution={}
for model in MODELS:
 source=ROOT/f'pine/experiments/{model}_nov5_trace.pine'
 copy=D/f'{model}-nov5-editor-copy.pine'
 normalized=copy.read_bytes().replace(b'\r\n',b'\n').replace(b'\r',b'\n')
 assert normalized==source.read_bytes(),f'{model} editor copyback mismatch'
 sourceAttribution[model]={'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'normalizedEditorCopyback':copy.name,'copybackMatches':True}
receipt={'schema':'nov5-f-current-parent-trace-analysis/v1','scope':'Nov5 bar opens 11:05 through 12:20 UTC inclusive; bar closes 11:10 through 12:25. A stored rejectionReason can remain stale even AFTER_ARBITRATION when ready=false: currentRiskRejection is populated only when that candidate actually reaches risk checks. CSV row numbers count the header as row 1.','traceCounts':traceCounts,'sourceAttribution':sourceAttribution,'marketFieldsCompared':marketFields,'marketDifferencesAtToleranceZero':marketDifferences,'targetPlans':plans,'priorPlanLifecycle':priorLifecycle,'summary':summary,'rawTraceTimeline':bars,'sourceFilesUnmodified':True}
(D/'nov5-f-trace-analysis.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Counts',traceCounts)
print('Market differences',len(marketDifferences))
for x in summary:
 print(x['barCloseUtc'],{m:x[m] for m in MODELS})
