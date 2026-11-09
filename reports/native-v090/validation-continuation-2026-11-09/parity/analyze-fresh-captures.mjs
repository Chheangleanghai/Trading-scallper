// Analyze newly source-attributed native captures without modifying sources or raw evidence.
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePineCapture,analyzeSignalDiagnostics } from '../../../../scripts/analyze-signal-diagnostics.mjs';
import { parsePlanAudit,comparePlanAudits } from '../../../../scripts/compare-plan-audit.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../../..');
const base='reports/native-v090/validation-continuation-2026-11-09/native/';
const paths={indicator:'reports/native-v090/indicator-install-2026-11-09/indicator-native-logs.csv',strategy:base+'strategy-common-window.csv',priorStrategy:'reports/native-v090/tradingview-strategy-diagnostics-2026-11-08-repeat.csv',indicatorNov5:base+'indicator-nov5.csv',strategyNov5:base+'strategy-nov5.csv'};
const read=p=>readFileSync(resolve(root,p),'utf8'),hash=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const records=p=>decodePineCapture(read(p)).split(/\r?\n/).filter(Boolean);
const plans=p=>parsePlanAudit(records(p).filter(l=>l.includes('PLAN_AUDIT ')).join('\n'),p);
const events=p=>records(p).filter(l=>l.includes('SIGNAL_DIAG ')).map(l=>JSON.parse(l.split('SIGNAL_DIAG ')[1]));
const all=Object.fromEntries(Object.entries(paths).map(([m,p])=>[m,plans(p)]));
const compare=(a,b)=>{const c=comparePlanAudits(a,b,0),keys=new Set(c.mismatches.map(m=>m.key)); const bmap=new Map(b.map(p=>[p.timestamp,p]));const common=a.filter(p=>bmap.has(p.timestamp));return {counts:{left:a.length,right:b.length,common:common.length,exactCommon:common.filter(p=>!keys.has(`${p.symbol}|${p.timeframe}|${p.timestamp}`)).length},...c};};
const analyses=Object.fromEntries(['indicator','strategy','indicatorNov5','strategyNov5'].map(k=>[k,analyzeSignalDiagnostics(read(paths[k]),{chartCurrency:'USD',...(k.startsWith('strategy')?{timeExitMinutes:15,soleMarketCloseIsTimeExit:true}:{})})]));
const bounded=(rows,a)=>rows.filter(p=>p.timestamp>a.context.windowStart&&p.timestamp<=a.context.windowEnd);
const fresh={schema:'fresh-native-pair-comparison/v1',artifacts:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:hash(p)}])),
 fullAvailableHistory:compare(all.indicator,all.strategy),strategyRepeatability:compare(all.strategy,all.priorStrategy),
 commonWindow:compare(bounded(all.indicator,analyses.indicator),bounded(all.strategy,analyses.strategy)),
 nov5Window:compare(bounded(all.indicatorNov5,analyses.indicatorNov5),bounded(all.strategyNov5,analyses.strategyNov5)),
 captures:Object.fromEntries(Object.entries(analyses).map(([k,a])=>[k,{context:a.context,eventCount:a.eventCount,captureStatus:a.captureStatus,budgetStatus:a.budgetStatus,exportStatus:a.exportStatus,completenessProblems:a.completenessProblems}]))};

// Match UI controls by actual source input labels, not source order or model-specific display controls.
function argsOf(t){let depth=0,quote='',part='',parts=[];for(let i=0;i<t.length;i++){const c=t[i];if(quote){part+=c;if(c==='\\'){part+=t[++i]??'';}else if(c===quote)quote='';continue;}if(c==='\''||c==='"'){quote=c;part+=c;}else if('(['.includes(c)){depth++;part+=c;}else if(')]'.includes(c)){depth--;part+=c;}else if(c===','&&!depth){parts.push(part.trim());part='';}else part+=c;}parts.push(part.trim());return parts;}
function declarations(path){return read(path).split('\n').flatMap(l=>{const m=l.match(/^(\w+)\s*=\s*input\.(\w+)\((.*)\)\s*$/);if(!m)return [];const args=argsOf(m[3]),label=args[1].slice(1,-1),group=m[3].match(/group\s*=\s*['"]([^'"]+)['"]/)?.[1]??'';return [{variable:m[1],type:m[2],label,group}];});}
const decl={indicator:declarations('pine/experiments/indicator_signal_diagnostics.pine'),strategy:declarations('pine/experiments/strategy_signal_diagnostics.pine')};
function uiInputs(path,model){let text=read(path);text=text.slice(text.indexOf('tab group indicator-properties-dialog-tabs'));text=text.slice(0,text.indexOf('pop up button (collapsed) Defaults'));let active=null;const values={},unmapped=[];const labels=decl[model].map(d=>d.label).sort((a,b)=>b.length-a.length);for(const line of text.split('\n')){const s=line.replace(/^\s*\d+ /,'');if(s.startsWith('text ')){const value=s.slice(5);const label=labels.find(l=>value.endsWith(l));if(label)active=label;}let value,label;if(s.startsWith('checkbox ')){const m=s.match(/Description: (.*), Value: ([01])/);if(!m)continue;label=m[1];value=m[2]==='1';}else if(s.startsWith('text field ')||s.startsWith('combo box ')){label=active;value=s.includes('Value: ')?s.split('Value: ')[1].split(', ID:')[0]:s.replace(/^[^(]+\([^)]*\) /,'');}else continue;if(!labels.includes(label)){unmapped.push({label,value,s});continue;}(values[label]??=[]).push(value);}return {values,unmapped};}
const uiPaths={indicator:'reports/native-v090/indicator-install-2026-11-09/capture-inputs-ax.txt',strategy:base+'strategy-common-window-inputs-ax.txt',indicatorNov5:base+'indicator-nov5-inputs-ax.txt',strategyNov5:base+'strategy-nov5-inputs-ax.txt'};
const ui=Object.fromEntries(Object.entries(uiPaths).map(([k,p])=>[k,uiInputs(p,k.startsWith('indicator')?'indicator':'strategy')]));
const presentation=new Set(['Concept review','Session annotations','Clear signal display','Context visuals','Chart style','Historical view','Readability','Trade visuals']);
const trading=decl.indicator.filter(d=>!presentation.has(d.group)&&d.group!=='Research diagnostics'&&!d.variable.startsWith('show')&&decl.strategy.some(x=>x.variable===d.variable));
const compareUi=(a,b)=>trading.map(d=>({variable:d.variable,label:d.label,left:ui[a].values[d.label]??null,right:ui[b].values[d.label]??null}));
const comparisons={commonWindow:compareUi('indicator','strategy'),nov5Window:compareUi('indicatorNov5','strategyNov5')};
const inputResult={schema:'native-input-correspondence/v1',method:'Native AX snapshots matched by source input label. Separate date/time and session controls remain arrays. Presentation-only inputs are excluded from trading-equivalence comparison.',paths:uiPaths,
 unmapped:Object.fromEntries(Object.entries(ui).map(([k,v])=>[k,v.unmapped])),commonTradingInputVariables:trading.length,
 comparisons:Object.fromEntries(Object.entries(comparisons).map(([k,rows])=>[k,{compared:rows.length,missing:rows.filter(r=>r.left==null||r.right==null),differences:rows.filter(r=>JSON.stringify(r.left)!==JSON.stringify(r.right)),rows}]))};
assert(Object.values(inputResult.unmapped).every(a=>a.length===0),'Unmapped native input controls');
assert(Object.values(inputResult.comparisons).every(c=>c.missing.length===0&&c.differences.length===0),'Trading input mismatch or missing input');
fresh.nativeSourceIdentity={strategy:{copyBackPath:base+'strategy-editor-copy-back.pine',copyBackSha256:hash(base+'strategy-editor-copy-back.pine'),localSha256:hash('pine/experiments/strategy_signal_diagnostics.pine')},indicator:{copyBackPath:'reports/native-v090/indicator-install-2026-11-09/indicator-editor-copy-back.pine',copyBackSha256:hash('reports/native-v090/indicator-install-2026-11-09/indicator-editor-copy-back.pine'),localSha256:hash('pine/experiments/indicator_signal_diagnostics.pine')}};
assert(Object.values(fresh.nativeSourceIdentity).every(s=>s.copyBackSha256===s.localSha256),'Source copy-back mismatch');
fresh.inputComparison={path:'fresh-input-comparison.json',commonTradingInputVariables:trading.length,differences:0};
fresh.strategyPropertiesEvidence={path:base+'strategy-properties-ax.txt',actual:{initialCapital:10000,currency:'USD',defaultOrderSize:100,defaultOrderSizeType:'% of equity',pyramiding:0,barDetail:'Default (4 ticks per bar)',scriptExecution:'On bar close',commission:0.01,commissionType:'Percent',longLeverage:'1x',shortLeverage:'1x',slippageTicks:2,limitOrderExecution:'Requested price',orderExecutionDelay:'One tick'},note:'Values read from the native Properties dialog; default size is overridden by explicit qty in strategy.entry. Screenshot also preserved. No properties were changed for these tests.'};

const ev={indicator:events(paths.indicatorNov5),strategy:events(paths.strategyNov5)};
const at=(m,t,k,mod)=>ev[m].find(e=>e.observedAt===t&&e.kind===k&&(!mod||e.module===mod));
const tm=s=>Date.parse('2026-11-05T'+s+':00Z');
const f='F_TREND_PULLBACK',b='B_CRT';
const iSetup=at('indicator',tm('11:10'),'SETUP_DETECTED',f),sSetup=at('strategy',tm('11:15'),'SETUP_DETECTED',f);
const iEngine=at('indicator',tm('11:10'),'ENGINE'),sEngine=at('strategy',tm('11:10'),'ENGINE');
const iChecks=at('indicator',tm('12:15'),'CHECKS',f),sState=at('strategy',tm('12:15'),'STATE',f);
const iQ=at('indicator',tm('14:20'),'CHECKS',b),sQ=at('strategy',tm('14:20'),'CHECKS',b);
assert(iEngine.slotAvailable&&!sEngine.slotAvailable&&sEngine.active&&sEngine.brokerBusy,'Missing slot divergence');
assert(iSetup.trigger===4129.135&&sSetup.trigger===4132.185,'Unexpected frozen triggers');
assert(iChecks.failedChecks.length===0&&iChecks.plannedEntry===4130.3&&sState.candidateId===sSetup.candidateId&&!sState.checksEvaluated&&sState.stage===1,'Unexpected12:15decision');
assert(iChecks.plannedEntry>iSetup.trigger&&iChecks.plannedEntry<sSetup.trigger,'Trigger split not demonstrated');
assert(iQ.candidateId===sQ.candidateId&&iQ.firstBlocker==='QUOTA'&&JSON.stringify(iQ.failedChecks)==='["QUOTA"]'&&sQ.failedChecks.length===0,'Quota comparison not demonstrated');
const relevant=Object.fromEntries(Object.entries(ev).map(([m,events])=>[m,events.filter(e=>
 (['10:55','11:00','11:05','11:10','11:15','12:15','12:25','14:20'].map(tm).includes(e.observedAt)&&e.kind==='ENGINE')||
 (e.module===f&&[iSetup.candidateId,sSetup.candidateId].includes(e.candidateId)&&e.kind!=='STATE')||
 (e.module===f&&e.kind==='STATE'&&e.observedAt===tm('12:15'))||
 (e.module===b&&['14:15','14:20'].map(tm).includes(e.observedAt)&&['SETUP_DETECTED','CONFIRMATION_PASSED','CHECKS','SELECTED','ORDER_SUBMITTED','QUALIFIED_PLAN'].includes(e.kind))||
 (e.module===f&&e.observedAt===tm('11:15')&&['POSITION_CLOSED','EXIT_ROW'].includes(e.kind))||
 (e.module===f&&e.observedAt===tm('11:10')&&e.kind==='ESTIMATE_TRADE_CLOSED'))]));
const nov5={schema:'native-priority-difference-causality/v1',status:'TWO_NOV5_MISMATCH_CAUSES_ESTABLISHED_BY_MATCHED_NATIVE_ENGINE_AND_CHECKS',
 sources:{indicator:paths.indicatorNov5,strategy:paths.strategyNov5},inputComparison:'fresh-input-comparison.json',contextMatch:['symbol','timeframe','windowStart','windowEnd','firstDataTime'].every(k=>analyses.indicatorNov5.context[k]===analyses.strategyNov5.context[k]),
 captures:{indicator:{events:655,status:analyses.indicatorNov5.captureStatus},strategy:{events:672,status:analyses.strategyNov5.captureStatus}},
 findings:[{planTimestamp:1793880900000,classification:'EXECUTION_STATE_DIVERGENCE_ESTABLISHED',facts:{indicatorSetupObservedAt:iSetup.observedAt,indicatorTrigger:iSetup.trigger,strategySetupObservedAt:sSetup.observedAt,strategyTrigger:sSetup.trigger,indicatorQualifiedEntryAt1215:iChecks.plannedEntry,strategyStageAt1215:sState.stage,strategyChecksEvaluatedAt1215:sState.checksEvaluated,strategyInvalidation:at('strategy',tm('12:25'),'INVALIDATED',f)},mechanism:'The Indicator frees its slot and freezes a lower F trigger at11:10. Strategy remains busy then freezes the11:15 higher trigger after observing closure. The shared12:15 close lies between those frozen triggers: Indicator confirms and passes checks, Strategy does not confirm, then invalidates12:25. Actual broker exit timestamp is11:10 but the script observes closure11:15.',inferenceBoundary:'The shared12:15 close4130.30 is read from Indicator Close-entry CHECKS. Equivalent source-verified chart feed/M5/window/history and matching trading Inputs establish the comparison context; native Strategy STATE also directly shows stage1 and checks unevaluated.'},
 {planTimestamp:1793888400000,classification:'QUOTA_BLOCK_ESTABLISHED_BY_ACTUAL_CHECKS',facts:{candidateId:iQ.candidateId,indicatorFirstBlocker:iQ.firstBlocker,indicatorFailedChecks:iQ.failedChecks,strategyFailedChecks:sQ.failedChecks,indicatorSessionPlans:at('indicator',tm('14:20'),'ENGINE').sessionPlans,strategySessionPlans:at('strategy',tm('14:20'),'ENGINE').sessionPlans},mechanism:'Both models detect the same14:15 B candidate. At14:20 Indicator has5 session plans and fails only QUOTA; Strategy has4, passes all checks and selects the candidate. The extra Indicator F at12:15 accounts for the one-plan count difference.'}],relevantNativeEvents:relevant,
 limitations:['This establishes these two Nov5 mechanisms only. The other six full-history mismatch keys still lack fresh targeted ENGINE/CHECKS evidence.','Strict full-history plan equality remains false; the evidence classifies expected model state behavior rather than silently removing mismatch rows.','This is historical native simulation, not OOS profitability or complete non-repainting proof.']};
assert(nov5.contextMatch,'Capture context mismatch');
for(const [name,value]of Object.entries({'fresh-pair-comparison.json':fresh,'fresh-input-comparison.json':inputResult,'nov5-causal-review.json':nov5}))writeFileSync(resolve(dir,name),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({fullHistory:fresh.fullAvailableHistory.counts,fullParity:fresh.fullAvailableHistory.parity,strategyRepeatability:fresh.strategyRepeatability.parity,commonWindow:fresh.commonWindow.counts,commonWindowParity:fresh.commonWindow.parity,nov5Window:fresh.nov5Window.counts,nov5Findings:nov5.findings.map(f=>f.classification),commonTradingInputVariables:trading.length},null,2));
