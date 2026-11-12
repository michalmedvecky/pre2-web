// Native fullscreen where available, viewport-filling play mode elsewhere.
export class GameScreen {
 constructor(element,{onFallback=()=>{},onExit=()=>{}}={}){this.element=element;this.onFallback=onFallback;this.onExit=onExit;this.native=false;this.busy=false;this.standalone=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
  if(this.standalone){this.expand();this.keepAwake();}document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===element){this.native=true;this.expand();}else if(this.native){this.native=false;this.collapse();}});document.addEventListener('visibilitychange',()=>{if(document.hidden)this.wake?.release().catch(()=>{});else if(this.active)this.keepAwake();});
 }
 get active(){return document.fullscreenElement===this.element||this.element.classList.contains('immersive');}
 expand(){this.element.classList.add('immersive');document.body.classList.add('game-immersive');}
 collapse(){this.element.classList.remove('immersive');document.body.classList.remove('game-immersive');try{screen.orientation?.unlock?.();}catch{}this.wake?.release().catch(()=>{});this.wake=null;this.onExit();}
 async keepAwake(){if(this.wake&&!this.wake.released)return;try{this.wake=await navigator.wakeLock?.request('screen');}catch{}}
 async enter(){if(this.busy)return;this.busy=true;this.expand();try{if(!this.standalone&&document.fullscreenElement!==this.element){if(!this.element.requestFullscreen)throw Error('Fullscreen unavailable');await this.element.requestFullscreen({navigationUI:'hide'});this.native=true;}try{await screen.orientation?.lock?.('landscape');}catch{}}catch{this.onFallback();}finally{if(this.active)this.keepAwake();this.busy=false;}}
 async exit(){if(this.busy)return;if(document.fullscreenElement===this.element){try{await document.exitFullscreen();}catch{this.collapse();}}else this.collapse();}
 toggle(){return this.active?this.exit():this.enter();}
}
