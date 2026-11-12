/** Original GOLD register-sequenced OPL music and original SND.DAT effects.
 * PCM is derived offline from the original driver; no EXE runs in the browser.
 */
import {RemasterMusic} from './remaster-music.js';

export class OriginalAudio {
  constructor({muted = false, musicEnabled = true, effectsEnabled = true, musicBackend = 'auto', manifestURL = new URL('../assets/audio/manifest.json', import.meta.url)} = {}) {
    this.manifestURL = manifestURL;
    this.backendPreference = musicBackend;
    this.musicBackend = 'flac';
    this.fallbackReason = null;
    this.liveMusic = null;
    this.liveInitPromise = null;
    this.liveFailed = false;
    this.liveAbortController = null;
    this.liveRecoveryPromise = null;
    this.currentTrackOptions = {};
    this.context = null;
    this.manifest = null;
    this.muted = Boolean(muted);
    this.musicEnabled = Boolean(musicEnabled);
    this.effectsEnabled = Boolean(effectsEnabled);
    this.paused = false;
    this.currentTrack = null;
    this.lastStageKey = null;
    this.pendingTrack = null;
    this.musicSource = null;
    this.effectSource = null;
    this.musicToken = 0;
    this.effectToken = 0;
    this.buffers = new Map();
    this.status = 'locked';
    this.error = null;
    this.disposed = false;
    this.disposePromise = null;
    this.musicEdition = 'original';
    this.remasterMusic = null;
    this.remasterError = null;
    this.trackStartedAt = null;
    this.onMusicEditionChange = null;
  }

  async unlock() {
    if (this.disposed) return false;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) {this.status = 'unsupported';return false;}
    try {
      // Create/resume synchronously inside the user's Start/Resume gesture.
      if (!this.context) {
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = this.musicEnabled ? 1 : 0;
        this.musicGain.connect(this.master);
        this.effectsGain = this.context.createGain();
        this.effectsGain.gain.value = this.effectsEnabled ? 1 : 0;
        this.effectsGain.connect(this.master);
        this.speakerFilter = this.context.createBiquadFilter();
        this.speakerFilter.type = 'highpass';
        this.speakerFilter.frequency.value = 20;
        this.speakerFilter.connect(this.effectsGain);
      }
      const context = this.context;
      if (!this.paused) await context.resume();
      if (this.disposed || context !== this.context || context.state === 'closed') return false;
      if (!this.manifest) {
        const response = await fetch(this.manifestURL);
        if (this.disposed || context !== this.context) return false;
        if (!response.ok) throw new Error(`Original audio manifest: HTTP ${response.status}`);
        const manifest = await response.json();
        if (this.disposed || context !== this.context) return false;
        this.manifest = manifest;
      }
      if (!this.manifest.faithfulSupported) throw new Error('Original audio has not passed register validation.');
      await this.ensureLiveMusic();
      if (!this.context || this.context.state === 'closed' || this.status === 'closed') return false;
      this.status = 'ready';
      const pending = this.pendingTrack;
      this.pendingTrack = null;
      if (pending) await this.playTrack(pending.id, pending.options);
      return true;
    } catch (error) {if (!this.disposed) {this.error = String(error);this.status = 'unavailable';}return false;}
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.context.currentTime, 0.005);
  }

  setMusicEnabled(value) {
    this.musicEnabled = Boolean(value);
    if (this.liveMusic) this.liveMusic.setEnabled(this.musicEnabled);
    // Native F3 drives GOLD TL/dekey state; master mute remains independent.
    this.syncMusicMix();
    return this.musicEnabled;
  }
  setEffectsEnabled(value) {
    // Native F2 gates port61 but does not stop or reset the PIT sample cursor.
    this.effectsEnabled = Boolean(value);
    if (this.context && this.effectsGain) this.effectsGain.gain.setValueAtTime(this.effectsEnabled ? 1 : 0, this.context.currentTime);
    return this.effectsEnabled;
  }
  toggleMusic() {return this.setMusicEnabled(!this.musicEnabled);}
  toggleEffects() {return this.setEffectsEnabled(!this.effectsEnabled);}

  getMusicEditionStatus() {
    return {requested:this.musicEdition,effective:this.remasterMusic?.active?'remaster':'original',loading:this.musicEdition==='remaster'&&this.remasterMusic?.state==='loading',error:this.musicEdition==='remaster'?this.remasterError||this.remasterMusic?.error||null:null};
  }

  syncMusicMix() {
    const context=this.context;
    if(this.disposed||!context||context.state==='closed')return;
    const remastered=this.musicEdition==='remaster'&&this.remasterMusic?.active;
    // The original GOLD voice keeps its clock and native F3 state even while
    // inaudible. Restoring it never reselects or restarts the original score.
    this.musicGain?.gain.setTargetAtTime(remastered?0:(this.liveMusic?1:(this.musicEnabled?1:0)),context.currentTime,.005);
    this.remasterGain?.gain.setTargetAtTime(remastered&&this.musicEnabled?1:0,context.currentTime,.005);
    this.onMusicEditionChange?.(this.getMusicEditionStatus());
  }

  async setMusicEdition(edition) {
    if(this.disposed)return false;
    if(!['original','remaster'].includes(edition))throw Error('Unknown music edition.');
    this.musicEdition=edition;this.remasterError=null;
    if(edition==='original'){
      this.remasterMusic?.stop();this.syncMusicMix();return true;
    }
    this.syncMusicMix();
    if(!this.context||!this.currentTrack||this.trackStartedAt===null)return true;
    return this.syncRemaster();
  }
  toggleMusicEdition() {return this.setMusicEdition(this.musicEdition==='original'?'remaster':'original');}

  async syncRemaster() {
    if(this.disposed||this.musicEdition!=='remaster'||!this.context||this.context.state==='closed'||!this.currentTrack||this.trackStartedAt===null)return false;
    try {
    if(!this.remasterMusic){
      this.remasterGain=this.context.createGain();this.remasterGain.gain.value=0;this.remasterGain.connect(this.master);
      this.remasterMusic=new RemasterMusic({context:this.context,destination:this.remasterGain,manifestURL:new URL('remaster/manifest.json',this.manifestURL),onChange:()=>this.syncMusicMix()});
    }
    return await this.remasterMusic.select(this.currentTrack,{startedAt:this.trackStartedAt,loop:this.currentTrackOptions.loop??true});
    } catch(error) {if(!this.disposed){this.remasterError=String(error.message||error);this.syncMusicMix();}return false;}
  }

  async setPaused(value) {
    this.paused = Boolean(value);
    const context = this.context;
    if (this.disposed || !context || context.state === 'closed') return false;
    try {
      if (this.paused) {await context.suspend();this.remasterMusic?.releaseRetired();}
      else await context.resume();
      return !this.disposed && context === this.context && context.state !== 'closed';
    } catch (error) {
      if (!this.disposed && context === this.context) this.error = String(error);
      return false;
    }
  }

  // Call only from a trusted gesture. A browser/device may suspend the shared
  // clock independently of our pause intent; restore that clock, never the song.
  resumeAfterInterruption() {
    const context=this.context;
    if(this.disposed||this.paused||!context||!['suspended','interrupted'].includes(context.state))return Promise.resolve(false);
    if(this.interruptionResumePromise)return this.interruptionResumePromise;
    try {
      const resumed=context.resume();
      const pending=Promise.resolve(resumed).then(()=>!this.disposed&&context===this.context&&!this.paused&&context.state==='running',error=>{
        if(!this.disposed&&context===this.context)this.error=String(error);
        return false;
      }).finally(()=>{if(this.interruptionResumePromise===pending)this.interruptionResumePromise=null;});
      this.interruptionResumePromise=pending;
      return pending;
    } catch(error) {
      if(!this.disposed&&context===this.context)this.error=String(error);
      return Promise.resolve(false);
    }
  }

  async ensureLiveMusic() {
    if (this.disposed || this.backendPreference === 'flac' || this.liveFailed || !this.context) return false;
    if (this.liveMusic) return true;
    if (this.liveInitPromise) return this.liveInitPromise;
    const context = this.context;
    const controller = new AbortController();
    this.liveAbortController = controller;
    this.liveInitPromise = (async () => {
      try {
        const {OriginalOPLAudio} = await import('./opl-audio.js');
        const live = await OriginalOPLAudio.create({context, destination:this.musicGain, baseURL:new URL('opl/', this.manifestURL), enabled:this.musicEnabled, signal:controller.signal, onError:error=>{this.recoverLiveMusic(error).catch(()=>{});}});
        if (context !== this.context || context.state === 'closed' || this.status === 'closed') {await live.dispose();return false;}
        this.liveMusic = live;
        this.musicBackend = 'opl';
        live.setEnabled(this.musicEnabled);
        this.syncMusicMix();
        return true;
      } catch (error) {
        if (this.disposed || context !== this.context || controller.signal.aborted) return false;
        this.liveFailed = true;
        this.fallbackReason = String(error);
        this.musicBackend = 'flac';
        this.syncMusicMix();
        return false;
      } finally {this.liveInitPromise = null;}
    })();
    return this.liveInitPromise;
  }

  async recoverLiveMusic(error) {
    if (this.liveRecoveryPromise) return this.liveRecoveryPromise;
    const live = this.liveMusic;
    if (!live) return false;
    const id = this.currentTrack, options = this.currentTrackOptions;
    const token = ++this.musicToken;
    this.liveMusic = null;
    this.musicSource = null;
    this.musicBackend = 'flac';
    this.liveFailed = true;
    this.fallbackReason = String(error);
    this.remasterMusic?.stop();
    this.syncMusicMix();
    this.liveRecoveryPromise = (async () => {
      try {
        await live.dispose();
        if (token !== this.musicToken || !this.context || this.context.state === 'closed' || !id) return false;
        // Explicit fallback restarts original PCM; it cannot retain failed chip state.
        return await this.playTrack(id, {...options, restart:true});
      } finally {this.liveRecoveryPromise = null;}
    })();
    return this.liveRecoveryPromise;
  }

  async loadBuffer(record) {
    const context = this.context;
    if (this.disposed || !context || context.state === 'closed') return null;
    const key = record.file;
    if (!this.buffers.has(key)) {
      const promise = (async () => {
        const response = await fetch(new URL(record.file, this.manifestURL));
        if (this.disposed || context !== this.context || context.state === 'closed') return null;
        if (!response.ok) throw new Error(`Original audio asset: HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (this.disposed || context !== this.context || context.state === 'closed') return null;
        return context.decodeAudioData(bytes);
      })();
      this.buffers.set(key, promise);
      promise.catch(() => this.buffers.delete(key));
      // Keep only two large decoded music buffers; effects are small.
      const musicKeys = [...this.buffers.keys()].filter(name => name.endsWith('.flac'));
      while (musicKeys.length > 2) this.buffers.delete(musicKeys.shift());
    }
    return this.buffers.get(key);
  }

  async playStage(index, {mode = 'arcade'} = {}) {
    // AXE02d7 passes stage index, except Duel passes selector4.
    const key = `${mode}:${index}`;
    const restart = this.lastStageKey !== key;
    this.lastStageKey = key;
    return this.playTrack({selector: mode === 'duel' ? 4 : index}, {restart});
  }

  async playTrack(id, options = {}) {
    if (this.disposed) return false;
    if (!this.context || !this.manifest) {
      this.pendingTrack = {id, options};
      return false;
    }
    if (id && typeof id === 'object') id = this.manifest.selectors[String(id.selector)];
    if (!id || !this.manifest.tracks[id]) return false;
    if (this.currentTrack === id && this.musicSource && !options.restart) return true;
    const token = ++this.musicToken;
    this.remasterMusic?.stop({clearBuffer:this.remasterMusic.bufferId!==id});
    this.trackStartedAt = null;
    await this.ensureLiveMusic();
    if (token !== this.musicToken || !this.context || this.context.state === 'closed') return false;
    if (this.musicSource && this.musicSource !== this.liveMusic?.node) {this.musicSource.stop();this.musicSource = null;}
    this.currentTrack = id;
    this.currentTrackOptions = {...options};
    try {
      const record = this.manifest.tracks[id];
      if (this.liveMusic) {
        try {
          const ok = await this.liveMusic.play(id, options);
          if (token !== this.musicToken || !this.context) return false;
          if (!ok) return false;
          this.musicSource = this.liveMusic.node;
          this.trackStartedAt = this.liveMusic.lastStartTime ?? this.context.currentTime;
          this.syncRemaster();
          return true;
        } catch (error) {
          return await this.recoverLiveMusic(error);
        }
      }
      const buffer = await this.loadBuffer(record);
      if (token !== this.musicToken || !this.context || this.context.state === 'closed') return false;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = options.loop ?? true;
      source.loopStart = record.loopStart || 0;
      source.loopEnd = Math.min(record.loopEnd || buffer.duration, buffer.duration);
      source.connect(this.musicGain);
      source.onended = () => {if (this.musicSource === source) this.musicSource = null;source.disconnect();};
      this.musicSource = source;
      this.trackStartedAt = this.context.currentTime;
      source.start(this.trackStartedAt);
      this.syncRemaster();
      return true;
    } catch (error) {if (!this.disposed) {this.error = String(error);this.status = 'unavailable';}return false;}
  }

  async triggerEffect(id, {loop = false} = {}) {
    const record = this.manifest?.effects[String(id)];
    if (!record || !this.context || this.paused) return false;
    const token = ++this.effectToken;
    try {
      const buffer = await this.loadBuffer(record);
      if (token !== this.effectToken || !this.context || this.context.state === 'closed') return false;
      // The original IRQ player has one sample cursor: a new effect replaces it.
      if (this.effectSource) this.effectSource.stop();
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = Boolean(loop);
      source.loopStart = 0;
      source.loopEnd = Math.min(record.nativeDurationSeconds || buffer.duration, buffer.duration);
      source.connect(this.speakerFilter);
      source.onended = () => {if (this.effectSource === source) this.effectSource = null;source.disconnect();};
      this.effectSource = source;
      source.start();
      return true;
    } catch (error) {if (!this.disposed) this.error = String(error);return false;}
  }

  stopEffect() {
    // AXE magic stop clears both the loop flag74fc and remaining bit counter74f3.
    this.effectToken++;
    const source = this.effectSource;
    this.effectSource = null;
    if (source) {source.stop();source.disconnect();}
  }

  stop() {
    this.musicToken++;
    this.effectToken++;
    this.pendingTrack = null;
    this.currentTrack = null;
    this.trackStartedAt = null;
    this.remasterMusic?.stop({clearBuffer:true});
    this.lastStageKey = null;
    this.liveMusic?.stop();
    for (const source of [this.musicSource === this.liveMusic?.node ? null : this.musicSource, this.effectSource]) if (source) {source.stop();source.disconnect();}
    this.musicSource = null;
    this.effectSource = null;
  }

  dispose() {
    if (this.disposePromise) return this.disposePromise;
    this.disposed = true;
    this.stop();
    this.buffers.clear();
    this.remasterMusic?.dispose();
    this.onMusicEditionChange = null;
    this.liveAbortController?.abort();
    const context = this.context, live = this.liveMusic;
    this.context = null;
    this.liveMusic = null;
    this.status = 'closed';
    // Closing the context can reject pending resume promises. Both paths own
    // their completion; a suspended processor cannot acknowledge a worklet RPC.
    this.disposePromise = (async () => {
      const liveClose = live ? live.dispose({waitForAck:false}) : Promise.resolve();
      const contextClose = context && context.state !== 'closed' ? context.close() : Promise.resolve();
      await Promise.allSettled([liveClose, contextClose]);
    })();
    return this.disposePromise;
  }
}
