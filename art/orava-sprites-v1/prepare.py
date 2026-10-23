"""Read-only PNG inspection; writes frame metadata and a synthesized bell sound.
No generated image pixels are modified. Requires Pillow and NumPy.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib,wave
root=Path(__file__).resolve().parent
names={
'hero':['idle-0','idle-1','run-0','run-1','run-2','run-3','jump','fall','crouch','attack-windup','attack-release','attack-recover','hurt','land','defeat','victory'],
'dog':['idle-0','idle-1','trot-0','trot-1','trot-2','trot-3','run-0','run-1','jump','fall','sit','happy'],
'food':['bonus-halusky','pickup-pirohy','pickup-bacon'],
'effects':['star-0','star-1','star-2','star-3','hit-0','hit-1','hit-2','hit-3','bells-down','bells-forward','sound-pulse','sparkle']}
manifest={'version':1,'integratedIntoGame':False,'facing':'right','mirrorForLeft':True,'generator':'Built-in image_gen; approved ORAVA concept as identity reference','atlases':{},'animations':{'hero':{'idle':{'frames':['idle-0','idle-1'],'fps':3},'run':{'frames':['run-0','run-1','run-2','run-3'],'fps':10},'jump':{'frames':['jump','fall'],'fps':3,'loop':False},'attack':{'frames':['attack-windup','attack-release','attack-recover'],'fps':10,'loop':False,'events':[{'frame':1,'sound':'bells','emit':'star'}]}},'dog':{'idle':{'frames':['idle-0','idle-1'],'fps':3},'trot':{'frames':['trot-0','trot-1','trot-2','trot-3'],'fps':10},'run':{'frames':['run-0','run-1'],'fps':8}},'effects':{'projectile':{'frames':['star-0','star-1','star-2','star-3'],'fps':12},'hit':{'frames':['hit-0','hit-1','hit-2','hit-3'],'fps':16,'loop':False}}},'audio':{'bells':{'file':'bells.wav','type':'synthesized pair of inharmonic brass bell strikes','duration':2.4,'trigger':'hero attack-release','spatial':{'panning':'HRTF','positionalSource':True,'reverbSeconds':.48}}}}
report={}
def cuts(proj,count):
 out=[0];n=len(proj)
 for k in range(1,count):
  center=round(n*k/count);radius=round(n/count*.22);lo=max(out[-1]+1,center-radius);hi=min(n,center+radius)
  section=proj[lo:hi];minimum=section.min();candidates=np.flatnonzero(section==minimum)+lo
  cut=int(candidates[np.argmin(abs(candidates-center))]);out.append(cut)
 out.append(n);return out
for name,ids in names.items():
 p=root/(name+'.png');im=Image.open(p);a=np.asarray(im)[:,:,3];h,w=a.shape;columns=3 if name=='food' else 4;rows=len(ids)//columns;solid=a>=32
 ys=cuts(solid.sum(axis=1),rows);frames={};cutloads=[]
 for row in range(rows):
  y0,y1=ys[row:row+2];xs=cuts(solid[y0:y1].sum(axis=0),columns)
  for col in range(columns):
   x0,x1=xs[col:col+2];region=a[y0:y1,x0:x1];yy,xx=np.nonzero(region>=8)
   assert len(xx)>100
   bx=x0+int(xx.min());by=y0+int(yy.min());bw=int(xx.max()-xx.min()+1);bh=int(yy.max()-yy.min()+1)
   ident=ids[row*columns+col];frames[ident]={'rect':[bx,by,bw,bh],'pivot':[bw/2,bh] if name!='effects' else [bw/2,bh/2],'cell':[x0,y0,x1-x0,y1-y0]}
   if col:cutloads.append(int(solid[y0:y1,x0].sum()))
  if row:cutloads.append(int(solid[y0].sum()))
 scale=float(np.median([frames[k]['rect'][3] for k in ids[:2]]))/(36 if name=='hero' else 20 if name=='dog' else 12)
 manifest['atlases'][name]={'file':p.name,'width':w,'height':h,'columns':columns,'rows':rows,'pixelsPerUnit':scale,'frames':frames,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 report[name]={'mode':im.mode,'size':[w,h],'frameCount':len(frames),'fullyTransparentPixels':int((a==0).sum()),'alphaRange':[int(a.min()),int(a.max())],'maxSolidPixelsOnInternalCut':max(cutloads),'frameBoundsThreshold':8,'solidCutThreshold':32}
 assert max(cutloads)==0,(name,cutloads)
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(root/'inspection.json').write_text(json.dumps(report,indent=2)+'\n')
# Two close, slightly differently tuned metal bells; deterministic synthesized SFX.
sr=44100;t=np.arange(round(sr*2.4))/sr;x=np.zeros_like(t)
for start,freq in [(0,610),(.055,810)]:
 q=np.maximum(0,t-start);voice=np.zeros_like(t)
 for ratio,amp,decay in [(1,1,1.0),(1.003,.18,.85),(1.48,.45,.7),(2.13,.32,.48),(2.92,.18,.3),(4.07,.08,.16)]:voice+=amp*np.sin(2*np.pi*freq*ratio*q)*np.exp(-q/decay)
 voice*=np.minimum(q/.002,1)*(t>=start);x+=voice
x*=.82/max(abs(x));x[-882:]*=np.linspace(1,0,882)
with wave.open(str(root/'bells.wav'),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes(np.rint(x*32767).astype('<i2').tobytes())
print(json.dumps(report,indent=2))
