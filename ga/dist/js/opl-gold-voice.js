// Explicit port of the original GOLD OPL2 voice routines. No EXE execution.
// Addresses are offsets in the preserved, unpacked GOLD module; table provenance
// and independent native gate vectors accompany the one-track proof.
const signed16=n=>(n<<16)>>16;
export class GoldVoice {
  constructor(tables,write){this.t=tables;this.output=write;this.reset();}
  write(r,v){this.output(r&255,v&255);}
  reset(){
    this.enabled=!!this.t.initialEnabled;this.rhythm=false;this.amDepth=false;this.vibratoDepth=false;this.noteSelect=false;this.rhythmKeys=0;this.waveform=false;this.pitchRange=1;
    this.pitch=Array(9).fill(8192);this.key=Array(9).fill(0);this.b84=Array(9).fill(0);this.note=Array(9).fill(0);this.lastWrittenNote=Array(9).fill(0);this.velocity=Array(11).fill(0);this.volume=Array(11).fill(127);this.instrument=Array.from({length:18},()=>Array(14).fill(0));
    // 0c8c, including original reset register order.
    for(let r=1;r<246;r++)this.write(r,0);this.write(4,6);this.setRhythm(false);this.setDepth(false,false,false);this.pitchRange=1;this.setWaveform(true);
  }
  operators(ch){return (this.rhythm?this.t.rhythmChannelOperators:this.t.melodicChannelOperators)[ch]||[];}
  setEnabled(value){ // 0010
    value=!!value;if(value!==this.enabled){for(let ch=0;ch<11;ch++){this.setVolume(ch,value?this.velocity[ch]:0);if(!value)this.noteOff(ch);}}this.enabled=value;
  }
  start(){ // 04f8 parser start voice side effects; no chip reset
    const enabled=this.enabled;if(enabled)this.setEnabled(false);if(enabled)this.setEnabled(true);
  }
  setDepth(am,vibrato,noteSelect){this.amDepth=!!am;this.vibratoDepth=!!vibrato;this.noteSelect=!!noteSelect;this.writeBD();this.write(8,this.noteSelect?64:0);}
  writeBD(){this.write(0xbd,(this.amDepth?128:0)|(this.vibratoDepth?64:0)|(this.rhythm?32:0)|this.rhythmKeys);}
  setRhythm(value){ // 0d26/101b
    if(value){this.note[8]=24;this.pitch[8]=8192;this.writeFrequency(8);this.note[7]=31;this.pitch[7]=8192;this.writeFrequency(7);}
    this.rhythm=!!value;this.rhythmKeys=0;
    for(let op=0;op<18;op++)this.setOperator(op,this.t.defaultOperators[this.t.carrierFlags[op]?1:0],0);
    if(value)for(const [op,p] of [[12,2],[15,3],[16,4],[14,5],[17,6],[13,7]])this.setOperator(op,this.t.defaultOperators[p],0);
    this.writeBD();
  }
  setWaveform(value){this.waveform=!!value;for(const off of this.t.operatorRegisterOffsets)this.write(0xe0+off,0);this.write(1,this.waveform?32:0);}
  setOperator(op,params,wave){this.instrument[op]=[...params.slice(0,13),wave&3];this.writeBD();this.write(8,this.noteSelect?64:0);this.writeTL(op);this.writeConnection(op);this.writeAD(op);this.writeSR(op);this.writeFlags(op);this.writeWave(op);}
  setInstrument(ch,p){ // 0a43->0e04; 28 bytes: 13+13+wave1+wave2
    if(ch>=(this.rhythm?11:9))return;const [a,b]=this.operators(ch);this.setOperator(a,p.slice(0,13),p[26]);if(b!==255)this.setOperator(b,p.slice(13,26),p[27]);
  }
  writeTL(op){ // 122d: FM modulators keep instrument attenuation.
    const p=this.instrument[op],ch=(this.rhythm?this.t.rhythmOperatorChannels:this.t.melodicOperatorChannels)[op];let amp=63-(p[8]&63);
    if(this.t.carrierFlags[op]||p[12]===0||(this.rhythm&&ch>=7))amp=(this.volume[ch]*amp+64)>>7;
    this.write(0x40+this.t.operatorRegisterOffsets[op],(63-amp)|(p[0]<<6));
  }
  writeConnection(op){if(!this.t.carrierFlags[op])this.write(0xc0+this.t.melodicOperatorChannels[op],(this.instrument[op][2]<<1)|(this.instrument[op][12]===0?1:0));}
  writeAD(op){const p=this.instrument[op];this.write(0x60+this.t.operatorRegisterOffsets[op],(p[3]<<4)|(p[6]&15));}
  writeSR(op){const p=this.instrument[op];this.write(0x80+this.t.operatorRegisterOffsets[op],(p[4]<<4)|(p[7]&15));}
  writeFlags(op){const p=this.instrument[op];this.write(0x20+this.t.operatorRegisterOffsets[op],(p[9]?128:0)+(p[10]?64:0)+(p[5]?32:0)+(p[11]?16:0)+(p[1]&15));}
  writeWave(op){this.write(0xe0+this.t.operatorRegisterOffsets[op],this.waveform?(this.instrument[op][13]&3):0);}
  setVolume(ch,value){if(ch>=(this.rhythm?11:9))return;this.volume[ch]=Math.min(127,value);for(const op of this.operators(ch))if(op!==255)this.writeTL(op);}
  noteOff(ch){ // 0fbe
    if((!this.rhythm&&ch<9)||ch<6){this.key[ch]=0;this.b84[ch]&=0xdf;this.write(0xb0+ch,this.b84[ch]);}
    else if(this.rhythm&&ch<=10){this.rhythmKeys&=~this.t.rhythmMasks[ch];this.writeBD();}
  }
  noteOn(ch,note){ // 0f23
    note=Math.max(0,note-12);
    if((!this.rhythm&&ch<9)||ch<6){this.note[ch]=note&255;this.key[ch]=32;this.writeFrequency(ch);return;}
    if(!this.rhythm||ch>10)return;
    if(ch===6){this.note[6]=note&255;this.writeFrequency(6);}
    else if(ch===8&&note!==this.note[8]){this.note[8]=note&255;this.note[7]=(note+7)&255;this.writeFrequency(8);this.writeFrequency(7);}
    this.rhythmKeys|=this.t.rhythmMasks[ch];this.writeBD();
  }
  noteEvent(ch,note,velocity){ // 08ed
    if(this.enabled){if(velocity){if(this.velocity[ch]!==velocity){this.setVolume(ch,velocity);this.velocity[ch]=velocity;}this.noteOn(ch,note);return;}this.noteOff(ch);}this.velocity[ch]=velocity;
  }
  setPitch(ch,value){ // 0eea
    if((!this.rhythm&&ch<9)||ch<7){this.pitch[ch]=Math.min(16383,value);this.writeFrequency(ch);}
  }
  writeFrequency(ch){ // 1616 incl original signed 16-bit arithmetic.
    let ax=signed16(this.pitch[ch]-8192);if(ax)ax=signed16((ax>>5)*this.pitchRange);
    ax=signed16((ax&255)|((((ax>>>8)+this.note[ch])&255)<<8));ax=signed16(ax+8)>>4;ax=Math.max(0,Math.min(1535,ax));
    this.lastWrittenNote[ch]=this.note[ch]&255;const idx=ax>>4;let freq=this.t.frequency[this.t.noteIndices[idx]*16+(ax&15)],block=this.t.octaves[idx]-1;
    if(signed16(freq)<0)block++;if(block<0){block++;freq=(signed16(freq)>>1)&65535;}
    this.write(0xa0+ch,freq);this.b84[ch]=(((freq>>>8)&3)+(block<<2)+this.key[ch])&255;this.write(0xb0+ch,this.b84[ch]);
  }
  event(event){
    const a=event.argument,d=event.data;if(event.kind===1){if(a===1)this.setInstrument(d[0],d.slice(1));else if(a===2)this.setRhythm(!!d[0]);else if(a===3)this.pitchRange=Math.max(1,Math.min(12,d[0]));return;}
    const ch=a&15,type=(a>>4)&7;if(ch>=11)return;
    if(type===0)this.noteOff(ch);else if(type===1)this.noteEvent(ch,d[0],d[1]);else if(type===2||type===5){const v=d[type===2?1:0];if(this.enabled)this.setVolume(ch,v);this.velocity[ch]=v;}else if(type===6)this.setPitch(ch,d[0]|(d[1]<<7));
  }
}
