// Indice
    // 0. Imports
    // 1. Técnicas de autorregulación
    // 2. Estado y controles
    // 3. Elección al azar
    // 4. API pública (breathing)

// 0. Imports
import { CONFIG, runtime } from './config.js'
import { GAMES } from './minigames.js'

// 1. Técnicas de autorregulación (page = sección de respiracion-consciente.html que la explica)
const S = (l, d, f, t, lab) => ({ l, d, f, t, lab }) // lab: rótulo propio del medidor (si no, Inhalar / Sostener / Exhalar / Pausa)
const HOLD = 'Mantén el clic (o la barra espaciadora) al inhalar y sostener; suéltalo al exhalar y en la pausa. El reloj cuenta los segundos de cada fase: cambia justo cuando llega a 0.'
const R = 'respiracion-consciente.html#respira'
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
// Las mismas técnicas que explica la página de respiración consciente. En los minijuegos salen 5 (box, labios fruncidos, exhalación
// prolongada, igualitaria y suspiro fisiológico); las marcadas extra solo se pueden jugar desde el panel ?debug
export const TECHS = [
    { id: 'box', name: 'Respiración en caja (4-4-4-4)', page: R, help: HOLD + ' (4 s · 4 s · 4 s · 4 s)', segs: [S('Inhala por la nariz', 4, 0, 1), S('Retén el aire', 4, 1, 1), S('Exhala por la boca', 4, 1, 0), S('Mantén los pulmones vacíos', 4, 0, 0)] },
    { id: 'exhale', name: 'Exhalación prolongada', page: R, help: HOLD,
        build: () => { const ex = Math.random() < 0.5 ? 6 : 8; return { name: `Exhalación prolongada (4-${ex})`, help: HOLD + ` (4 s · ${ex} s)`, segs: [S('Inhala por la nariz', 4, 0, 1), S('Exhala despacio por la boca', ex, 1, 0)] } } }, // ritmo 4-6 o 4-8 al azar
    { id: 'diaphragm', extra: true, name: 'Respiración diafragmática', page: R, help: HOLD,
        build: () => { const i = ri(3, 4), e = ri(4, 6); return { name: `Respiración diafragmática (${i}-${e})`, help: HOLD + ` (${i} s · ${e} s)`, segs: [S('Inhala llevando el aire al abdomen', i, 0, 1), S('Suelta el aire despacio', e, 1, 0)] } } }, // 3-4 s al inhalar, 4-6 s al soltar
    { id: 'lips', name: 'Respiración con labios fruncidos (2-4)', page: R, help: HOLD + ' (2 s · 4 s)', segs: [S('Inhala suave por la nariz', 2, 0, 1), S('Exhala por la boca con los labios fruncidos', 4, 1, 0)] },
    { id: 'equal', name: 'Respiración igualitaria (4-4)', page: R, help: HOLD + ' (4 s · 4 s)', segs: [S('Inhala por la nariz', 4, 0, 1), S('Exhala por la nariz', 4, 1, 0)] },
    { id: 'deep', extra: true, name: 'Relajación profunda (4-4-6-2)', page: R, help: HOLD + ' (4 s · 4 s · 6 s · 2 s)', segs: [S('Inhala por la nariz', 4, 0, 1), S('Mantén el aire', 4, 1, 1), S('Exhala despacio', 6, 1, 0), S('Pausa', 2, 0, 0)] },
    { id: '478', extra: true, name: 'Técnica 4-7-8', page: R, help: HOLD + ' (4 s · 7 s · 8 s)', segs: [S('Inhala por la nariz hacia el abdomen', 4, 0, 1), S('Sostén la respiración', 7, 1, 1), S('Exhala por la boca con un soplido suave', 8, 1, 0)] },
    { id: 'sigh', name: 'Suspiro fisiológico', page: R, help: HOLD + ' (inhala, un sorbo más de aire y exhala muy lento)', segs: [S('Inhala profundo por la nariz', 3, 0, 0.8), S('Sin soltar: otro sorbo corto de aire', 1, 0.8, 1, 'Otro sorbo'), S('Exhala muy despacio por la boca', 6, 1, 0)] },
    { id: 'earth', name: 'Earthing físico', page: 'respiracion-consciente.html#categorias', help: 'Camina (WASD, flechas o el joystick) hasta el pasto, a un lado del camino, y quédate sobre él respirando lento. Solo ahí baja tu ansiedad.', game: 'earth' },
    { id: 'cats', name: 'Categorías mentales rápidas', page: 'respiracion-consciente.html#anclaje', help: 'Elige lo más rápido que puedas los 6 elementos de la categoría. Si te equivocas 3 veces, pierdes la ronda.', game: 'cats' }
]
const actionOf = (seg) => seg.t > seg.f || (seg.t === seg.f && seg.t > 0.5) ? 'hold' : 'release' // qué debe hacer el jugador en cada tramo
const faseOf = (seg) => seg.t > seg.f ? 'inhale' : seg.t < seg.f ? 'exhale' : seg.t > 0.5 ? 'hold' : 'pause' // para los colores del medidor (inhalar, sostener, exhalar, pausa)
const labelOf = (seg) => seg.lab || (seg.t > seg.f ? 'Inhalar' : seg.t < seg.f ? 'Exhalar' : seg.t > 0.5 ? 'Sostener' : 'Pausa') // lo que dice el rótulo del medidor (Pausa = pulmones vacíos)

// 2. Estado y controles: clic o espacio sostenidos (los botones y pop-ups no cuentan como "inhalar")
let forced = null, active = false, tech = null, picked = null, last = -1, si = 0, st = 0, L = 0, good = 0, total = 0, holding = false, hooks = {}, lead = 0
const set = (h) => { holding = h }
const ignored = (e) => e.target?.closest?.('button, .gx-modal, .gx-talk, .gx-card, .gx-joy, .gx-cats') // el joystick camina, no respira
addEventListener('pointerdown', (e) => { if (!runtime.paused && !ignored(e)) set(true) }); addEventListener('pointerup', () => set(false)); addEventListener('pointercancel', () => set(false)); addEventListener('blur', () => set(false))
addEventListener('keydown', (e) => { if (e.code === 'Space') { if (!runtime.paused) set(true); if (active) e.preventDefault() } })
addEventListener('keyup', (e) => { if (e.code === 'Space') set(false) })
const finish = (ok) => { breathing.stop(); hooks.onCycle?.(ok) }

// 3. Elección al azar: primero el tipo de minijuego (respiración, Earthing o categorías) y después la técnica.
//    Antes cada técnica pesaba lo mismo y como hay 5 respiraciones, casi siempre salía una: ahora Earthing y categorías salen más seguido.
//    El mismo tipo dos veces seguidas es menos probable, y nunca la misma técnica que acaba de salir
const PESOS = { casa: { hold: 0.4, cats: 0.6 }, calle: { hold: 0.26, earth: 0.32, cats: 0.42 }, mio: { hold: 0.3, earth: 0.24, cats: 0.46 } } // categorías: el más frecuente
const kindOf = (t) => t.game || 'hold'
const randomPick = (space, noEarth) => {
    const pesos = { ...PESOS[indoors(space) ? 'casa' : space === 'BUS' ? 'mio' : 'calle'] }
    if (noEarth) delete pesos.earth
    const prev = TECHS[last] ? kindOf(TECHS[last]) : null
    if (prev && pesos[prev] && Object.keys(pesos).length > 1) pesos[prev] *= 0.4
    let r = Math.random() * Object.values(pesos).reduce((a, b) => a + b, 0), kind = Object.keys(pesos)[0]
    for (const k in pesos) { if ((r -= pesos[k]) <= 0) { kind = k; break } }
    const ok = TECHS.map((_, i) => i).filter(i => !TECHS[i].extra && kindOf(TECHS[i]) === kind && (i !== last || kind !== 'hold'))
    return ok[Math.floor(Math.random() * ok.length)]
}
const indoors = (space) => space === 'HOUSE' || space === 'HOME' // en la casa no hay pasto

// 4. API pública (breathing)
export const breathing = {
    init(h) { hooks = h },
    force(id) { forced = id }, // la próxima crisis usa esta técnica (debug)
    pick(space, noEarth = false) { // noEarth: ya salió dos veces seguidas (main.js lleva la cuenta)
        let i; if (forced) { i = Math.max(0, TECHS.findIndex(t => t.id === forced)); forced = null } // modo ?debug: elegir el minijuego
        else i = randomPick(space, noEarth)
        last = i; picked = TECHS[i].build ? { ...TECHS[i], ...TECHS[i].build() } : TECHS[i] // build: la exhalación elige 4-6 o 4-8 cada vez
        // toda técnica de respiración puede hacerse una vez o dos seguidas (al azar)
        if (picked.segs && Math.random() < 0.5) picked = { ...picked, segs: [...picked.segs, ...picked.segs], help: picked.help.replace(/\)$/, ', dos veces)') }
        runtime.techId = picked.id; return picked
    },
    prepare() { return picked || this.pick(runtime.space) }, // la técnica que toca (se elige si aún no hay una)
    start() {
        tech = picked || this.pick(runtime.space); picked = null; active = true; si = 0; st = 0; L = 0; good = total = 0; lead = CONFIG.breathing.lead
        Object.assign(runtime, { techName: tech.name, techHelp: tech.help, techId: tech.id, level: 0, target: 0, stepFill: 0, breathProgress: 0, prompt: '', action: '', label: '', timeLeft: tech.segs ? tech.segs[0].d : CONFIG.earth.timeout })
        if (tech.game) GAMES[tech.game].start()
    },
    stop() { active = false; runtime.phase = ''; runtime.action = ''; runtime.label = ''; runtime.cue = false; runtime.count = 0; if (tech?.game) GAMES[tech.game].stop() },
    get active() { return active },
    update(dt) {
        if (!active) return
        const B = CONFIG.breathing
        if (tech.game) { // minijuegos
            const r = GAMES[tech.game].update(dt)
            Object.assign(runtime, { prompt: r.prompt, label: r.label || '', fase: '', stepFill: r.fill, target: -1, breathProgress: r.fill, action: '', timeLeft: r.timeLeft })
            if (r.done !== undefined) finish(r.done)
            return
        }
        const seg = tech.segs[si]
        if (lead > 0) { lead -= dt; Object.assign(runtime, { level: 0, target: 0, prompt: '', label: labelOf(seg), fase: faseOf(seg), count: Math.max(1, Math.ceil(lead)), action: '', cue: false, breathProgress: 0, timeLeft: seg.d }); return } // cuenta 3, 2, 1 antes de que el aro empiece a moverse
        st += dt
        const target = seg.f + (seg.t - seg.f) * Math.min(st / seg.d, 1)
        // la barra sube mientras mantienes y baja al soltar, a la misma velocidad que la aguja en ese tramo
        const slope = (seg.t - seg.f) / seg.d, upV = slope > 0 ? slope : B.rate, downV = slope < 0 ? -slope : B.rate
        L = Math.min(1, Math.max(0, L + (holding ? upV : -downV) * dt))
        // se califica el timing: mantener al inhalar y sostener, soltar al exhalar y en la pausa (al empezar cada fase hay un margen de B.grace s)
        total += dt; if (st < B.grace || holding === (actionOf(seg) === 'hold')) good += dt
        // soltar antes de tiempo (al inhalar o sostener) hasta salirse de la franja gris clara: se pierde en el acto
        if (actionOf(seg) === 'hold' && !holding && st >= B.grace && L < target - B.tol) return finish(false)
        // aviso de repetición: si después de esta exhalación se vuelve a inhalar, el aro brilla amarillo dos veces justo antes del cambio
        const left = seg.d - st, again = seg.t < seg.f && tech.segs[si + 1]?.t > tech.segs[si + 1]?.f, cue = again && ((left <= 1.3 && left > 0.95) || (left <= 0.6 && left > 0.25))
        Object.assign(runtime, { level: L, target, prompt: seg.l, label: labelOf(seg), action: actionOf(seg), fase: faseOf(seg), cue, count: 0, breathProgress: L, timeLeft: Math.max(0, seg.d - st) }) // el reloj cuenta los segundos de la fase (4, 6 u 8)
        if (st >= seg.d) {
            // al terminar de inhalar, la barra tiene que estar en la franja gris: si no, el minijuego se pierde (premia el buen timing)
            if (seg.t > seg.f && L < seg.t - B.tol) return finish(false)
            si++; st = 0; hooks.onPhase?.(si); if (si >= tech.segs.length) finish(good / total >= B.pass)
        }
    }
}