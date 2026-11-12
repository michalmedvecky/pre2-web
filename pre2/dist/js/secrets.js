// Hints use authored records and live discovery state; they never change the map.
export function secretTargets(w){
  const blocks=(w.blocks||[]).filter(b=>b.active),seen=new Set(),targets=[];
  for(const seed of blocks){if(seen.has(seed.index))continue;
    const cells=[],queue=[seed];seen.add(seed.index);
    while(queue.length){const b=queue.pop(),x=b.pos&255,y=b.pos>>8;cells.push({x:x*16,y:y*16});
      for(const n of blocks)if(!seen.has(n.index)&&Math.abs((n.pos&255)-x)<=1&&Math.abs((n.pos>>8)-y)<=1){seen.add(n.index);queue.push(n);}
    }
    targets.push({kind:'wall',label:'HIDDEN',x:cells.reduce((s,c)=>s+c.x+8,0)/cells.length,y:cells.reduce((s,c)=>s+c.y+8,0)/cells.length,cells});
  }
  const gates=new Set();
  for(const g of w.gates||[])if(g.active&&!gates.has(g.triggerTile)){gates.add(g.triggerTile);targets.push({kind:'passage',label:'DOWN',x:(g.triggerTile&255)*16+8,y:(g.triggerTile>>8)*16-12});}
  for(const i of w.items||[]){const s=i.sprite&8191;if(i.active&&(s===311||(s===279&&[2,6].includes(w.levelIndex))))targets.push({kind:'bonus',label:'BONUS',x:i.x,y:i.y-16});}
  return targets;
}

export function hintMarkers(w){
  const c=w.camera||{x:0,y:0};return secretTargets(w).map(t=>{
    const x=t.x-c.x,y=t.y-c.y,visible=x>=8&&x<312&&y>=20&&y<164;
    return {...t,x,y,visible,distance:Math.hypot(t.x-w.player.x,t.y-w.player.y),screenX:Math.max(8,Math.min(311,x)),screenY:Math.max(23,Math.min(161,y))};
  }).sort((a,b)=>a.distance-b.distance);
}
