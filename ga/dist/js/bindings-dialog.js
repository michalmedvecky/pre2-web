import {ACTIONS,ACTION_LABELS,MenuPad,PAD_START,describe,detectPadToken,isBindableKey,keyLabel,moveFocus,padLabel,snapshotPad} from './bindings.js';

// Remapping dialog for the web-only 'custom' keyboard and 'gamepad' devices.
// Click a cell, then press a key / pad input. Esc or Start cancels, Backspace
// or Delete clears the cell. Every change is saved immediately.
export function createBindingsDialog({store,getGamepads,getDevices,otherKeyUses=()=>false,onPadBound=()=>'',onOpen=()=>null,onClose=()=>{}}) {
  const dialog=document.createElement('dialog');dialog.className='controls-dialog bindings-dialog';dialog.setAttribute('aria-labelledby','bindings-title');
  dialog.innerHTML=`<div class="controls-card"><header class="controls-heading"><div><p class="controls-eyebrow">GOLDEN AXE · WEBOVÁ VERZE</p><h2 id="bindings-title">Přemapování ovládání</h2></div><button data-bindings-close class="controls-close" aria-label="Zavřít přemapování">Zavřít <span aria-hidden="true">×</span></button></header><div class="controls-body" tabindex="0"><p class="controls-intro">Platí pro zařízení <strong>Vlastní klávesy</strong> a <strong>Gamepad</strong>, které vybereš hráči v Options. Tento přehled otevřeš v hlavním menu položkou Controls. Původní Keypad, Keyboard, Joystick a Mouse zůstávají beze změny. Klikni na pole a stiskni klávesu nebo tlačítko gamepadu. <kbd>Esc</kbd> nebo Start zruší, <kbd>Backspace</kbd> pole vymaže. Gamepadem se v přehledu pohybuješ D-padem, A vybere pole a B zavře. Nastavení se ukládá v tomto prohlížeči.</p><p class="bindings-status" role="status" aria-live="polite"></p><div class="controls-players bindings-players"></div><p class="controls-origin">Mezerník a Esc pozastavují, Enter potvrzuje a F1–F12 mají vlastní funkce, proto je nelze přiřadit. Start na gamepadu pozastavuje hru a v nabídce potvrzuje. Pozor, písmena mohou zároveň tvořit cheaty (HD, MAP, LEVEL, IDDQD, MUSIC).</p></div></div>`;
  document.querySelector('#game-shell').append(dialog);
  const status=dialog.querySelector('.bindings-status'),players=dialog.querySelector('.bindings-players');
  let capture=null,saved=null,restoreFocus=null,disposed=false,raf=0;const menuPad=new MenuPad();

  const connectedPads=()=>{try{return Array.from(getGamepads()||[]).filter(p=>p&&p.connected!==false);}catch{return[];}};
  function padSummary(){const pads=connectedPads();return pads.length?`Připojené gamepady: ${pads.map((p,i)=>`${i+1}. ${p.id.replace(/\s*\(.*$/,'').slice(0,40)}`).join(', ')}.`:'Žádný gamepad zatím není vidět. Stiskni na něm libovolné tlačítko.';}
  function render(){
    const devices=getDevices();
    players.replaceChildren(...[0,1].map(player=>{
      const section=document.createElement('section');section.className='controls-player bindings-player';section.dataset.bindingsPlayer=String(player);
      const title=document.createElement('h3');title.textContent=`Hráč ${player+1}`;
      const using=document.createElement('p');using.className='controls-device';const device=devices[player];
      using.textContent=device==='custom'?'Nyní používá: Vlastní klávesy':device==='gamepad'?'Nyní používá: Gamepad':'Nyní používá původní zařízení. Vlastní klávesy nebo Gamepad vyber v Options.';
      const conflicts=store.keyConflicts(player,code=>otherKeyUses(code,player));
      const grid=document.createElement('div');grid.className='bindings-grid';grid.setAttribute('role','table');grid.setAttribute('aria-label',`Hráč ${player+1} přiřazení`);
      const head=(text)=>{const el=document.createElement('span');el.className='bindings-head';el.setAttribute('role','columnheader');el.textContent=text;return el;};
      grid.append(head('Akce'),head('Klávesnice'),head('Gamepad'));
      for(const action of ACTIONS){
        const name=document.createElement('span');name.className='bindings-action';name.setAttribute('role','rowheader');name.textContent=ACTION_LABELS[action];grid.append(name);
        for(const kind of['keys','pads']){
          const list=store.table(kind,player)[action],button=document.createElement('button');button.className='bindings-cell';button.dataset.kind=kind;button.dataset.player=String(player);button.dataset.action=action;
          const active=capture&&capture.kind===kind&&capture.player===player&&capture.action===action;
          button.textContent=active?(kind==='keys'?'Stiskni klávesu…':'Stiskni na gamepadu…'):describe(list,kind==='keys'?keyLabel:padLabel);
          button.classList.toggle('capturing',!!active);
          const clash=kind==='keys'&&list.some(code=>conflicts.has(code));button.classList.toggle('conflict',clash);
          button.setAttribute('aria-label',`Hráč ${player+1}, ${ACTION_LABELS[action]}, ${kind==='keys'?'klávesnice':'gamepad'}: ${button.textContent}${clash?', koliduje':''}`);
          button.addEventListener('click',()=>begin(kind,player,action));grid.append(button);
        }
      }
      const note=document.createElement('p');note.className='controls-device-note';note.textContent=conflicts.size?`Kolize: ${[...conflicts].map(keyLabel).join(', ')} je přiřazeno více akcím nebo to používá druhý hráč.`:'Bez kolizí kláves.';note.classList.toggle('bindings-warning',conflicts.size>0);
      const reset=document.createElement('button');reset.className='secondary bindings-reset';reset.textContent=`Obnovit výchozí pro hráče ${player+1}`;reset.addEventListener('click',()=>{cancel();store.reset(player);status.textContent=`Hráč ${player+1}: výchozí ovládání obnoveno.`;render();});
      section.append(title,using,grid,note,reset);return section;
    }));
    if(!capture)status.textContent||=padSummary();
  }
  function focusCell(){dialog.querySelector(`.bindings-cell[data-kind="${capture?.kind}"][data-player="${capture?.player}"][data-action="${capture?.action}"]`)?.focus({preventScroll:true});}
  function begin(kind,player,action){
    cancel(false);
    const pads=connectedPads();
    capture={kind,player,action,baselines:new Map(pads.map(p=>[p.index,snapshotPad(p)]))};
    status.textContent=kind==='keys'?`Hráč ${player+1} · ${ACTION_LABELS[action]}: stiskni klávesu.`:`Hráč ${player+1} · ${ACTION_LABELS[action]}: stiskni tlačítko nebo vychyl páčku. ${pads.length?'':'Gamepad zatím není vidět. Stiskni na něm tlačítko.'}`;
    render();focusCell();
  }
  function finish(list,message){const current=capture;capture=null;store.set(current.kind,current.player,current.action,list);const switched=current.kind==='pads'&&list.length?onPadBound(current.player):'';status.textContent=switched?`${message} ${switched}`:message;render();dialog.querySelector(`.bindings-cell[data-kind="${current.kind}"][data-player="${current.player}"][data-action="${current.action}"]`)?.focus({preventScroll:true});}
  function cancel(announce=true){if(!capture)return;const current=capture;capture=null;if(announce){status.textContent='Přiřazení zrušeno.';render();dialog.querySelector(`.bindings-cell[data-kind="${current.kind}"][data-player="${current.player}"][data-action="${current.action}"]`)?.focus({preventScroll:true});}}
  // Gamepad capture and pad-only cancel run every frame while the dialog is open.
  function poll(){
    if(!dialog.open)return;
    const pads=connectedPads();
    if(capture){
      for(const pad of pads){
        if(!capture.baselines.has(pad.index)){capture.baselines.set(pad.index,snapshotPad(pad));continue;}
        const token=detectPadToken(pad,capture.baselines.get(pad.index));
        if(!token)continue;
        if(token===PAD_START){cancel();break;}
        if(capture.kind==='pads'){finish([token],`Hráč ${capture.player+1} · ${ACTION_LABELS[capture.action]}: ${padLabel(token)}.`);break;}
        capture.baselines.set(pad.index,snapshotPad(pad));
      }
      menuPad.reset();
    }else{
      // Pad navigation: D-pad/stick moves, A activates, B closes.
      for(const action of menuPad.edges(pads)){
        if(action==='back'){close();return;}
        const el=dialog.contains(document.activeElement)?document.activeElement:null;
        if(action==='confirm'){if(el?.tagName==='BUTTON')el.click();else moveFocus(dialog,1);continue;}
        if(el?.classList.contains('bindings-cell')&&(action==='up'||action==='down')){const cells=[...dialog.querySelectorAll(`.bindings-cell[data-player="${el.dataset.player}"][data-kind="${el.dataset.kind}"]`)],next=cells[cells.indexOf(el)+(action==='down'?1:-1)];if(next){next.focus({preventScroll:true});next.scrollIntoView({block:'nearest'});continue;}}
        moveFocus(dialog,action==='down'||action==='right'?1:-1);
      }
    }
    raf=requestAnimationFrame(poll);
  }
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(capture?.kind==='keys'){
      event.preventDefault();if(event.repeat)return;
      if(event.code==='Escape'){cancel();return;}
      if(['Backspace','Delete'].includes(event.code)){finish([],`Hráč ${capture.player+1} · ${ACTION_LABELS[capture.action]}: vymazáno.`);return;}
      if(!isBindableKey(event.code)){status.textContent=`${keyLabel(event.code)} má vlastní funkci a nelze ji přiřadit. Zkus jinou klávesu.`;return;}
      finish([event.code],`Hráč ${capture.player+1} · ${ACTION_LABELS[capture.action]}: ${keyLabel(event.code)}.`);return;
    }
    if(capture?.kind==='pads'){
      if(event.code==='Escape'){event.preventDefault();cancel();return;}
      if(['Backspace','Delete'].includes(event.code)){event.preventDefault();finish([],`Hráč ${capture.player+1} · ${ACTION_LABELS[capture.action]}: vymazáno.`);return;}
    }
    if(['F2','F3','F4','F5'].includes(event.code))event.preventDefault();
    if(event.code==='Escape'){event.preventDefault();close();return;}
    if(event.code==='Tab'){
      const items=[...dialog.querySelectorAll('button,[tabindex="0"]')],first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  dialog.addEventListener('keyup',event=>event.stopPropagation());
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(capture)cancel();else close();});
  dialog.querySelector('[data-bindings-close]').addEventListener('click',()=>close());
  function open(){if(disposed)return false;if(dialog.open)return true;restoreFocus=document.activeElement;saved=onOpen();status.textContent='';render();dialog.showModal();dialog.querySelector('.controls-body').scrollTop=0;dialog.querySelector('[data-bindings-close]').focus({preventScroll:true});menuPad.reset();raf=requestAnimationFrame(poll);return true;}
  function close({restore=true}={}){if(!dialog.open)return;capture=null;cancelAnimationFrame(raf);dialog.close();const snapshot=saved;saved=null;const target=onClose(snapshot,{restore})||restoreFocus;if(restore&&target?.isConnected)target.focus({preventScroll:true});}
  const buttons=[...document.querySelectorAll('[data-open-bindings]')],click=()=>open();for(const button of buttons)button.addEventListener('click',click);
  return{open,close,render,get isOpen(){return dialog.open;},get capturing(){return capture?{...capture,baselines:undefined}:null;},dispose(){if(disposed)return;close({restore:false});disposed=true;for(const button of buttons)button.removeEventListener('click',click);dialog.remove();}};
}
