import json,struct,zlib,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'art/ai-upscale-v1';j=json.loads((root/'dist/assets/game.json').read_text());data=(root/'dist/assets/sprites.idx').read_bytes();tables=(root/'dist/assets/tables.bin').read_bytes();pal=j['palettes'][0]['rgb8_scaled']
def word(p):return int.from_bytes(tables[p:p+2],'little')
def signed(p):return int.from_bytes(tables[p:p+2],'little',signed=True)
def png(path,w,h,rgba):
 def chunk(k,b):return struct.pack('>I',len(b))+k+b+struct.pack('>I',zlib.crc32(k+b)&0xffffffff)
 raw=b''.join(b'\0'+rgba[y*w*4:(y+1)*w*4] for y in range(h));path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
def reference(name,sprite,club=False):
 w=h=64;pixels=bytearray(w*h*4);records=[]
 def draw(id,x,y):
  s=j['sprites'][id];records.append({'sprite':id,'anchor':[x,y]});left=x-s['originX'];top=y+s['originY']-s['height']
  for yy in range(s['height']):
   for xx in range(s['width']):
    v=data[s['pixelOffset']+yy*s['width']+xx]
    if v and 0<=left+xx<w and 0<=top+yy<h:
     p=((top+yy)*w+left+xx)*4;pixels[p:p+4]=bytes(pal[v*3:v*3+3]+[255])
 draw(sprite,32,52)
 if club:
  ptr=word(0x7b00)
  for i in range(64):
   p=ptr+i*8
   if word(p)==0x55aa:break
   if word(p)==sprite:
    draw(word(p+2)&8191,32-signed(p+4),52-signed(p+6));break
 png(out/(name+'-original-native.png'),w,h,pixels)
 scale=8;enlarged=bytearray(w*h*scale*scale*4)
 for y in range(h*scale):
  for x in range(w*scale):
   p=(y*w*scale+x)*4;q=((y//scale)*w+x//scale)*4;enlarged[p:p+4]=pixels[q:q+4]
 png(out/(name+'-reference-8x.png'),w*scale,h*scale,enlarged)
 return records
m={'prehistorik':reference('prehistorik',34,True),'bear':reference('bear',313),'palette':0,'nativeCanvas':[64,64],'referenceScale':8,'sourceHashes':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [root/'dist/assets/game.json',root/'dist/assets/sprites.idx',root/'dist/assets/tables.bin']},'purpose':'Unmodified original indexed pixels, exported for imagegen edit references; transparent index 0.'}
(out/'sources.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps(m,indent=2))
