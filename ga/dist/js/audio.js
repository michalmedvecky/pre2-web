/** Original GOLD register-sequenced OPL music and original SND.DAT effects.
 * PCM is derived offline from the original driver; no EXE runs in the browser.
 */
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
  }

  async unlock() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) {this.status = 'unsupported';return false;}
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
    if (!this.paused) await this.context.resume();
    try {
      if (!this.manifest) {
        const response = await fetch(this.manifestURL);
        if (!response.ok) throw new Error(`Original audio manifest: HTTP ${response.status}`);
        this.manifest = await response.json();
      }
      if (!this.manifest.faithfulSupported) throw new Error('Original audio has not passed register validation.');
      await this.ensureLiveMusic();
      if (!this.context || this.context.state === 'closed' || this.status === 'closed') return false;
      this.status = 'ready';
      const pending = this.pendingTrack;
      this.pendingTrack = null;
      if (pending) await this.playTrack(pending.id, pending.options);
      return true;
    } catch (error) {this.error = String(error);this.status = 'unavailable';return false;}
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.context.currentTime, 0.005);
  }

  setMusicEnabled(value) {
    this.musicEnabled = Boolean(value);
    if (this.liveMusic) this.liveMusic.setEnabled(this.musicEnabled);
    // Native F3 drives GOLD TL/dekey state; master mute remains independent.
    if (this.context && this.musicGain) this.musicGain.gain.setValueAtTime(this.liveMusic ? 1 : (this.musicEnabled ? 1 : 0), this.context.currentTime);
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

  async setPaused(value) {
    this.paused = Boolean(value);
    if (!this.context || this.context.state === 'closed') return;
    if (this.paused) await this.context.suspend();
    else await this.context.resume();
  }

  async ensureLiveMusic() {
    if (this.backendPreference === 'flac' || this.liveFailed || !this.context) return false;
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
        this.musicGain.gain.setValueAtTime(1, context.currentTime);
        return true;
      } catch (error) {
        this.liveFailed = true;
        this.fallbackReason = String(error);
        this.musicBackend = 'flac';
        if (context === this.context && context.state !== 'closed') this.musicGain.gain.setValueAtTime(this.musicEnabled ? 1 : 0, context.currentTime);
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
    if (this.context && this.context.state !== 'closed') this.musicGain.gain.setValueAtTime(this.musicEnabled ? 1 : 0, this.context.currentTime);
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
    if (!this.context) return null;
    const key = record.file;
    if (!this.buffers.has(key)) {
      const promise = (async () => {
        const response = await fetch(new URL(record.file, this.manifestURL));
        if (!response.ok) throw new Error(`Original audio asset: HTTP ${response.status}`);
        return this.context.decodeAudioData(await response.arrayBuffer());
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
    if (!this.context || !this.manifest) {
      this.pendingTrack = {id, options};
      return false;
    }
    if (id && typeof id === 'object') id = this.manifest.selectors[String(id.selector)];
    if (!id || !this.manifest.tracks[id]) return false;
    if (this.currentTrack === id && this.musicSource && !options.restart) return true;
    const token = ++this.musicToken;
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
      source.start();
      return true;
    } catch (error) {this.error = String(error);this.status = 'unavailable';return false;}
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
    } catch (error) {this.error = String(error);return false;}
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
    this.lastStageKey = null;
    this.liveMusic?.stop();
    for (const source of [this.musicSource === this.liveMusic?.node ? null : this.musicSource, this.effectSource]) if (source) {source.stop();source.disconnect();}
    this.musicSource = null;
    this.effectSource = null;
  }

  async dispose() {
    this.stop();
    this.buffers.clear();
    this.liveAbortController?.abort();
    const context = this.context, live = this.liveMusic;
    this.context = null;
    this.liveMusic = null;
    this.status = 'closed';
    if (live) await live.dispose();
    if (context && context.state !== 'closed') await context.close();
  }
}
