import re,json,datetime
from pathlib import Path
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
for kind,files in [('strategy', [f'strategy-nov5-inputs-page{i}.ax.txt' for i in range(4)]), ('indicator', [f'indicator-restored-inputs-page{i}.ax.txt' for i in range(4)])]:
 specs=[]
 for line in (ROOT / f'pine/experiments/{kind}_confirmation_review.pine').read_text().splitlines():
  m=re.match(r"(\w+) = input\.(\w+)\((?:'[^']*'|[^,]*), '([^']+)'",line)
  if m: specs.append(m.groups())
 lines=[]
 for f in files:
  t=re.sub(r'^[+~]', '', (D/f).read_text(), flags=re.M); m=re.search(r'\d+ container \(showing',t); assert m,f
  part=t[m.start():];part=part[:part.index('pop up button Defaults')];lines.extend(part.splitlines())
 result={};controls={};missing=[]
 for name,typ,label in specs:
  if typ=='bool':
   found=[re.search(r'checkbox '+re.escape(label)+r', Value: ([01])',s) for s in lines]; vals={bool(int(m[1])) for m in found if m}
   assert len(vals)==1,(name,vals)
   result[name]=vals.pop();continue
  inds=[i for i,s in enumerate(lines) if re.search(r'\d+ text ',s) and s.endswith(label)]
  values=[]
  for i in inds:
   after=lines[i+1:i+(7 if typ in ['time','session'] else 3)]
   ctrls=[s.strip() for s in after if re.match(r'\d+ (text field|combo box) \(settable\)',s.strip())]
   if ctrls:values.append(ctrls)
  assert values,(name,label)
  def value(s):return re.sub(r'^\d+ (?:text field|combo box) \(settable\) (?:Value: )?','',s).split(', Placeholder:')[0]
  if typ=='session':values=[v for v in values if len(v)>=2 and all(re.fullmatch(r'\d{2}:\d{2}',value(x)) for x in v[:2])]
  assert values,(name,'incomplete controls')
  values=values[0]; controls[name]=values
  if typ in ['int','float']:result[name]=float(value(values[0]).replace(',',''));result[name]=int(result[name]) if typ=='int' else result[name]
  elif typ=='time':result[name]=int(datetime.datetime.fromisoformat(value(values[0])+'T'+value(values[1])+':00+00:00').timestamp()*1000)
  elif typ=='session':result[name]=value(values[0]).replace(':','')+'-'+value(values[1]).replace(':','')
  elif typ=='timeframe':result[name]=value(values[0]).split(' ')[0]
  else:result[name]=value(values[0])
 out={'attribution':'Observed native TradingView input controls, captured UTC chart display; no defaults substituted','evidenceFiles':files,'inputCount':len(specs),'inputSettings':result,'observedControls':controls}
 (D/f'{kind}-runtime-inputs.json').write_text(json.dumps(out,indent=2)+'\n')
a=json.loads((D/'indicator-runtime-inputs.json').read_text())['inputSettings'];b=json.loads((D/'strategy-runtime-inputs.json').read_text())['inputSettings'];delta={k:{'indicator':a[k],'strategy':b.get(k)} for k in a if a[k]!=b.get(k)}
print('Runtime inputs',len(a),len(b),'differences',delta)
(D/'runtime-input-comparison.json').write_text(json.dumps({'indicatorInputCount':len(a),'strategyInputCount':len(b),'differences':delta,'equal':not delta},indent=2)+'\n')
