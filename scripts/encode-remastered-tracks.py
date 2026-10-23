import pathlib,json,subprocess,hashlib
root=pathlib.Path('art/music-remaster-v1');out=pathlib.Path('dist/assets/music-remastered');out.mkdir(exist_ok=True);tracks={}
for track in json.loads((root/'render-summary.json').read_text()):
 name=track['name'];target=out/(name+'.m4a');subprocess.run(['afconvert','-f','m4af','-d','aac','-b','192000',str(root/'masters'/(name+'.wav')),str(target)],check=True);data=target.read_bytes();tracks[name]={'file':target.name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'duration':track['duration'],'loopStart':track['loopStart'],'loopEnd':track['loopEnd'],'sourceSHA256':track['sourceSHA256']};print(name,len(data),flush=True)
manifest={'version':1,'format':'AAC-LC in MPEG-4','sampleRate':48000,'channels':2,'tracks':tracks};(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(root/'encoded-summary.json').write_text(json.dumps(manifest,indent=2)+'\n')
