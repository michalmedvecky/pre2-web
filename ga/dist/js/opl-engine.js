// LGPL Nuked-OPL3 only; no x86/DOS interpreter. Not enabled in default audio.
export class NukedOPL {
  constructor(instance){this.instance=instance;this.exports=instance.exports;this.memory=instance.exports.memory;this.bufferPointer=this.exports.opl_buffer();}
  static async fromBytes(bytes){const {instance}=await WebAssembly.instantiate(bytes,{});return new NukedOPL(instance);}
  reset(sampleRate=48000){this.sampleRate=sampleRate;this.exports.opl_reset(sampleRate);}
  write(reg,value){this.exports.opl_write(reg,value);}
  renderInto(destination,offset,count){
    while(count>0){const n=Math.min(count,512);this.exports.opl_render(n);destination.set(new Int16Array(this.memory.buffer,this.bufferPointer,n),offset);offset+=n;count-=n;}
  }
}
