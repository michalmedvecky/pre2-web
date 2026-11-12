// Web-edition remappable controls. These are additions beside the original DOS
// devices (keypad/keyboard/joystick/mouse), which remain unchanged and default.
// 'custom' = this player's own keyboard table, 'gamepad' = a modern Gamepad API
// pad (standard mapping) with this player's own button table.
export const ACTIONS=['up','down','left','right','attack','jump','magic','run'];
export const ACTION_LABELS={up:'Nahoru',down:'Dolů',left:'Vlevo',right:'Vpravo',attack:'Útok',jump:'Skok',magic:'Magie',run:'Běh (držet)'};
export const MODERN_DEVICES=[{id:'custom',label:'Vlastní klávesy'},{id:'gamepad',label:'Gamepad'}];
export const MODERN_IDS=MODERN_DEVICES.map(d=>d.id);
export const STORAGE_KEY='ga.bindings.v1';
export const DEVICES_KEY='ga.devices.v1';
// Defaults mirror the existing web layout so nothing feels new until changed:
// P1 arrows + J/K/L + R, P2 the original second-player letters + Tab/Shift/F.
export const DEFAULT_KEYS=Object.freeze([
  {up:['ArrowUp'],down:['ArrowDown'],left:['ArrowLeft'],right:['ArrowRight'],attack:['KeyJ'],jump:['KeyK'],magic:['KeyL','ShiftRight'],run:['KeyR']},
  {up:['KeyW'],down:['KeyX'],left:['KeyA'],right:['KeyD'],attack:['KeyS'],jump:['Tab'],magic:['ShiftLeft'],run:['KeyF']},
]);
// Standard Gamepad mapping: b0 A/Cross, b1 B/Circle, b2 X/Square, b3 Y/Triangle,
// b5 RB/R1, b12-15 D-pad, a0/a1 left stick. b9 Start is reserved for pause.
const DEFAULT_PAD={up:['b12','a1-'],down:['b13','a1+'],left:['b14','a0-'],right:['b15','a0+'],attack:['b2'],jump:['b0'],magic:['b3'],run:['b5']};
export const DEFAULT_PADS=Object.freeze([DEFAULT_PAD,DEFAULT_PAD]);
export const PAD_START='b9';
export const AXIS_THRESHOLD=0.5;
// Keys that keep their global meaning (pause, start, audio, browser) and cannot be bound.
export const RESERVED_KEYS=new Set(['Escape','Space','Enter','NumpadEnter','MetaLeft','MetaRight','ContextMenu',...Array.from({length:12},(_,i)=>`F${i+1}`)]);
const KEY_PATTERN=/^[A-Za-z][A-Za-z0-9]{0,31}$/,PAD_PATTERN=/^(b\d{1,2}|a\d{1,2}[+-])$/;
const clone=table=>Object.fromEntries(ACTIONS.map(a=>[a,[...table[a]]]));
export const defaultBindings=()=>({keys:DEFAULT_KEYS.map(clone),pads:DEFAULT_PADS.map(clone)});

function cleanTable(table,fallback,valid){
  if(!table||typeof table!=='object')return clone(fallback);
  return Object.fromEntries(ACTIONS.map(action=>{
    const list=table[action];
    if(!Array.isArray(list))return[action,[...fallback[action]]];
    return[action,[...new Set(list.filter(valid))].slice(0,4)];
  }));
}
export function sanitizeBindings(raw){
  const keyOk=code=>typeof code==='string'&&KEY_PATTERN.test(code)&&!RESERVED_KEYS.has(code);
  const padOk=token=>typeof token==='string'&&PAD_PATTERN.test(token)&&token!==PAD_START;
  return{keys:[0,1].map(i=>cleanTable(raw?.keys?.[i],DEFAULT_KEYS[i],keyOk)),pads:[0,1].map(i=>cleanTable(raw?.pads?.[i],DEFAULT_PADS[i],padOk))};
}
export function isBindableKey(code){return typeof code==='string'&&KEY_PATTERN.test(code)&&!RESERVED_KEYS.has(code);}

export function keyActions(table,code){const actions=[];for(const action of ACTIONS)if(table?.[action]?.includes(code))actions.push(action);return actions;}

function tokenActive(pad,token,threshold=AXIS_THRESHOLD){
  if(token[0]==='b'){const button=pad.buttons?.[Number(token.slice(1))];return !!(button&&(button.pressed||button.value>0.5));}
  const value=pad.axes?.[Number(token.slice(1,-1))]||0;return token.endsWith('-')?value<=-threshold:value>=threshold;
}
// Current action state of one pad under one player's table.
export function readPad(pad,table){
  const state=Object.fromEntries(ACTIONS.map(a=>[a,false]));
  if(!pad)return state;
  for(const action of ACTIONS)state[action]=(table?.[action]||[]).some(token=>tokenActive(pad,token));
  // Opposing directions (stick jitter plus D-pad) cancel to neutral, like a centred stick.
  if(state.left&&state.right)state.left=state.right=false;
  if(state.up&&state.down)state.up=state.down=false;
  return state;
}
export const padStartPressed=pad=>!!pad&&tokenActive(pad,PAD_START);
// First newly active token compared to a baseline snapshot (for capture).
export function snapshotPad(pad){return{buttons:Array.from(pad?.buttons||[],b=>!!(b?.pressed||b?.value>0.5)),axes:Array.from(pad?.axes||[],v=>v||0)};}
export function detectPadToken(pad,baseline,threshold=0.6){
  if(!pad)return null;
  const buttons=pad.buttons||[];
  for(let i=0;i<buttons.length;i++){const down=!!(buttons[i]?.pressed||buttons[i]?.value>0.5);if(down&&!baseline?.buttons?.[i])return`b${i}`;}
  const axes=pad.axes||[];
  for(let i=0;i<axes.length;i++){const v=axes[i]||0,rest=Math.abs(baseline?.axes?.[i]||0)<0.3;if(rest&&Math.abs(v)>=threshold)return`a${i}${v<0?'-':'+'}`;}
  return null;
}
// Pads for players using the modern 'gamepad' device, in connection order,
// skipping pads already claimed by an original Joystick 1/2 device.
export function assignPads(devices,pads,legacyIndices=[null,null]){
  const connected=Array.from(pads||[]).filter(p=>p&&p.connected!==false);
  const claimed=new Set();
  devices.forEach(device=>{if(device==='joystick1'||device==='joystick2'){const port=device==='joystick1'?0:1,index=legacyIndices[port]??connected[port]?.index;if(index!=null)claimed.add(index);}});
  const free=connected.filter(p=>!claimed.has(p.index));let next=0;
  return devices.map(device=>device==='gamepad'?free[next++]||null:null);
}

const KEY_NAMES={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'levý Shift',ShiftRight:'pravý Shift',ControlLeft:'levý Ctrl',ControlRight:'pravý Ctrl',AltLeft:'levý Alt',AltRight:'pravý Alt',Backquote:'`',Backslash:'\\',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backspace:'Backspace',Tab:'Tab',CapsLock:'Caps Lock',Insert:'Insert',Delete:'Delete',Home:'Home',End:'End',PageUp:'Page Up',PageDown:'Page Down',IntlBackslash:'< >',NumpadAdd:'Num +',NumpadSubtract:'Num -',NumpadMultiply:'Num *',NumpadDivide:'Num /',NumpadDecimal:'Num ,'};
export function keyLabel(code){
  if(KEY_NAMES[code])return KEY_NAMES[code];
  if(/^Key[A-Z]$/.test(code))return code.slice(3);
  if(/^Digit\d$/.test(code))return code.slice(5);
  if(/^Numpad\d$/.test(code))return'Num '+code.slice(6);
  return code;
}
const BUTTON_NAMES=['A','B','X','Y','LB','RB','LT','RT','Select','Start','L3','R3','D-pad ↑','D-pad ↓','D-pad ←','D-pad →','Home'];
const AXIS_NAMES=[['levá páčka ←','levá páčka →'],['levá páčka ↑','levá páčka ↓'],['pravá páčka ←','pravá páčka →'],['pravá páčka ↑','pravá páčka ↓']];
export function padLabel(token){
  if(token[0]==='b'){const n=Number(token.slice(1));return BUTTON_NAMES[n]||`tlačítko ${n}`;}
  const n=Number(token.slice(1,-1)),dir=token.endsWith('-')?0:1;return AXIS_NAMES[n]?.[dir]||`osa ${n}${token.endsWith('-')?'−':'+'}`;
}
export const describe=(list,label)=>list?.length?list.map(label).join(' / '):'—';

export class BindingStore{
  constructor(storage=safeStorage()){this.storage=storage;this.listeners=new Set();let raw=null;try{raw=JSON.parse(this.storage?.getItem(STORAGE_KEY)||'null');}catch{}const clean=sanitizeBindings(raw);this.keys=clean.keys;this.pads=clean.pads;}
  table(kind,player){return(kind==='pads'?this.pads:this.keys)[player];}
  set(kind,player,action,list){if(!ACTIONS.includes(action)||![0,1].includes(player))throw new RangeError('Unknown binding.');const clean=sanitizeBindings({[kind]:{[player]:{...this.table(kind,player),[action]:list}}});this.table(kind,player)[action]=clean[kind][player][action];this.save();}
  reset(player){this.keys[player]=clone(DEFAULT_KEYS[player]);this.pads[player]=clone(DEFAULT_PADS[player]);this.save();}
  save(){try{this.storage?.setItem(STORAGE_KEY,JSON.stringify({keys:this.keys,pads:this.pads}));}catch{}for(const fn of this.listeners)fn();}
  onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  // Same key bound to several actions of one player, or shared with the other player's table.
  keyConflicts(player,otherUses=()=>false){const out=new Set(),seen=new Map();for(const action of ACTIONS)for(const code of this.keys[player][action]){if(seen.has(code)&&seen.get(code)!==action)out.add(code);seen.set(code,action);if(otherUses(code))out.add(code);}return out;}
}
function safeStorage(){try{return globalThis.localStorage||null;}catch{return null;}}
// Saved device choice; invalid/duplicate original devices fall back to the original defaults.
export function loadDevices(validIds,storage=safeStorage()){
  try{const list=JSON.parse(storage?.getItem(DEVICES_KEY)||'null');if(Array.isArray(list)&&list.length===2&&list.every(d=>validIds.includes(d))&&(list[0]!==list[1]||MODERN_IDS.includes(list[0])))return list;}catch{}
  return null;
}
export function saveDevices(devices,storage=safeStorage()){try{storage?.setItem(DEVICES_KEY,JSON.stringify(devices));}catch{}}

// Menu navigation from any connected pad (standard mapping): D-pad/left stick,
// A (plus the player's bound attack/jump) confirms, B goes back. Edge-triggered;
// the first sight of a pad only records its state so a held button never fires.
export const MENU_PAD={up:['b12','a1-'],down:['b13','a1+'],left:['b14','a0-'],right:['b15','a0+'],confirm:['b0'],back:['b1']};
export class MenuPad{
  constructor(){this.prev=new Map();}
  edges(pads,extraConfirm=[]){
    const confirm=[...new Set([...MENU_PAD.confirm,...extraConfirm])],table={...MENU_PAD,confirm,back:MENU_PAD.back.filter(t=>!confirm.includes(t))};
    const out=new Set(),seen=new Set();
    for(const pad of Array.from(pads||[])){
      if(!pad||pad.connected===false)continue;seen.add(pad.index);
      const state=Object.fromEntries(Object.entries(table).map(([action,tokens])=>[action,tokens.some(t=>tokenActive(pad,t))]));
      const prev=this.prev.get(pad.index);if(prev)for(const action in state)if(state[action]&&!prev[action])out.add(action);
      this.prev.set(pad.index,state);
    }
    for(const index of[...this.prev.keys()])if(!seen.has(index))this.prev.delete(index);
    return[...out];
  }
  reset(){this.prev.clear();}
}
// Move focus through visible, enabled controls of a container (for pad menus).
export function moveFocus(container,step){
  const items=[...container.querySelectorAll('button:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));
  if(!items.length)return null;
  const index=items.indexOf(document.activeElement),next=items[index<0?(step>0?0:items.length-1):(index+step+items.length)%items.length];
  next.focus({preventScroll:true});next.scrollIntoView?.({block:'nearest'});return next;
}
// Left/right on a focused <select> picks the previous/next enabled option.
export function stepSelect(select,step){
  const options=[...select.options];let index=select.selectedIndex;
  for(let n=0;n<options.length;n++){index=(index+step+options.length)%options.length;if(!options[index].disabled)break;}
  if(index===select.selectedIndex)return false;select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
