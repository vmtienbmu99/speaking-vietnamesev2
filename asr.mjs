// Nhận giọng tiếng Việt cục bộ: mô hình hynt/Zipformer-30M-RNNT-6000h (bản ONNX int8 của sherpa-onnx)
// Dùng được ở Node và trình duyệt: truyền vào đối tượng `ort` (onnxruntime-web).
const SR = 16000, N = 400, HOP = 160, NFFT = 512, NB = 80, LOW = 20, HIGH = 7600, EPS = 1.1920929e-7;
const mel = f => 1127 * Math.log(1 + f / 700);

const BANK = (() => {
  const nb = NFFT / 2, lo = mel(LOW), hi = mel(HIGH), d = (hi - lo) / (NB + 1), rows = [];
  for (let b = 0; b < NB; b++) {
    const l = lo + b * d, c = lo + (b + 1) * d, r = lo + (b + 2) * d, row = new Float32Array(nb);
    for (let i = 0; i < nb; i++) { const m = mel(SR / NFFT * i); if (m > l && m < r) row[i] = m <= c ? (m - l) / (c - l) : (r - m) / (r - c); }
    rows.push(row);
  }
  return rows;
})();
const WIN = Float32Array.from({length: N}, (_, i) => Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)), 0.85));
const COS = Float32Array.from({length: NFFT / 2}, (_, i) => Math.cos(2 * Math.PI * i / NFFT));
const SIN = Float32Array.from({length: NFFT / 2}, (_, i) => -Math.sin(2 * Math.PI * i / NFFT));
const REV = (() => { const r = new Uint16Array(NFFT), bits = Math.log2(NFFT); for (let i = 0; i < NFFT; i++) { let x = i, y = 0; for (let b = 0; b < bits; b++) { y = (y << 1) | (x & 1); x >>= 1; } r[i] = y; } return r; })();

function fft(re, im) {
  for (let i = 0; i < NFFT; i++) { const j = REV[i]; if (j > i) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let size = 2; size <= NFFT; size <<= 1) {
    const half = size >> 1, step = NFFT / size;
    for (let s = 0; s < NFFT; s += size) for (let k = 0; k < half; k++) {
      const wr = COS[k * step], wi = SIN[k * step], a = s + k, b = a + half;
      const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
      re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
    }
  }
}

// Đặc trưng fbank 80 chiều theo kiểu Kaldi (snip_edges=false, dither=0). `scale` đưa mẫu về thang int16.
export function fbank(wave, scale = 1) {
  const n = wave.length, frames = Math.floor((n + HOP / 2) / HOP), out = new Float32Array(frames * NB);
  const x = new Float32Array(N), re = new Float32Array(NFFT), im = new Float32Array(NFFT), pw = new Float32Array(NFFT / 2);
  for (let f = 0; f < frames; f++) {
    const start = f * HOP + HOP / 2 - N / 2;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      let k = start + i; if (k < 0) k = -k - 1; if (k >= n) k = 2 * n - 1 - k; k = Math.max(0, Math.min(n - 1, k));
      x[i] = wave[k] * scale; sum += x[i];
    }
    const mean = sum / N; for (let i = 0; i < N; i++) x[i] -= mean;
    for (let i = N - 1; i > 0; i--) x[i] -= 0.97 * x[i - 1];
    x[0] -= 0.97 * x[0];
    re.fill(0); im.fill(0);
    for (let i = 0; i < N; i++) re[i] = x[i] * WIN[i];
    fft(re, im);
    for (let i = 0; i < NFFT / 2; i++) pw[i] = re[i] * re[i] + im[i] * im[i];
    for (let b = 0; b < NB; b++) { let e = 0; const row = BANK[b]; for (let i = 0; i < NFFT / 2; i++) e += row[i] * pw[i]; out[f * NB + b] = Math.log(Math.max(e, EPS)); }
  }
  return {data: out, frames};
}

export class Recognizer {
  static async create(ort, load, opts = {}) {
    const r = new Recognizer(); r.ort = ort; r.scale = opts.scale ?? 1;
    const o = {executionProviders: ['wasm'], graphOptimizationLevel: 'all'};
    const [enc, dec, joi, tok] = await Promise.all([load('encoder.int8.onnx'), load('decoder.onnx'), load('joiner.int8.onnx'), load('tokens.txt')]);
    [r.enc, r.dec, r.joi] = await Promise.all([enc, dec, joi].map(b => ort.InferenceSession.create(new Uint8Array(b), o)));
    r.tokens = []; for (const line of new TextDecoder().decode(tok).split('\n')) { const i = line.lastIndexOf(' '); if (i > 0) r.tokens[+line.slice(i + 1)] = line.slice(0, i); }
    r.ctx = opts.contextSize ?? 2;
    return r;
  }
  async decode(wave) {
    const T = this.ort.Tensor;
    if (wave.length < 1600) return '';
    const pad = new Float32Array(wave.length + 4800); pad.set(wave); // thêm 0.3 giây im lặng ở cuối để mô hình chốt từ cuối
    const {data, frames} = fbank(pad, this.scale);
    const e = await this.enc.run({x: new T('float32', data, [1, frames, NB]), x_lens: new T('int64', BigInt64Array.of(BigInt(frames)), [1])});
    const eo = e.encoder_out, D = eo.dims[2], steps = eo.dims[1];
    const runDec = async c => (await this.dec.run({y: new T('int64', BigInt64Array.from(c.map(BigInt)), [1, this.ctx])})).decoder_out;
    let ctx = Array(this.ctx).fill(0), dec = await runDec(ctx); const ids = [];
    for (let t = 0; t < steps; t++) {
      const lg = (await this.joi.run({encoder_out: new T('float32', eo.data.slice(t * D, (t + 1) * D), [1, D]), decoder_out: dec})).logit.data;
      let best = 0; for (let i = 1; i < lg.length; i++) if (lg[i] > lg[best]) best = i;
      if (best !== 0 && best !== 2) { ids.push(best); ctx = [...ctx.slice(1), best]; dec = await runDec(ctx); }
    }
    return ids.map(i => this.tokens[i] || '').join('').replaceAll('▁', ' ').trim().toLowerCase();
  }
}
