"""Render the complete recovered soundtrack as sampled violin/piano/section strings.
Requires NumPy. No edits to the original MOD or playback kernel.
"""
import pathlib,json,re,wave,hashlib,math,argparse
import numpy as np
ROOT=pathlib.Path('art/music-remaster-v1'); SR=48000
parser=argparse.ArgumentParser();parser.add_argument('tracks',nargs='*');args=parser.parse_args()
def readwav(path,trim=True):
 b=path.read_bytes();p=12;d={}
 while p+8<=len(b):
  n=int.from_bytes(b[p+4:p+8],'little');d[b[p:p+4]]=b[p+8:p+8+n];p+=8+n+(n&1)
 f=d[b'fmt '];ch=int.from_bytes(f[2:4],'little');rate=int.from_bytes(f[4:8],'little');bits=int.from_bytes(f[14:16],'little')
 if bits==16:x=np.frombuffer(d[b'data'],'<i2').astype(np.float32)/32768
 else:
  r=np.frombuffer(d[b'data'],np.uint8).reshape(-1,3).astype(np.int32);x=((r[:,0]|r[:,1]<<8|r[:,2]<<16)<<8>>8).astype(np.float32)/8388608
 x=x.reshape(-1,ch);x=np.repeat(x,2,axis=1)if ch==1 else x[:,:2];x-=x.mean(axis=0)
 if trim:
  ix=np.flatnonzero(np.max(abs(x),axis=1)>np.max(abs(x))*.0025);start=max(0,int(ix[0])-round(rate*.004))if len(ix)else 0;x=x[start:]
 return x,rate
samples=[]
for folder in ['art/music-faithful-v1/samples','art/music-faithful-v2/samples']:
 for path in pathlib.Path(folder).glob('*.wav'):
  name=path.name;kind='piano'if name.startswith('UR1')else'violin'if name.startswith('LLVln')else'piccolo'if name.startswith('piccolo')else'violin-section'if name.startswith('VlnEns')else'viola-section'if name.startswith('ViolaEns')else'cello-section';m=re.search(r'_([A-G])(#?)(\d)_',name)
  if not m:continue
  root=12*(int(m[3])+(1 if kind=='violin'else 2))+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[m[1]]+bool(m[2]);x,rate=readwav(path);samples.append(dict(file=name,kind=kind,root=root,x=x,rate=rate,peak=max(.1,float(np.max(abs(x)))),stac='staccato'in name))
cache={}
def note(kind,pitch,gate,attack,release):
 # Native fixed-point steps repeat exactly, making a small reusable note cache practical.
 key=(kind,round(pitch,6),round(gate,6),attack,release)
 if key in cache:return cache[key]
 options=[s for s in samples if s['kind']==kind and (kind!='piccolo'or s['stac'])];s=min(options,key=lambda s:abs(s['root']-pitch));ratio=2**((pitch-s['root'])/12);n=round((gate+release)*SR);pos=np.arange(n)*s['rate']/SR*ratio;x=s['x'];sig=np.column_stack([np.interp(pos,np.arange(len(x)),x[:,c],left=0,right=0)for c in range(2)]).astype(np.float32)/s['peak'];env=np.ones(n,np.float32);na=min(n,max(1,round(attack*SR)));env[:na]=np.sin(np.linspace(0,np.pi/2,na))**2;off=min(n,round(gate*SR));env[off:]=np.cos(np.linspace(0,np.pi/2,n-off))**2;sig*=env[:,None];result=(sig,s['file']);cache[key]=result
 if len(cache)>180:cache.pop(next(iter(cache)))
 return result
summary=[]
for path in sorted((ROOT/'timelines').glob('*.json')):
 name=path.stem
 if args.tracks and name not in args.tracks:continue
 t=json.loads(path.read_text());N=round(t['duration']*SR);loop=round(t['loopStart']*SR);period=N-loop;dry=np.zeros((N,2),np.float32);bed=np.zeros_like(dry);bird=np.zeros_like(dry);rendered=[];sections=[];ornaments=[]
 def add(buf,sig,time,level,pan=0,automation=None):
  sig=sig.copy();sig[:,0]*=level*math.sqrt((1-pan)/2)*1.25;sig[:,1]*=level*math.sqrt((1+pan)/2)*1.25
  if automation:
   times=np.arange(len(sig))/SR+time;vol=np.interp(times,[a['time']for a in automation],[a['volume']/64 for a in automation]);sig*=vol[:,None]
  pos=round(time*SR);cursor=0
  while cursor<len(sig):
   if pos>=N:pos=loop+(pos-N)%period
   count=min(len(sig)-cursor,N-pos);buf[pos:pos+count]+=sig[cursor:cursor+count];cursor+=count;pos+=count
 for e in t['events']:
  kind='piano'if e['role']in['bass','piano']else'violin';pitch=e['pitch']
  if e['role']=='cello'or kind=='violin'and pitch<55:kind='cello-section'
  gate=min(e['end']-e['time'],12);attack=.004 if kind=='piano'else .018;release=.28 if kind=='piano'else .14;level=.32 if e['role']=='bass'else .30 if kind=='piano'else .64 if kind=='violin'else .44
  for interval in e['chord']:
   sig,file=note(kind,pitch+interval,gate,attack,release);add(dry,sig,e['time'],level/math.sqrt(len(e['chord'])),pan=-.08 if kind=='violin'else .08,automation=e['volumeAutomation'])
  rendered.append({'time':e['time'],'pitch':pitch,'step':e['step'],'sourceInstrument':e['instrument'],'target':kind,'chord':e['chord']})
 # Keep the approved orchestra-forward balance, deriving sustained harmony from native bass.
 bass=[e for e in t['events']if e['role']=='bass'];anchors=[];seen=set()
 for e in bass or t['events']:
  key=(e.get('order'),int(e.get('row')or 0)//16)
  if key not in seen:anchors.append(e);seen.add(key)
 for i,e in enumerate(anchors):
  end=anchors[i+1]['time']if i+1<len(anchors)else t['duration'];gate=min(8,max(.08,end-e['time']));root=e['pitch']
  while root<31:root+=12
  while root>43:root-=12
  for kind,shift,level,pan in [('cello-section',12,.46,.35),('viola-section',24,.40,.05),('violin-section',31,.32,-.4)]:
   sig,file=note(kind,root+shift,gate,.10,.45);add(bed,sig,e['time'],level);sections.append({'time':e['time'],'pitch':root+shift,'sourcePitch':e['pitch'],'kind':kind})
 for cue in t['birds']:
  base=cue['pitch']
  while base<79:base+=12
  while base>94:base-=12
  neighbour=1 if round(base)%12 in [4,9,11]else 2;spacing=min(.39,max(.25,cue['duration']))/3
  for k,offset in enumerate([0,neighbour,0]):
   sig,file=note('piccolo',base+offset,spacing*.62,.007,.05);add(bird,sig,cue['time']+k*spacing,.19*(1-.16*k),pan=-.32 if len(ornaments)%2==0 else .32)
  ornaments.append({'time':cue['time'],'pitch':base,'sourcePitch':cue['pitch']})
 def reverb(x):
  out=x.copy()
  for delay,gain in[(.029,.11),(.047,.09),(.071,.075),(.109,.055),(.173,.04),(.239,.029),(.331,.02),(.461,.012)]:
   d=round(delay*SR);out[d:,0]+=x[:-d,1]*gain;out[d:,1]+=x[:-d,0]*gain
   # Previous loop's reflections carry across the loop boundary.
   if d<period:out[loop:loop+d,0]+=x[-d:,1]*gain;out[loop:loop+d,1]+=x[-d:,0]*gain
  return out
 mix=reverb(dry+bed+bird);peak=float(np.max(abs(mix)));gain=.89/max(peak,1e-5);mix*=gain
 # Three-millisecond edge ramps suppress the discontinuity without changing musical duration.
 edge=min(round(.003*SR),period//4);mix[:edge]*=np.linspace(0,1,edge)[:,None];mix[loop:loop+edge]*=np.linspace(0,1,edge)[:,None];mix[-edge:]*=np.linspace(1,0,edge)[:,None]
 assert np.all(np.isfinite(mix));assert len(rendered)==len(t['events'])and all(r['time']==e['time']and r['pitch']==e['pitch']for r,e in zip(rendered,t['events']))
 target=ROOT/'masters'/f'{name}.wav';target.parent.mkdir(exist_ok=True)
 with wave.open(str(target),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((mix*32767).astype('<i2').tobytes())
 info={'name':name,'sourceSHA256':t['sourceSHA256'],'duration':N/SR,'frames':N,'loopStart':loop/SR,'loopEnd':N/SR,'sourceEvents':len(t['events']),'renderedEvents':len(rendered),'sectionNotes':len(sections),'birdCues':len(ornaments),'peak':float(np.max(abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'normalizationGain':gain,'masterSHA256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceNotesPreserved':True,'rmsBeforeGain':{'dry':float(np.sqrt(np.mean(dry**2))),'strings':float(np.sqrt(np.mean(bed**2)))}}
 (ROOT/'review'/f'{name}.json').write_text(json.dumps(info|{'events':rendered,'sections':sections,'birds':ornaments},indent=2)+'\n');print(info,flush=True);summary.append(info);del dry,bed,bird,mix;cache.clear()
if not args.tracks:(ROOT/'render-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
