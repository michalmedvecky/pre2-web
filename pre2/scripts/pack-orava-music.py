"""Package approved generated songs; expects decoded PCM WAVs in art/music-orava-v1/raw.
Run with NumPy and macOS afconvert (AAC encoder). Never fetches paid generations.
"""
import hashlib,json,pathlib,subprocess,wave
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
art=root/'art/music-orava-v1'; dest=root/'dist/assets/music-orava'
songs=json.loads((art/'songs.json').read_text());tasks={s['level']:s['taskId'] for s in json.loads((art/'tasks.json').read_text())}
manifest={'version':1,'style':'Original Slovak vocal folk songs inspired by Orava','tracks':{}}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for s in songs:
 name='LEVEL_'+s['level']; raw=art/'raw'/f'{name}.wav'
 with wave.open(str(raw)) as w:rate=w.getframerate();channels=w.getnchannels();x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float64).reshape(-1,channels)/32768
 peak=float(np.max(np.abs(x)));rms=float(np.sqrt(np.mean(x*x)));gain=min(.89/max(peak,1e-9),.13/max(rms,1e-9),2)
 x*=gain;n=min(round(rate*.02),len(x)//2);x[:n]*=np.linspace(0,1,n)[:,None];x[-n:]*=np.linspace(1,0,n)[:,None]
 master=art/'raw'/f'{name}-master.wav'
 with wave.open(str(master),'wb') as w:w.setnchannels(channels);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.rint(x*32767).astype('<i2').tobytes())
 target=dest/f'{name}.m4a'
 subprocess.run(['afconvert','-f','m4af','-d','aac','-b','192000',str(master),str(target)],check=True,capture_output=True)
 duration=len(x)/rate
 review={'taskId':tasks[s['level']],'level':s['level'],'rawSHA256':sha(art/'raw'/f'{name}.mp3'),'duration':duration,'gain':gain,'rms':float(np.sqrt(np.mean(x*x))),'peak':float(np.max(np.abs(x))),'edgeFadeSeconds':.02,'loop':'full song; 20 ms edge fades, no claim of beat-matched seamless vocal looping','newComposition':True,'preservesOriginalMODMelody':False}
 (art/'review'/f'{name}.json').write_text(json.dumps(review,indent=2)+'\n')
 manifest['tracks'][name]={'file':target.name,'title':s['title'],'level':s['level'],'taskId':tasks[s['level']],'duration':duration,'loopStart':0,'loopEnd':duration,'bytes':target.stat().st_size,'sha256':sha(target),'lyrics':s['lyrics']}
 print(name,round(duration,3),target.stat().st_size)
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
