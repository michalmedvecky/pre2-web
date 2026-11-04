import {NukedOPL} from './opl-engine.js';
import {OriginalOPLSequencePlayer} from './opl-sequence-player.js';
class OriginalOPLProcessor extends AudioWorkletProcessor {
  constructor(){super();this.player=null;this.generation=0;this.disposed=false;this.scratch=new Int16Array(128);this.port.onmessage=e=>this.command(e.data);}
  async command(m){
    try{
      if(m.type==='init'){
        const generation=++this.generation;const engine=await NukedOPL.fromBytes(m.wasm);
        if(this.disposed||generation!==this.generation)return;
        this.player?.dispose();this.player=new OriginalOPLSequencePlayer(engine,m.tables,m.catalog,m.scores,{sampleRate});
        if(m.enabled===false)this.player.setEnabled(false);this.port.postMessage({type:'ready',request:m.request,sampleRate});return;
      }
      if(m.type==='dispose'){this.disposed=true;this.generation++;this.player?.dispose();this.player=null;this.port.postMessage({type:'disposed',request:m.request});return;}
      if(this.disposed)return;
      if(m.type==='select'){if(!this.player)throw new Error('OPL not ready.');this.player.selectProgram(m.name,m.options);this.port.postMessage({type:'selected',request:m.request,name:m.name});}
      else if(m.type==='enabled')this.player?.setEnabled(m.enabled);
      else if(m.type==='stop')this.player?.stop();
      else if(m.type==='status')this.port.postMessage({type:'status',request:m.request,...this.player?.status()});
    }catch(error){this.port.postMessage({type:'error',request:m.request,message:String(error)});}
  }
  process(_input,outputs){const out=outputs[0]?.[0];if(this.disposed){out?.fill(0);return false;}if(!out)return true;if(!this.player){out.fill(0);return true;}if(this.scratch.length!==out.length)this.scratch=new Int16Array(out.length);this.player.renderInto(this.scratch);for(let i=0;i<out.length;i++)out[i]=this.scratch[i]/32768;return true;}
}
registerProcessor('golden-axe-original-opl',OriginalOPLProcessor);
