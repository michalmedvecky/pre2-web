import {NukedOPL} from './opl-engine.js';
import {OriginalOPLPlayer} from './opl-player.js';
class OriginalOPLProofProcessor extends AudioWorkletProcessor {
  constructor(){super();this.player=null;this.pending=[];this.scratch=new Int16Array(128);this.rendered=0;this.port.onmessage=e=>this.command(e.data);}
  async command(m){
    try{
      if(m.type==='init'){const engine=await NukedOPL.fromBytes(m.wasm);this.player=new OriginalOPLPlayer(engine,m.tables,m.events,{sampleRate});this.port.postMessage({type:'ready',sampleRate});}
      else if(m.type==='enabled'&&this.player)this.player.setEnabled(m.enabled);
      else if(m.type==='status')this.port.postMessage({type:'status',frame:this.player?.cursor??0,event:this.player?.eventIndex??0,enabled:this.player?.voice.enabled??false});
      else if(m.type==='dispose'){this.player?.dispose();this.player=null;this.port.postMessage({type:'disposed'});}
    }catch(error){this.port.postMessage({type:'error',message:String(error)});}
  }
  process(_input,outputs){const out=outputs[0]?.[0];if(!out)return true;if(!this.player){out.fill(0);return true;}if(this.scratch.length!==out.length)this.scratch=new Int16Array(out.length);this.player.renderInto(this.scratch);for(let i=0;i<out.length;i++)out[i]=this.scratch[i]/32768;return true;}
}
registerProcessor('golden-axe-original-opl-proof',OriginalOPLProofProcessor);
