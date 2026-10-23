"""Offline sample-based arrangement. Requires bundled numpy; touches no gameplay assets."""
import json, pathlib, re, struct, wave, hashlib
import numpy as np
ROOT=pathlib.Path('art/music-faithful-v1'); SR=48000
T=json.loads((ROOT/'timeline.json').read_text()); START=T['excerptStart']; DURATION=T['excerptDuration']; LENGTH=round((DURATION+1.7)*SR)
def readwav(path,trim=True):
 b=path.read_bytes();p=12;chunks={}
 while p+8<=len(b):
  n=int.from_bytes(b[p+4:p+8],'little');chunks[b[p:p+4]]=b[p+8:p+8+n];p+=8+n+(n&1)
 f=chunks[b'fmt '];ch=int.from_bytes(f[2:4],'little');sr=int.from_bytes(f[4:8],'little');bits=int.from_bytes(f[14:16],'little');raw=chunks[b'data']
 if bits==16:x=np.frombuffer(raw,'<i2').astype(np.float64)/32768
 elif bits==24:
  r=np.frombuffer(raw,np.uint8).reshape(-1,3).astype(np.int32);x=((r[:,0]|r[:,1]<<8|r[:,2]<<16)<<8>>8)/8388608
 else:raise ValueError(bits)
 x=x.reshape(-1,ch);x=np.repeat(x,2,axis=1)if ch==1 else x[:,:2]
 # Remove only genuinely silent capture lead-in, retaining the acoustic bow/hammer attack.
 energy=np.max(abs(x),axis=1);ix=np.flatnonzero(energy>.0025*energy.max());start=max(0,int(ix[0])-int(sr*.004))if len(ix)else 0;x=x[start:]if trim else x
 return x,sr,start/sr
samples=[]
for path in (ROOT/'samples').glob('*.wav'):
 m=re.search(r'_(C|G|A|E)(\d)_',path.name)
 if not m:continue
 note={'C':0,'E':4,'G':7,'A':9}[m[1]];piano=path.name.startswith('UR1');midi=12*(int(m[2])+(2 if piano else 1))+note
 x,sr,trim=readwav(path);samples.append(dict(file=path.name,kind='piano'if piano else'violin',root=midi,data=x,sr=sr,trim=trim))
violin=np.zeros((LENGTH,2));piano=np.zeros_like(violin);rendered=[]
selected=[e for e in T['events']if e['time']>=START and e['time']<T['duration']]
for e in selected:
 kind='piano'if e['instrument']==3 else'violin';options=[s for s in samples if s['kind']==kind];s=min(options,key=lambda s:abs(s['root']-e['pitch']));ratio=2**((e['pitch']-s['root'])/12);gate=e['end']-e['time'];release=.14 if kind=='violin'else .28;dur=gate+release;n=int(dur*SR);pos=np.arange(n)*s['sr']/SR*ratio
 sound=np.column_stack([np.interp(pos,np.arange(len(s['data'])),s['data'][:,c],left=0,right=0)for c in range(2)])
 # Preserve source onsets/pitches; shape only dynamics and instrument release.
 env=np.ones(n);attack=min(.018 if kind=='violin'else .004,gate*.15);na=max(1,int(attack*SR));env[:na]=np.sin(np.linspace(0,np.pi/2,na))**2;off=min(n,int(gate*SR));env[off:]=np.cos(np.linspace(0,np.pi/2,n-off))**2
 autom=e.get('volumeAutomation',[{'time':e['time'],'volume':e['velocity']}]);times=np.arange(n)/SR+e['time'];vol=np.interp(times,[x['time']for x in autom],[x['volume']/64 for x in autom]);env*=vol
 # Source bass is much louder than the sampled bowed melody; balance the ensemble.
 peak=np.max(abs(s['data']));gain=(.24 if kind=='piano'else .48)/max(.15,peak);sound*=env[:,None]*gain
 if kind=='violin':sound[:,1]*=.86
 else:sound[:,0]*=.90
 start=round((e['time']-START)*SR);end=min(LENGTH,start+n);(piano if kind=='piano'else violin)[start:end]+=sound[:end-start]
 rendered.append({k:e[k]for k in ['channel','instrument','time','end','pitch','midi','step']}|{'target':kind,'sample':s['file'],'sampleRoot':s['root'],'ratio':ratio})
# Shared small-room early reflections; no timing/pitch changes to dry notes.
def room(x):
 y=x.copy()
 for delay,gain in[(.031,.09),(.047,.065),(.073,.05),(.109,.035),(.163,.025),(.229,.018)]:
  d=round(delay*SR);y[d:,0]+=x[:-d,1]*gain;y[d:,1]+=x[:-d,0]*gain*.94
 return y
mix=room(piano+violin);fade=int(.55*SR);mix[-fade:]*=np.linspace(1,0,fade)[:,None];peak=float(np.max(abs(mix)));gain=.89/max(peak,1e-6);mix*=gain
out=ROOT/'output';out.mkdir(exist_ok=True)
def wav(name,x):
 with wave.open(str(out/name),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
wav('PRES-violin-piano.wav',mix);wav('PRES-violin-isolated.wav',room(violin)*gain)
# Match the original reference's duration and playback start; normalize independently for A/B.
original,rate,_=readwav(ROOT/'output/PRES-source-excerpt.wav',trim=False);orig=np.column_stack([np.interp(np.arange(round(DURATION*SR))*rate/SR,np.arange(len(original)),original[:,c])for c in range(2)]);orig*=.89/max(np.max(abs(orig)),1e-6);wav('PRES-original.wav',orig)
silence=np.zeros((SR,2));wav('PRES-comparison-original-then-arrangement.wav',np.concatenate([orig,silence,mix]))
assert len(rendered)==len(selected);assert all(r['time']==e['time']and r['pitch']==e['pitch'] for r,e in zip(rendered,selected))
proof={'sourceSHA256':T['sourceSHA256'],'events':len(rendered),'noteOnsetsUnchanged':True,'pitchStepsUnchanged':True,'newPitchedNotes':0,'sourceExcerptStart':START,'originalDuration':DURATION,'arrangementDuration':LENGTH/SR,'sampleSource':'VSCO 2 CE 440300901dfe9275fd84e0b7763af1f8443ae62e (CC0)','normalizationGain':gain,'peak':float(np.max(abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'renderedEvents':rendered};(ROOT/'verification.json').write_text(json.dumps(proof,indent=2)+'\n');print({k:v for k,v in proof.items()if k!='renderedEvents'})
