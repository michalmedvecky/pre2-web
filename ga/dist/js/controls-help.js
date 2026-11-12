// Player numbers own magic/run aliases; the selected logical device owns
// movement/attack/jump. Keep the help consistent when Options swaps devices.
import {ACTION_LABELS,DEFAULT_KEYS,DEFAULT_PADS,describe,keyLabel,padLabel} from './bindings.js';
// Web-only 'custom' and 'gamepad' devices list the player's own saved table.
function modernControls(index,device,players,bindings){
  const custom=device==='custom',table=custom?(bindings?.keys?.[index]||DEFAULT_KEYS[index]):(bindings?.pads?.[index]||DEFAULT_PADS[index]),label=custom?keyLabel:padLabel;
  const show=action=>describe(table[action],label),p1=index===0;
  const controls={index,device,active:p1||players===2,label:custom?'Vlastní klávesy · webová verze':'Gamepad · webová verze',
    movement:!custom&&['up','down','left','right'].every(a=>table[a].join()===DEFAULT_PADS[index][a].join())?'D-pad nebo levá páčka':['up','left','right','down'].map(a=>`${ACTION_LABELS[a]} ${show(a)}`).join('; '),attack:show('attack'),jump:show('jump'),magic:show('magic'),run:show('run'),
    runNote:'Dvakrát rychle stejný vodorovný směr, druhý stisk drž; nebo drž Běh se směrem. Přiřazení změníš v hlavním menu → Controls.'};
  if(!custom){controls.magic+=p1?' / pravý Shift / L':' / levý Shift';controls.run+=p1?' / R':' / F';controls.runNote+=' Start pozastaví hru.';}
  return controls;
}
export function playerControls(index,device='keypad',players=1,bindings=null) {
  if(device==='custom'||device==='gamepad')return modernControls(index,device,players,bindings);
  const p1=index===0,keyboard=['keypad','keyboard'].includes(device);
  const controls={index,device,active:p1||players===2,magic:p1?'pravý Shift / L':'levý Shift',run:p1?'R':'F'};
  if(device==='keypad')Object.assign(controls,{label:'Keypad · numerická klávesnice',movement:'Num 7 8 9 / 4 · 6 / 1 2 3',attack:'Num 5',jump:'Insert'});
  else if(device==='keyboard')Object.assign(controls,{label:'Keyboard · písmenová klávesnice',movement:'Q W E / A · D / Z X C',attack:'S',jump:'Tab'});
  else if(device==='mouse')Object.assign(controls,{label:'Mouse · myš',movement:'Pohyb myši nad hrou; tlačítko Zachytit myš je v Options.',attack:'levé tlačítko myši',jump:'pravé tlačítko myši'});
  else Object.assign(controls,{label:device==='joystick2'?'Joystick 2 · druhý gamepad':'Joystick 1 · první gamepad',movement:'Páčka; kalibrace je v Options.',attack:'tlačítko 1',jump:'tlačítko 2'});
  if(p1&&keyboard){controls.movement+='; také šipky';controls.attack+=' / J';controls.jump+=' / K';}
  if(p1&&device==='keypad'&&players===1)controls.movement+=' nebo WASD';
  controls.runNote=keyboard?'Dvakrát rychle stejný vodorovný směr, druhý stisk drž.':device==='mouse'?'Rychlejší vodorovný pohyb myši při stejném směru.':'Vychyl páčku více vlevo/vpravo ve směru pohybu.';
  return controls;
}

export function createControlsHelp({getSettings,getBindings=()=>null,onOpen=()=>null,onClose=()=>{}}) {
  const dialog=document.createElement('dialog');dialog.className='controls-dialog';dialog.setAttribute('aria-labelledby','controls-title');
  dialog.innerHTML=`<div class="controls-card"><header class="controls-heading"><div><p class="controls-eyebrow">GOLDEN AXE</p><h2 id="controls-title">Ovládání a bojové kombinace</h2></div><button data-controls-close class="controls-close" aria-label="Zavřít přehled ovládání">Zavřít <span aria-hidden="true">×</span></button></header><div class="controls-body" tabindex="0"><p class="controls-intro">Nastavení odpovídá aktuální volbě v Options. Pohyb nahoru a dolů mění hloubku herní plochy; nejde o přikrčení.</p><div class="controls-players"></div><section><h3>Kombinace při boji pěšky</h3><p>ÚTOK a SKOK níže znamenají tlačítka příslušného hráče uvedená výše. Každý nový úder vyžaduje nový stisk; pouhé držení útoku není automatická série. Příklady kláves níže platí pro výchozí P1 Keypad a P2 Keyboard; při jiné volbě použij aktuální tlačítka z přehledu výše.</p><dl class="controls-combos"><dt>Běh</dt><dd>Dvakrát rychle stiskni stejný směr vlevo/vpravo a druhý stisk drž. Ve webové verzi lze také držet <kbd>R</kbd> (hráč 1) nebo <kbd>F</kbd> (hráč 2) současně se směrem.</dd><dt>Skok z běhu</dt><dd>Rozběhni se a stiskni SKOK. P1: <kbd>R</kbd> + <kbd>→</kbd> + <kbd>K</kbd>. P2 s výchozím Keyboard: <kbd>F</kbd> + <kbd>D</kbd> + <kbd>Tab</kbd>. Jde o vyšší původní skok potřebný například pro první vysoký schod ve stage 4.</dd><dt>Útok z běhu</dt><dd>Za běhu stiskni ÚTOK. Podle hrdiny provedeš náraz, kop nebo úder hlavou. P1: <kbd>R</kbd> + směr + <kbd>J</kbd>; P2 s výchozím Keyboard: <kbd>F</kbd> + směr + <kbd>S</kbd>.</dd><dt>Speciální útok</dt><dd>Ze stoje nebo chůze stiskni ÚTOK a SKOK současně. P1: <kbd>J</kbd> + <kbd>K</kbd>; P2 s výchozím Keyboard: <kbd>S</kbd> + <kbd>Tab</kbd>.</dd><dt>Útok ve vzduchu</dt><dd>Stiskni SKOK a krátce poté ÚTOK. Také po skoku z běhu lze ve vzduchu zaútočit. Podoba a dosah úderu závisí na postavě a fázi skoku.</dd><dt>Série a útok zblízka</dt><dd>Opakovaně mačkej ÚTOK u soupeře. Dokončení série a úder z těsné blízkosti volí původní pravidla podle vzdálenosti a stavu protivníka.</dd></dl><p>Na zvířeti používáš stejné směry, ÚTOK a SKOK; pozemní kombinace se na jezdce nevztahují. Magie vyžaduje nasbírané lahvičky.</p></section><section><h3>Telefon a tablet</h3><p>Dotykové ovládání patří hráči 1. Směrová tlačítka ovládají pohyb v obou osách. Tap na plochu ÚTOK zaútočí, swipe nahoru skočí a swipe dolů znamená pohyb dolů v herní ploše. Samostatná tlačítka SKOK a MAGIE umožňují kombinace. Pro skok z běhu drž <strong>BĚH + směr</strong> a klepni na <strong>SKOK</strong>. Dva samostatné dotykové ovladače na jednom telefonu zatím nejsou součástí hry.</p></section><section><h3>Pauza, zvuk a testovací cheaty</h3><dl class="controls-combos"><dt>Pauza</dt><dd><kbd>Mezerník</kbd> nebo <kbd>Esc</kbd>; tlačítko Ⅱ na obrazovce. V tomto přehledu <kbd>Esc</kbd> zavře pouze nápovědu.</dd><dt>Zvuk</dt><dd><kbd>F2</kbd> efekty zap/vyp, <kbd>F3</kbd> hudba zap/vyp. Tlačítko ♪ ztlumí nebo obnoví všechen zvuk. <kbd>MUSIC</kbd> vybírá původní hudbu nebo remaster; při prvním použití se skladba stahuje.</dd><dt>Cheaty</dt><dd>Piš postupně <kbd>HD</kbd> pro grafiku, <kbd>IDDQD</kbd> pro nezranitelnost, <kbd>MAP</kbd> pro mapu a přesun kliknutím, <kbd>LEVEL</kbd> pro výběr původní úrovně. Na telefonu jsou jejich tlačítka v pauze. Při otevřené nápovědě se cheaty nezadávají.</dd></dl><p class="controls-origin">Původní klávesy a kombinace jsou zachované. Šipky/J/K/L pro hráče 1, R/F pro snadnější rozběh, dotykové ovládání a cheaty jsou doplňky webové verze. Přehled nerozšiřuje původní bojové mechaniky.</p></section></div></div>`;
  document.querySelector('#game-shell').append(dialog);
  let saved=null,restoreFocus=null,disposed=false;
  function render(){const settings=getSettings(),players=settings.players===2?2:1;dialog.querySelector('.controls-players').replaceChildren(...[0,1].map(index=>{const row=playerControls(index,settings.devices?.[index]||(index?'keyboard':'keypad'),players,getBindings()),section=document.createElement('section');section.className='controls-player';section.dataset.helpPlayer=String(index);const title=document.createElement('h3');title.textContent=`Hráč ${index+1}${row.active?'':' · pro režim dvou hráčů'}`;const label=document.createElement('p');label.className='controls-device';label.textContent=row.label;const list=document.createElement('dl');for(const [name,value]of[['Pohyb',row.movement],['Útok',row.attack],['Skok',row.jump],['Magie',row.magic],['Snazší běh',`${row.run} + vlevo/vpravo`]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;list.append(dt,dd);}const note=document.createElement('p');note.className='controls-device-note';note.textContent=row.runNote;section.append(title,label,list,note);return section;}));}
  function open(){if(disposed)return false;if(dialog.open)return true;render();restoreFocus=document.activeElement;saved=onOpen();dialog.showModal();dialog.querySelector('.controls-body').scrollTop=0;dialog.querySelector('[data-controls-close]').focus({preventScroll:true});return true;}
  function close({restore=true}={}){if(!dialog.open)return;dialog.close();const snapshot=saved;saved=null;const target=onClose(snapshot,{restore})||restoreFocus;if(restore&&target?.isConnected)target.focus({preventScroll:true});}
  dialog.querySelector('[data-controls-close]').addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(['F2','F3','F4','F5'].includes(event.code))event.preventDefault();
    if(event.code==='Escape'){event.preventDefault();close();return;}
    if(event.code==='Tab'){
      const items=[...dialog.querySelectorAll('button,[tabindex="0"]')],first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  dialog.addEventListener('keyup',event=>event.stopPropagation());
  const buttons=[...document.querySelectorAll('[data-open-controls]')],click=()=>open();for(const button of buttons)button.addEventListener('click',click);
  return{open,close,get isOpen(){return dialog.open;},dispose(){if(disposed)return;close({restore:false});disposed=true;for(const button of buttons)button.removeEventListener('click',click);dialog.remove();}};
}
