// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
(function (root) {
  'use strict';
  function normalizeBarcode(value, format) {
    let code = String(value || '').trim();
    if (format === 'upc_e' && /^[01]\d{7}$/.test(code)) {
      const [system, a, b, c, d, e, f, check] = code;
      if ('012'.includes(f)) code = system + a + b + f + '0000' + c + d + e + check;
      else if (f === '3') code = system + a + b + c + '00000' + d + e + check;
      else if (f === '4') code = system + a + b + c + d + '00000' + e + check;
      else code = system + a + b + c + d + e + '0000' + f + check;
    }
    if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return null;
    let sum = 0;
    for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) sum += Number(code[i]) * weight;
    return (10 - sum % 10) % 10 === Number(code.at(-1)) ? code : null;
  }

  class LiveBarcodeScanner {
    constructor({ video, onDetected, onError = () => {}, mediaDevices = root.navigator?.mediaDevices, zxing = root.ZXing, Detector = root.BarcodeDetector }) {
      Object.assign(this, { video, onDetected, onError, mediaDevices, zxing, Detector });
      this.generation = 0;
    }
    stop() {
      this.generation++;
      clearTimeout(this.timer);
      if (this.reader) { this.reader.reset(); this.reader = null; }
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.video.srcObject = null;
    }
    accept(raw, format, generation) {
      const code = normalizeBarcode(raw, format);
      if (!code || generation !== this.generation) return;
      this.stop();
      this.onDetected(code);
    }
    async start() {
      this.stop();
      const generation = this.generation;
      if (!this.mediaDevices?.getUserMedia) throw Object.assign(Error('cameraSecure'), { code: 'cameraSecure' });
      const stream = await this.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return false; }
      this.stream = stream;
      this.video.srcObject = stream;
      try {
        await this.video.play();
        if (generation !== this.generation) return false;
        let formats = [];
        try { if (this.Detector) formats = (await this.Detector.getSupportedFormats()).filter(format => ['ean_13', 'ean_8', 'upc_a', 'upc_e'].includes(format)); } catch { /* Use the bundled decoder when native format detection is unavailable. */ }
        if (generation !== this.generation) return false;
        if (formats.length) {
          const detector = new this.Detector({ formats });
          const loop = async () => {
            if (generation !== this.generation) return;
            try {
              for (const result of await detector.detect(this.video)) this.accept(result.rawValue, result.format, generation);
            } catch { if (generation === this.generation) { try { await this.startZXing(stream, generation); } catch (error) { this.stop(); this.onError(error); } return; } }
            if (generation === this.generation) this.timer = setTimeout(loop, 180);
          };
          this.timer = setTimeout(loop, 100);
        } else await this.startZXing(stream, generation);
        return generation === this.generation;
      } catch (error) { if (generation === this.generation) this.stop(); throw error; }
    }
    async startZXing(stream, generation) {
      if (generation !== this.generation) return;
      const Z = this.zxing;
      const hints = new Map([[Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]], [Z.DecodeHintType.TRY_HARDER, true]]);
      const reader = new Z.BrowserMultiFormatReader(hints, 180);
      this.reader = reader;
      await reader.decodeFromStream(stream, this.video, result => {
        if (result) this.accept(result.getText(), result.getBarcodeFormat() === Z.BarcodeFormat.UPC_E ? 'upc_e' : '', generation);
      });
      if (generation !== this.generation) reader.reset();
    }
  }
  const api = { LiveBarcodeScanner, normalizeBarcode };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BarcodeScanning = api;
})(typeof globalThis === 'object' ? globalThis : this);
