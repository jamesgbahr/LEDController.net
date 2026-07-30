class LEDControllerAudioClockProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.framesUntilTick = 0;
    this.framesPerTick = Math.max(128, Math.round(sampleRate / 60));
  }

  process(inputs, outputs) {
    for (const output of outputs) {
      for (const channel of output) channel.fill(0);
    }
    this.framesUntilTick -= 128;
    if (this.framesUntilTick <= 0) {
      this.framesUntilTick += this.framesPerTick;
      this.port.postMessage({ type: 'tick', frame: currentFrame });
    }
    return true;
  }
}

registerProcessor('ledcontroller-audio-clock', LEDControllerAudioClockProcessor);
