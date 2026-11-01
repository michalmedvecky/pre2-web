import {renderMapOverview,overviewPoint} from './hd-map-overview.js';
// Authorized MAP/IDDQD extensions. World validation and recovery stay in Simulation.
export function createMapOverlay({getGame,parent,onPause,onResume}={}) {
  if(typeof getGame!=='function')throw new TypeError('MAP requires getGame().');
  let panel=null,canvas,feedback,playerSelect,godButton,graphicsButton,restoreFocus,previouslyPaused=false,openedGame=null,openedSimulation=null,epoch=0,lastDraw=Promise.resolve(null),overview=null;
  const styles=document.createElement('style');
  styles.textContent=`
  .ga-map-overlay[hidden]{display:none!important}.ga-map-overlay{position:fixed;inset:0;z-index:1000;background:#080a0ff5;color:#fff;display:flex;flex-direction:column;gap:12px;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box;font:16px system-ui;overflow:auto}
  .ga-map-heading,.ga-map-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ga-map-heading h2{margin:0;flex:1}.ga-map-overlay button,.ga-map-overlay select{min-height:44px;padding:8px 14px;background:#242932;color:#fff;border:1px solid #87909c;border-radius:6px;font:inherit}.ga-map-overlay button:focus-visible,.ga-map-overlay select:focus-visible,.ga-map-overlay canvas:focus-visible{outline:3px solid #ffe06b;outline-offset:2px}.ga-map-overlay button[aria-pressed=true]{border-color:#ffe06b;color:#ffe06b}.ga-map-scroll{overflow:auto;max-height:65vh;border:1px solid #59616d;background:#000;flex-shrink:0}.ga-map-canvas{display:block;width:100%;height:auto;image-rendering:pixelated;touch-action:pan-x pan-y;cursor:crosshair}.ga-map-overlay p{margin:0;line-height:1.4}.ga-map-feedback{min-height:1.5em}.ga-map-overlay label{display:flex;align-items:center;gap:8px}
  `;
  document.head.append(styles);
  function message(text,error=false){if(feedback){feedback.textContent=text;feedback.style.color=error?'#ffb1a6':'#d7f3ff';}}
  function available(){const g=getGame();return !!(g?.started&&!g.sequence&&g.simulation?.state.status==='playing'&&g.simulation.state.players.some(p=>!p.removed&&!p.eliminated&&p.health>0)&&g.assets?.maps?.[String(g.simulation.state.stage).toLowerCase()]);}
  function pause(g){if(!previouslyPaused){if(onPause)onPause();else if(!g.paused)g.pause();}}
  function resume(g,simulation){if(!previouslyPaused&&g===getGame()&&g.simulation===simulation&&g.started&&g.simulation.state.status==='playing'){if(onResume)onResume();else if(g.paused)g.pause();}}
  function build(g){
    panel=document.createElement('section');panel.className='ga-map-overlay';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','ga-map-title');
    panel.innerHTML='<div class="ga-map-heading"><h2 id="ga-map-title">MAP</h2><button type="button" data-close>Zavřít mapu</button></div><p>Celá aktuální mapa. Kliknutím nebo tapnutím přesuň vybraného hráče na průchozí podlahu.</p><div class="ga-map-tools"><label>Hráč <select data-player></select></label><label>Zvětšení <select data-zoom><option value="1">Celá mapa</option><option value="2">2×</option><option value="4">4×</option></select></label><button type="button" data-god aria-pressed="false">IDDQD: vypnuto</button><button type="button" data-map-graphics>HD → originál</button></div><div class="ga-map-scroll"><canvas class="ga-map-canvas" tabindex="0" aria-label="Přehled aktuální mapy; pro přesun použijte kliknutí nebo tapnutí."></canvas></div><p>Modrá: hráč 1 · žlutá: hráč 2 · bílý rámeček: herní výřez.</p><p class="ga-map-feedback" role="status" aria-live="polite"></p>';
    (parent||g.renderer.canvas.closest('#game-shell')||document.body).append(panel);
    canvas=panel.querySelector('canvas');feedback=panel.querySelector('[role=status]');playerSelect=panel.querySelector('[data-player]');godButton=panel.querySelector('[data-god]');graphicsButton=panel.querySelector('[data-map-graphics]');
    panel.querySelector('[data-close]').addEventListener('click',close);
    godButton.addEventListener('click',toggleGodMode);
    graphicsButton.addEventListener('click',()=>{const g=openedGame;if(!g)return;if(g.graphics?.toggle)g.graphics.toggle();else g.renderer.setGraphicsMode(g.renderer.graphicsMode==='hd'?'original':'hd');draw();});
    panel.querySelector('[data-zoom]').addEventListener('change',event=>{canvas.style.width=`${Number(event.target.value)*100}%`;draw();});
    canvas.addEventListener('click',event=>{
      const current=getGame();if(current!==openedGame||!available()){message('Herní stav se změnil. Zavřete mapu a otevřete ji znovu.',true);return;}
      const rect=canvas.getBoundingClientRect(),map=current.assets.maps[String(current.simulation.state.stage).toLowerCase()],{x,y}=overviewPoint(rect,event.clientX,event.clientY,map.width*8,map.height*8);
      const result=current.simulation.teleport(Number(playerSelect.value),x,y);
      if(result.ok){message(`Hráč ${Number(playerSelect.value)+1}: přesun na ${result.x}, ${result.y}.`);draw();}
      else message(result.reason==='outside-map'?'Cíl je mimo mapu.':'Cíl není bezpečná průchozí podlaha.',true);
    });
    panel.addEventListener('keydown',event=>{
      if(event.code==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
      if(event.code==='Tab'){
        const items=[...panel.querySelectorAll('button,select,canvas')].filter(e=>!e.disabled),first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
      // Do not leak gameplay, pause or cheat keystrokes through an open modal.
      event.stopPropagation();
    });
  }
  function draw(){
    const g=openedGame;if(!g||!panel||panel.hidden)return Promise.resolve(null);
    const state=g.simulation.state,map=state.mapOverride||g.assets.maps[String(state.stage).toLowerCase()];if(!map)return Promise.resolve(null);
    const token=++epoch,simulation=g.simulation,mode=g.renderer.graphicsMode,stage=state.stage;
    const current=()=>token===epoch&&panel&&!panel.hidden&&openedGame===g&&g===getGame()&&g.simulation===simulation&&simulation.state.stage===stage&&g.renderer.graphicsMode===mode;
    graphicsButton.textContent=mode==='hd'?'HD → originál':'Originál → HD';
    canvas.style.imageRendering=mode==='hd'?'auto':'pixelated';
    overview={status:'loading',mode,nativeWidth:map.width*8,nativeHeight:map.height*8};
    lastDraw=renderMapOverview({renderer:g.renderer,assets:g.assets,state:{...state,mode:simulation.mode},canvas,mode,isCurrent:current}).then(result=>{
      if(!current())return {...result,status:'cancelled'};
      overview=result;const ctx=canvas.getContext('2d'),cssScale=Math.max(.01,canvas.getBoundingClientRect().width/(map.width*8));
      ctx.setTransform(result.scale,0,0,result.scale,0,0);ctx.strokeStyle='#fff';ctx.lineWidth=2/cssScale;ctx.strokeRect(state.camera.x,state.camera.y,g.assets.playfieldWidth||312,200);
      state.players.forEach((p,index)=>{if(p.removed||p.eliminated||p.health<=0)return;ctx.beginPath();ctx.arc(p.x,p.y,5/cssScale,0,Math.PI*2);ctx.fillStyle=index?'#ffe06b':'#5bdcff';ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=1/cssScale;ctx.stroke();});
      godButton.setAttribute('aria-pressed',String(!!state.godMode));godButton.textContent=`IDDQD: ${state.godMode?'zapnuto':'vypnuto'}`;return result;
    }).catch(error=>{if(current()){overview={status:'error',message:String(error.message||error)};message('Přehled se nepodařilo vykreslit.',true);}return overview;});
    return lastDraw;
  }
  function open(){
    if(!available())return false;
    if(panel&&!panel.hidden)return true;
    const g=getGame();if(!panel)build(g);openedGame=g;openedSimulation=g.simulation;previouslyPaused=!!g.paused;restoreFocus=document.activeElement;
    pause(g);g.input?.clear();
    playerSelect.replaceChildren();g.simulation.state.players.forEach((p,index)=>{if(p.removed||p.eliminated||p.health<=0)return;const option=document.createElement('option');option.value=String(index);option.textContent=`${index+1} — ${p.type}`;playerSelect.append(option);});
    panel.hidden=false;message('Vyberte bezpečné místo na podlaze.');draw();panel.querySelector('[data-close]').focus();return true;
  }
  function close(){if(!panel||panel.hidden)return;const g=openedGame,simulation=openedSimulation;epoch++;panel.hidden=true;openedGame=null;openedSimulation=null;overview={status:'closed'};canvas.width=canvas.height=0;g?.input?.clear();if(g)resume(g,simulation);restoreFocus?.focus?.({preventScroll:true});}
  function toggleGodMode(){const g=getGame();if(!g?.started||g.sequence||g.simulation.state.status!=='playing')return null;const enabled=g.simulation.toggleGodMode();g.input?.clear();message(`IDDQD ${enabled?'zapnuto':'vypnuto'}.`);draw();return enabled;}
  function dispose(){previouslyPaused=true;close();panel?.remove();styles.remove();panel=null;}
  return {open,close,toggle:()=>panel&&!panel.hidden?(close(),false):open(),toggleGodMode,refresh:draw,dispose,available,whenReady:()=>lastDraw,get overview(){return overview;},get isOpen(){return !!panel&&!panel.hidden;}};
}
