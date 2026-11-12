"""Read generated PNGs without changing pixels; write atlas metadata."""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent
names = {
    'hero': ['idle-0','idle-1','run-0','run-1','run-2','run-3','jump','fall','crouch','attack-windup','attack-swing','attack-recover','attack-down','attack-up','hurt','defeat'],
    'bear-replacement': ['idle','walk-0','walk-1','walk-2','attack-windup','attack-lunge','hurt','defeat'],
    'tiger-replacement': ['idle','walk-0','walk-1','walk-2','pounce-windup','pounce','hurt','defeat'],
}
names['hero-unarmed'] = names['hero']
def cuts(projection, count):
    result = [0]
    for k in range(1, count):
        middle = round(len(projection)*k/count)
        radius = round(len(projection)/count*.20)
        lo, hi = middle-radius, middle+radius
        section = projection[lo:hi]
        candidates = np.flatnonzero(section == section.min()) + lo
        result.append(int(candidates[np.argmin(abs(candidates-middle))]))
    return result + [len(projection)]

manifest = {'version':1, 'cheat':'VOLBY', 'integratedIntoGame':False,
    'facing':'right', 'mirrorForLeft':True, 'atlases':{},
    'notes':['Preparatory artwork; not a replacement for native sprites.idx.',
             'Use constant pixelsPerUnit per atlas; do not normalize each pose height.',
             'Animation timing and foot pivots require gameplay review before integration.']}
report = {}
for name, ids in names.items():
    path = root / (name+'.png')
    im = Image.open(path)
    assert im.mode == 'RGBA'
    alpha = np.asarray(im)[:,:,3]
    solid = alpha >= 32
    rows = len(ids)//4
    ys = cuts(solid.sum(axis=1), rows)
    frames, loads = {}, []
    for row in range(rows):
        y0,y1 = ys[row:row+2]
        xs = cuts(solid[y0:y1].sum(axis=0), 4)
        for col in range(4):
            x0,x1 = xs[col:col+2]
            yy,xx = np.nonzero(alpha[y0:y1,x0:x1]>=8)
            assert len(xx)>100
            bx,by = x0+int(xx.min()), y0+int(yy.min())
            w,h = int(xx.max()-xx.min()+1), int(yy.max()-yy.min()+1)
            frames[ids[row*4+col]] = {'rect':[bx,by,w,h], 'pivot':[w/2,h], 'cell':[x0,y0,x1-x0,y1-y0]}
            if col: loads.append(int(solid[y0:y1,x0].sum()))
        if row: loads.append(int(solid[y0].sum()))
    assert max(loads)==0, (name,loads)
    ppu = frames[ids[0]]['rect'][3] / (36 if name.startswith('hero') else 30)
    manifest['atlases'][name] = {'file':path.name,'width':im.width,'height':im.height,'frames':frames,'pixelsPerUnit':ppu,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    report[name] = {'size':list(im.size),'mode':im.mode,'frames':len(ids),'transparentPixels':int((alpha==0).sum()),'alphaRange':[int(alpha.min()),int(alpha.max())],'maxSolidPixelsOnCuts':max(loads)}
manifest['animations'] = {
    'hero': {'idle':{'frames':names['hero'][:2],'fps':3},'run':{'frames':names['hero'][2:6],'fps':10},'attack':{'frames':names['hero'][9:12],'fps':10,'loop':False}},
    'bear-replacement': {'walk':{'frames':['walk-0','walk-1','walk-2'],'fps':8},'attack':{'frames':['attack-windup','attack-lunge','idle'],'fps':8,'loop':False}},
    'tiger-replacement': {'walk':{'frames':['walk-0','walk-1','walk-2'],'fps':10},'attack':{'frames':['pounce-windup','pounce','idle'],'fps':8,'loop':False}}
}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'inspection.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
