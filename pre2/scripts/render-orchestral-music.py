"""Review-only orchestral expansion; original duet remains an independent unchanged source."""
import pathlib,json,re,wave,hashlib,argparse,math
import numpy as np
parser=argparse.ArgumentParser();parser.add_argument('--strings-gain',type=float,default=1.0);parser.add_argument('--mix-id',default='');args=parser.parse_args();assert 0<args.strings_gain<=8;assert re.fullmatch(r'[a-z0-9-]*',args.mix_id)
BASE=pathlib.Path('art/music-faithful-v1'); ROOT=pathlib.Path('art/music-faithful-v2'); SR=48000
T=json.loads((BASE/'timeline.json').read_text()); CUES=json.loads((ROOT/'bird-cues.json').read_text()); START=T['excerptStart']; DURATION=T['excerptDuration']
def readwav(path,trim=False):
 b=path.read_bytes();p=12;chunks={}
 while p+8<=len(b):
  n=int.from_bytes(b[p+4:p+8],'little');chunks[b[p:p+4]]=b[p+8:p+8+n];p+=8+n+(n&1)
 f=chunks[b'fmt '];channels=int.from_bytes(f[2:4],'little');sr=int.from_bytes(f[4:8],'little');bits=int.from_bytes(f[14:16],'little');r=chunks[b'data']
 if bits==16:x=np.frombuffer(r,'<i2').astype(float)/32768
 elif bits==24:
  a=np.frombuffer(r,np.uint8).reshape(-1,3).astype(np.int32);x=((a[:,0]|a[:,1]<<8|a[:,2]<<16)<<8>>8)/8388608
 else:raise ValueError(bits)
 x=x.reshape(-1,channels);x=np.repeat(x,2,axis=1)if channels==1 else x[:,:2];x-=np.mean(x,axis=0)if trim else 0
 if trim:
  energy=np.max(abs(x),axis=1);ix=np.flatnonzero(energy>energy.max()*.003);first=max(0,int(ix[0])-.006*sr)if len(ix)else 0;x=x[int(first):]
 return x,sr
originalDuet=BASE/'output/PRES-violin-piano.wav';duet,sr=readwav(originalDuet);assert sr==SR
N=len(duet);beds=np.zeros((N,2));birds=np.zeros_like(beds);metadata=[];samples=[]
for path in (ROOT/'samples').glob('*.wav'):
 name=path.name;kind='piccolo'if name.startswith('piccolo')else'violin-section'if name.startswith('VlnEns')else'viola-section'if name.startswith('ViolaEns')else'cello-section';m=re.search(r'_([A-G])(#?)(\d)_',name);assert m,name
 semitone={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[m[1]]+bool(m[2]);root=12*(int(m[3])+2)+semitone
 # All selected section/piccolo files use C3=middle C; source solo-violin files use C4.
 x,rate=readwav(path,trim=True);samples.append(dict(file=name,kind=kind,root=root,x=x,sr=rate,staccato='staccato'in name))
def add(buffer,kind,pitch,time,gate,level,pan=0,attack=.10,release=.45,expression=1,staccato=False):
 options=[s for s in samples if s['kind']==kind and (kind!='piccolo'or s['staccato']==staccato)];s=min(options,key=lambda s:abs(s['root']-pitch));ratio=2**((pitch-s['root'])/12);n=round((gate+release)*SR);pos=np.arange(n)*s['sr']/SR*ratio;x=s['x'];sig=np.column_stack([np.interp(pos,np.arange(len(x)),x[:,c],left=0,right=0)for c in range(2)])
 # Slow natural section swells; exact solo timing is left untouched.
 env=np.ones(n);a=max(1,min(n,round(attack*SR)));env[:a]=np.sin(np.linspace(0,np.pi/2,a))**2;off=min(n,round(gate*SR));env[off:]=np.cos(np.linspace(0,np.pi/2,n-off))**2
 if kind!='piccolo':env[:off]*=(.86+.14*np.sin(np.linspace(0,np.pi,off)))
 sig*=env[:,None]*level*expression/max(np.max(abs(x)),.1);sig[:,0]*=np.sqrt((1-pan)/2)*1.25;sig[:,1]*=np.sqrt((1+pan)/2)*1.25
 start=round(time*SR);end=min(N,start+n)
 if start<0:sig=sig[-start:];start=0
 if end>start:buffer[start:end]+=sig[:end-start]
 metadata.append({'kind':kind,'pitch':pitch,'time':time,'gate':gate,'sample':s['file'],'sampleRoot':s['root'],'level':level,'pan':pan})
# Harmonic anchors every sixteen original rows, not every passing bass note.
anchors=[e for e in T['events']if e['instrument']==3 and e['time']>=START and e.get('row',-1)%16==0]
for i,e in enumerate(anchors):
 time=e['time']-START;end=anchors[i+1]['time']-START if i+1<len(anchors)else DURATION;gate=end-time;root=e['pitch'];expression=.82+.18*(time/DURATION)
 # Cello/octave viola/open-fifth violins: no competing lead or invented rhythmic phrase.
 for kind,interval,level,pan in [('cello-section',12,.115,.35),('viola-section',24,.10,.05),('violin-section',31,.080,-.4)]:add(beds,kind,root+interval,time,gate,level,pan,expression=expression)
# Replace each audible source bird trigger with a short piccolo neighbour-note trill.
played=[]
for cue in CUES['cues']:
 if cue['volume']<=0:continue
 base=84+cue['relativeSemitones'];pc=round(base)%12;neighbour=1 if pc in [4,9,11]else 2;length=min(.39,max(.25,cue['sourceDuration']));spacing=length/3
 for k,offset in enumerate([0,neighbour,0]):add(birds,'piccolo',base+offset,cue['time']+k*spacing,spacing*.62,.19*(1-.16*k),pan=-.32 if len(played)%2==0 else .32,attack=.007,release=.05,staccato=True)
 played.append({'sourceTime':cue['sourceTime'],'time':cue['time'],'basePitch':base,'neighbourSemitones':neighbour,'duration':length,'notes':3})
def room(x):
 y=x.copy()
 for delay,gain in[(.029,.11),(.047,.09),(.071,.075),(.109,.055),(.173,.04),(.239,.029),(.331,.02),(.461,.012)]:
  d=round(delay*SR);y[d:,0]+=x[:-d,1]*gain;y[d:,1]+=x[:-d,0]*gain
 return y
backing=room(beds)*args.strings_gain;piccolo=room(birds);dry=.82*duet;full=dry+backing+piccolo
# Only a shared final gain and tail fade affect the existing duet.
fade=round(.55*SR);envelope=np.ones(N);envelope[-fade:]=np.linspace(1,0,fade);full*=envelope[:,None];peak=float(np.max(abs(full)));gain=.89/peak;full*=gain
out=ROOT/('output'+('-'+args.mix_id if args.mix_id else''));out.mkdir(exist_ok=True)
def wav(name,x):
 assert np.all(np.isfinite(x));assert np.max(abs(x))<1
 with wave.open(str(out/name),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((x*32767).astype('<i2').tobytes())
wav('PRES-violin-piano-orchestra-piccolo.wav',full);wav('PRES-string-orchestra-only.wav',backing*gain);wav('PRES-bird-piccolo-only.wav',piccolo*gain)
# Matched-level A/B: original duet then fuller arrangement, separated by one second.
wav('PRES-comparison-duet-then-orchestra.wav',np.concatenate([duet*.82*gain,np.zeros((SR,2)),full]))
proof={'stringsGain':args.strings_gain,'stringsGainDB':20*math.log10(args.strings_gain),'sourceMODSHA256':T['sourceSHA256'],'duetSourceSHA256':hashlib.sha256(originalDuet.read_bytes()).hexdigest(),'duetEventsUnchanged':True,'sourcePitchedEvents':114,'addedSectionNotes':len(anchors)*3,'audibleBirdCues':len(played),'mutedBirdCuesOmitted':sum(c['volume']<=0 for c in CUES['cues']),'birdCueOnsetsUnchanged':all(p['time']==c['time']for p,c in zip(played,[c for c in CUES['cues']if c['volume']>0])),'duration':N/SR,'sampleRate':SR,'normalizationGain':gain,'peak':float(np.max(abs(full))),'rms':{'duet':float(np.sqrt(np.mean(dry**2))),'strings':float(np.sqrt(np.mean(backing**2))),'piccolo':float(np.sqrt(np.mean(piccolo**2)))},'birdArrangement':played,'renderedAddedNotes':metadata}
(ROOT/('verification'+('-'+args.mix_id if args.mix_id else'')+'.json')).write_text(json.dumps(proof,indent=2)+'\n');print({k:v for k,v in proof.items()if k not in ['renderedAddedNotes','birdArrangement']})
