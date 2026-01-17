class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSize = 4096
    this._bytesWritten = 0
    this._buffer = new Float32Array(this.bufferSize)
  }

  initBuffer() {
    this._bytesWritten = 0
  }

  isBufferFull() {
    return this._bytesWritten >= this.bufferSize
  }

  process(inputs) {
    const input = inputs[0]
    if (input.length > 0) {
      const channelData = input[0]
      if (channelData) {
        for (let i = 0; i < channelData.length; i++) {
          this._buffer[this._bytesWritten++] = channelData[i]
          if (this.isBufferFull()) {
            this.flush()
          }
        }
      }
    }
    return true
  }

  flush() {
    const buffer = this._buffer.slice(0, this._bytesWritten)
    this.port.postMessage({
      eventType: 'data',
      audioBuffer: buffer
    })
    this.initBuffer()
  }
}

registerProcessor('recorder.worklet', RecorderProcessor)
