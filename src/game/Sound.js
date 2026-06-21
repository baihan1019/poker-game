/**
 * Web Audio API 音效工具
 * 使用振荡器生成简单音效，无需外部文件
 */

let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function playCardSound() {
  try {
    const ctx = getCtx(), t = ctx.currentTime
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(600, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.08)
    gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.start(t); osc.stop(t + 0.12)
  } catch (e) {}
}

export function playPassSound() {
  try {
    const ctx = getCtx(), t = ctx.currentTime
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.1)
    gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.start(t); osc.stop(t + 0.15)
  } catch (e) {}
}

export function playBombSound() {
  try {
    const ctx = getCtx(), t = ctx.currentTime
    const o1 = ctx.createOscillator(), g1 = ctx.createGain()
    o1.connect(g1); g1.connect(ctx.destination)
    o1.type = 'sawtooth'; o1.frequency.setValueAtTime(80, t); o1.frequency.exponentialRampToValueAtTime(40, t + 0.3)
    g1.gain.setValueAtTime(0.3, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    o1.start(t); o1.stop(t + 0.3)
    const o2 = ctx.createOscillator(), g2 = ctx.createGain()
    o2.connect(g2); g2.connect(ctx.destination)
    o2.type = 'sine'; o2.frequency.setValueAtTime(1200, t + 0.05); o2.frequency.exponentialRampToValueAtTime(600, t + 0.25)
    g2.gain.setValueAtTime(0.2, t + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    o2.start(t + 0.05); o2.stop(t + 0.3)
  } catch (e) {}
}

export function playYourTurnSound() {
  try {
    const ctx = getCtx(), t = ctx.currentTime
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.setValueAtTime(880, t + i * 0.15)
      g.gain.setValueAtTime(0.15, t + i * 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.1)
      o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.1)
    }
  } catch (e) {}
}

export function playSelectSound() {
  try {
    const ctx = getCtx(), t = ctx.currentTime
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1000, t)
    gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.start(t); osc.stop(t + 0.05)
  } catch (e) {}
}
