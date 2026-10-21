// Indice
    // 0. Aviso: música de reemplazo (placeholder)
    // 1. Estado y utilidades
    // 2. Mezcla de música y tensión
    // 3. Inicio del audio
    // 4. Efectos de sonido
    // 5. API pública (audio)

// 0. Aviso: música de reemplazo (placeholder)
// TEMP_AUDIO: sonido procedural para probar; sustituir por archivos en /static/audio
//
// ┌──────────────────────────────────────────────────────────────────────────────┐
// │ ⚠️  PLACEHOLDER · MÚSICA TRANQUILA DEL INICIO                                │
// │ Ahora suena un pad procedural (acorde suave + campanitas) SOLO para probar.  │
// │ Para usar la pista definitiva: guardarla en /static/audio y escribir su      │
// │ ruta en CALM_MUSIC_FILE, por ejemplo '/audio/musica-tranquila.mp3'.          │
// └──────────────────────────────────────────────────────────────────────────────┘
const CALM_MUSIC_FILE = ''

// 1. Estado y utilidades
let ctx, drone, droneGain, calmGain, musicOn = true, fxOn = true, beat = 0, bellT = 3, lastA = 0, mixA = -1
const clamp01 = (v) => Math.min(1, Math.max(0, v))

// 2. Mezcla de música y tensión: la música tranquila domina con poca ansiedad; el drone grave entra cuando la ansiedad sube
function mix(a, force) {
    if (!ctx) return
    if (!force && Math.abs(a - mixA) < 0.01) return
    mixA = a
    calmGain.gain.setTargetAtTime(musicOn ? 0.045 * (1 - clamp01((a - 0.1) / 0.5)) : 0, ctx.currentTime, 0.6) // volumen bajado (antes 0.07 y 0.1)
    droneGain.gain.setTargetAtTime(musicOn ? 0.065 * clamp01((a - 0.08) / 0.8) : 0, ctx.currentTime, 0.4)
}

// 3. Inicio del audio: se llama con el primer gesto del usuario
function init() {
    if (ctx) { ctx.resume(); return }
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    // Tensión: drone grave (empieza en silencio y sube con la ansiedad)
    droneGain = ctx.createGain(); droneGain.gain.value = 0; droneGain.connect(ctx.destination)
    drone = ctx.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 55
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220
    drone.connect(lp); lp.connect(droneGain); drone.start()
    // Calma: música tranquila del inicio (entra suave y se va apagando cuando sube la ansiedad)
    calmGain = ctx.createGain(); calmGain.gain.value = 0; calmGain.connect(ctx.destination)
    if (CALM_MUSIC_FILE) {
        const el = new Audio(CALM_MUSIC_FILE); el.loop = true
        ctx.createMediaElementSource(el).connect(calmGain); el.play().catch(() => {})
    } else {
        console.warn('[PLACEHOLDER] Música tranquila: suena un pad procedural de prueba. Reemplazar por la pista definitiva (ver CALM_MUSIC_FILE en audio.js).')
        const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 900
        const trem = ctx.createGain(); trem.gain.value = 0.8
        soft.connect(trem); trem.connect(calmGain)
        ;[130.81, 164.81, 196.0, 246.94].forEach((f, i) => { // acorde de do mayor con séptima
            const o = ctx.createOscillator(), g = ctx.createGain()
            o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4; g.gain.value = 0.22
            o.connect(g); g.connect(soft); o.start()
        })
        const lfo = ctx.createOscillator(), lg = ctx.createGain() // respiración lenta del volumen
        lfo.frequency.value = 0.12; lg.gain.value = 0.2; lfo.connect(lg); lg.connect(trem.gain); lfo.start()
    }
    mix(lastA, true)
}

// 4. Efectos de sonido
function blip(freq, dur = 0.25, vol = 0.08, type = 'sine') {
    if (!ctx || !fxOn || !isFinite(freq)) return
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur)
}
function bell() { // campanita suave de la música tranquila (nota al azar de una escala pentatónica)
    const f = [523.25, 587.33, 659.25, 783.99, 880][Math.floor(Math.random() * 5)], t = ctx.currentTime
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = f
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
    o.connect(g); g.connect(calmGain); o.start(t); o.stop(t + 2.7)
}

// 5. API pública (audio)
// Sonidos grabados (static/audios): el terremoto y la sirena. Pasan por el mismo audio del juego, así que la pausa y "Música: OFF" también los afectan
const playing = new Set()
function playFile(url, { volume = 0.7, loop = false } = {}) {
    if (!ctx || !fxOn) return null
    const el = new Audio(url), g = ctx.createGain(); el.loop = loop; g.gain.value = volume
    ctx.createMediaElementSource(el).connect(g); g.connect(ctx.destination)
    const snd = {
        el, g,
        fade(d = 1.5) { // se apaga despacio (curva suave hasta 0, sin cortes) y se detiene
            const t = ctx.currentTime, v = g.gain.value, curve = new Float32Array(32).map((_, i) => v * Math.cos(i / 31 * Math.PI / 2))
            g.gain.cancelScheduledValues(t); g.gain.setValueCurveAtTime(curve, t, d); setTimeout(() => snd.stop(), d * 1000 + 300)
        },
        stop() { el.pause(); playing.delete(snd) }
    }
    el.addEventListener('ended', () => playing.delete(snd)); el.play().catch(() => {}); playing.add(snd)
    return snd
}

export const audio = {
    playFile,
    init, blip,
    setMusic(v) { musicOn = v; mix(lastA, true) },
    setFx(v) { fxOn = v; if (!v) playing.forEach(p => p.stop()) },
    setPaused(v) { if (ctx) v ? ctx.suspend() : ctx.resume(); playing.forEach(p => v ? p.el.pause() : p.el.play().catch(() => {})) }, // pausa universal: detiene todo el audio,
    setIntensity(a) { lastA = a; if (!ctx) return; drone.frequency.value = 55 + a * 20; mix(a) },
    update(dt, anxiety) {
        beat -= dt // latido que se acelera con la ansiedad
        if (beat <= 0 && anxiety > 0.2) { blip(60, 0.18, 0.1 * anxiety + 0.03); beat = 1.1 - 0.7 * anxiety }
        bellT -= dt // campanitas de la música tranquila (solo con poca ansiedad y sin pista definitiva)
        if (bellT <= 0) { bellT = 2.2 + Math.random() * 2.6; if (ctx && musicOn && !CALM_MUSIC_FILE && anxiety < 0.45) bell() }
    },
    ring(dur = 4) { // pitido en los oídos después del golpe del sismo
        if (!ctx || !fxOn) return
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime
        o.type = 'sine'; o.frequency.value = 3100
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur)
    },
    breathCue(phase) { blip(300 + (phase % 4) * 40, 0.4, 0.06) },
    result(ok) { blip(ok ? 523 : 140, 0.5, 0.1, ok ? 'sine' : 'square') }
}