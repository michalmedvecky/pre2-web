"""Fetch the pinned CC0 sample subset; verify every downloaded byte against retained hashes."""
import pathlib,json,urllib.request,hashlib,concurrent.futures
folders=[pathlib.Path('art/music-faithful-v1/samples'),pathlib.Path('art/music-faithful-v2/samples')]
def fetch(item):
 folder,record=item;target=folder/record['file'];data=target.read_bytes()if target.exists()else urllib.request.urlopen(record['source']).read()
 if hashlib.sha256(data).hexdigest()!=record['sha256']:raise ValueError('Sample hash mismatch: '+str(target))
 if not target.exists():target.write_bytes(data)
 return len(data)
items=[(folder,r)for folder in folders for r in json.loads((folder/'sources.json').read_text())]
with concurrent.futures.ThreadPoolExecutor(max_workers=5)as ex:sizes=list(ex.map(fetch,items))
print(len(sizes),'verified source files;',sum(sizes),'bytes')
