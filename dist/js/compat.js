// Widths, order and constants follow the recovered 16-bit routines; no DOS code is executed.
export const u8 = x => x & 255;
export const u16 = x => x & 65535;
export const s8 = x => (x << 24) >> 24;
export const s16 = x => (x << 16) >> 16;
export const sar4 = x => s16(x) >> 4;
export const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export const TICK_HZ = 1193182 / (0x4000 * 3);
export const ADLIB_TICK_HZ = 1193182 / (0x8e * 128 * 3);
export const ACTIONS = [0,3,5,7,2,6,0,0,1,3,4,7,2,6,1,0,1,3,4,7,2,6,0,0,0,0,0,0,0,0,0,0];
export const JUMP = [-65,-51,-35,-20,-10,-5,-2,-1,0];
export const AWARDS = [10,20,30,50,60,70,75,80,100,200,500,800,1000,2000,3000,6000,10000];
export class Random {
  constructor(a=5,b=0x22,c=0x86,w=0xe58d,secondary=0) {Object.assign(this,{a,b,c,w,secondary});}
  next(){this.w=u16(this.w+this.a);this.a=u8(this.a+3+(this.w>>8));this.b=u8(2*u8(this.b+this.c)+this.a);this.c^=this.a^this.b;return this.b;}
  word(){this.secondary=u16(this.secondary+0x9248);this.secondary=(this.secondary>>>3)|((this.secondary&7)<<13);return this.secondary;}
}
export class Demo {
  constructor(bytes){this.bytes=bytes;this.cursor=0;this.repeat=0;this.mask=0;this.done=false;}
  next(){if(this.done)return 0;if(this.repeat){this.repeat--;return this.mask;}let p=this.cursor;if(p+1>=this.bytes.length-2||this.bytes[p]===0xaa&&this.bytes[p+1]===0x55){this.done=true;return 0;}this.mask=this.bytes[p];this.repeat=this.bytes[p+1];this.cursor+=2;return this.mask;}
}
export function encodeReplay(masks){const out=[];for(const mask of masks){const m=mask&63;if(out.length&&out[out.length-2]===m&&out[out.length-1]<255)out[out.length-1]++;else out.push(m,0);}out.push(0xaa,0x55);return new Uint8Array(out);}
// Shipped demo bit order: left,right,up,down,attack,look.
export function inputFromMask(m){return {left:!!(m&1),right:!!(m&2),up:!!(m&4),down:!!(m&8),attack:!!(m&16),look:!!(m&32)};}
export function inputMask(i){return +!!i.left|(+!!i.right<<1)|(+!!i.up<<2)|(+!!i.down<<3)|(+!!i.attack<<4)|(+!!i.look<<5);}
export function actionIndex(i){return (+!!i.right<<4)|(+!!i.left<<3)|(+!!i.up<<2)|(+!!i.down<<1)|+!!i.attack;}
// Virtual ROM/CPU profile: deterministic, portable browser password compatibility.
export const PASSWORD_PROFILE = {salt:0x20,rotate:3};
export function passwordFor(level,expert=false){let x=u16(((level+(expert?10:0))^0x55a3)*PASSWORD_PROFILE.salt);return u16((x<<3)|(x>>>13)).toString(16).toUpperCase().padStart(4,'0');}
export function parsePassword(code){for(let e=0;e<2;e++)for(let l=0;l<10;l++)if(passwordFor(l,!!e)===code.toUpperCase())return {level:l,expert:!!e};return null;}
export function fnv1a(values){let h=2166136261;for(const n of values){h=Math.imul(h^(n&255),16777619);h=Math.imul(h^((n>>8)&255),16777619);h=Math.imul(h^((n>>16)&255),16777619);h=Math.imul(h^((n>>24)&255),16777619);}return(h>>>0).toString(16).padStart(8,'0');}
