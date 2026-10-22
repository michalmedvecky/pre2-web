// Resolve live XR gamepads at delivery time. Merge simultaneous cues so a small
// pickup/weapon pulse cannot cancel a head impact in the same animation frame.
export class HapticFeedback {
 constructor(){this.pending=new Map();this.active=new Map();this.stats={requests:0,delivered:0,failed:0,unsupported:0};}
 queue(value,ms,hand=null){for(const h of hand?[hand]:['left','right']){const old=this.pending.get(h);this.pending.set(h,{value:Math.max(old?.value||0,Math.min(1,value)),ms:Math.max(old?.ms||0,ms)});this.stats.requests++;}}
 flush(sources=[],time=performance.now()){for(const [hand,cue] of this.pending){const active=this.active.get(hand);if(active&&active.until>time&&active.value>cue.value)continue;this.active.set(hand,{value:cue.value,until:time+cue.ms});const source=Array.from(sources).find(s=>s.handedness===hand),pad=source?.gamepad;if(!pad){this.stats.unsupported++;continue;}
 const legacy=pad.vibrationActuator,actuators=Array.from(pad.hapticActuators||[]);const pulse=actuators.find(a=>typeof a?.pulse==='function')||(typeof legacy?.pulse==='function'?legacy:null);
 const fallback=()=>{if(typeof legacy?.playEffect!=='function'){this.stats.failed++;return;}try{Promise.resolve(legacy.playEffect('dual-rumble',{startDelay:0,duration:cue.ms,strongMagnitude:cue.value,weakMagnitude:cue.value})).then(r=>{if(r===false)this.stats.failed++;else this.stats.delivered++;},()=>this.stats.failed++);}catch{this.stats.failed++;}};
 if(pulse){try{Promise.resolve(pulse.pulse(cue.value,cue.ms)).then(ok=>{if(ok===false)fallback();else this.stats.delivered++;},fallback);}catch{fallback();}}
 else if(legacy?.playEffect)fallback();else this.stats.unsupported++;
 }this.pending.clear();}
 clear(){this.pending.clear();this.active.clear();}
}
