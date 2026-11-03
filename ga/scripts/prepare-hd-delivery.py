#!/usr/bin/env python3
"""Prepare exact lossless WebP delivery copies; original painted PNGs stay intact.
Requires Pillow with WebP support. This is asset packaging, not art generation.
"""
import argparse, concurrent.futures, hashlib, json, os
from pathlib import Path
from PIL import Image, features

def sha(data): return hashlib.sha256(data).hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'dist/assets/hd')
    parser.add_argument('--report',type=Path,required=True)
    parser.add_argument('--workers',type=int,default=2)
    parser.add_argument('--only',action='append',help='Update only selected atlas IDs; repeat as needed')
    args=parser.parse_args()
    if not features.check('webp'): raise RuntimeError('Pillow WebP support is required')
    root=args.root.resolve();manifest_path=root/'manifest.json';manifest=json.loads(manifest_path.read_text())
    delivery_dir=root/'delivery';delivery_dir.mkdir(exist_ok=True)
    def encode(item):
        key,meta=item
        if any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in key): raise ValueError('Unsafe atlas ID')
        source=(root/meta['src']).resolve()
        if not source.is_relative_to(root): raise ValueError('Source escapes HD root')
        raw=source.read_bytes()
        if sha(raw)!=meta['sha256']: raise ValueError('Source atlas SHA mismatch: '+key)
        with Image.open(source) as source_image:
            rgba=source_image.convert('RGBA');pixels=rgba.tobytes();output=delivery_dir/(key+'.webp')
            options={'lossless':True,'method':4,'exact':True}
            if source_image.info.get('icc_profile'):options['icc_profile']=source_image.info['icc_profile']
            rgba.save(output,format='WEBP',**options)
        encoded=output.read_bytes()
        encoded_sha=sha(encoded)
        with Image.open(output) as check:
            if check.size!=rgba.size or check.convert('RGBA').tobytes()!=pixels: raise ValueError('Lossless RGBA proof failed: '+key)
        if len(encoded)<len(raw):
            hashed=delivery_dir/(key+'-'+encoded_sha[:16]+'.webp');os.replace(output,hashed);output=hashed
        row={'atlas':key,'sourceBytes':len(raw),'deliveryBytes':len(encoded),'rgbaIdentical':True,'used':len(encoded)<len(raw),'iccProfilePreserved':bool(options.get('icc_profile'))}
        payload={'src':output.relative_to(root).as_posix(),'sha256':sha(encoded),'size':len(encoded),'sourceSHA256':meta['sha256'],'rgbaSHA256':sha(pixels)} if row['used'] else None
        if not row['used']:output.unlink()
        return key,payload,row
    rows=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(4,args.workers))) as pool:
        for key,payload,row in pool.map(encode,[(key,meta) for key,meta in manifest['atlases'].items() if not args.only or key in args.only]):
            if payload:manifest['atlases'][key]['delivery']=payload
            else:manifest['atlases'][key].pop('delivery',None)
            rows.append(row)
    tmp=manifest_path.with_suffix('.json.tmp');tmp.write_text(json.dumps(manifest,indent=2)+'\n');os.replace(tmp,manifest_path)
    before=sum(r['sourceBytes'] for r in rows);after=sum(r['deliveryBytes'] if r['used'] else r['sourceBytes'] for r in rows)
    report={'method':'Pillow lossless WebP method4 exact=True; decoded full RGBA bytes including hidden RGB compared for every atlas','sourcePNGUnchanged':True,'atlases':len(rows),'sourceBytes':before,'preferredDeliveryBytes':after,'savedBytes':before-after,'rows':rows}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='rows'}))
if __name__=='__main__':main()
