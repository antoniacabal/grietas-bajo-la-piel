// Indice
    // 0. Categorías
    // 1. Pop-up tipo captcha
    // 2. Minijuego

// Categorías mentales rápidas (técnica de anclaje): te dan una categoría y tienes que elegir sus 6 elementos lo más rápido posible.
// Pensar en una tarea concreta obliga a la mente a salir del bucle de la ansiedad. Se ve como un captcha: una cuadrícula de opciones
import { CONFIG } from './config.js'

// 0. Categorías: items = los que sí son (salen 6 al azar) · others = los que no (relleno)
// OTROS: objetos cualquiera (relleno de las categorías con emojis) · OTROS2: palabras cualquiera (relleno de las de texto). Ninguno es fruta,
// animal, deporte, instrumento, país, comida ni color: así nunca se confunden con las respuestas
const OTROS = ['🚗', '📚', '✏️', '👟', '⏰', '🎈', '🪑', '☂️', '🔑', '💡', '🧦', '📱', '🧸', '🎒', '🕯️', '🧲', '🪣', '🧹', '🪥', '🧽', '📎', '✂️', '🔨', '🪜',
    '🛏️', '🚪', '🪞', '🧴', '👓', '🎩', '🧤', '🧣', '💼', '📦', '🖊️', '📌', '🔦', '🕰️', '🛋️', '🚲', '🛴', '🪁', '🎁', '📷', '💻', '⌚', '🧯', '🪴']
const OTROS2 = ['Mesa', 'Lunes', 'Silla', 'Nube', 'Libro', 'Puerta', 'Arena', 'Ventana', 'Lápiz', 'Martes', 'Cuaderno', 'Escalera', 'Reloj', 'Almohada',
    'Tijeras', 'Zapato', 'Martillo', 'Cortina', 'Espejo', 'Botella', 'Llave', 'Sombrero', 'Bufanda', 'Cuchara', 'Escoba', 'Domingo', 'Maleta',
    'Teléfono', 'Paraguas', 'Bicicleta', 'Lámpara', 'Calcetín', 'Montaña', 'Camino', 'Piedra', 'Cometa', 'Tornillo', 'Peine', 'Toalla']
const CATS = [
    { name: 'frutas', items: ['🍎', '🍌', '🍇', '🍓', '🍍', '🥭', '🍉', '🍑'], others: OTROS },
    { name: 'animales', items: ['🐶', '🐱', '🐴', '🐢', '🦜', '🐘', '🐸', '🐟'], others: OTROS },
    { name: 'deportes', items: ['⚽', '🏀', '🎾', '🏐', '🏓', '⛳', '🏈', '🥊'], others: ['🍎', '🍌', '🐶', '🐱', ...OTROS] },
    { name: 'instrumentos musicales', items: ['🎸', '🎹', '🥁', '🎺', '🎻', '🪗', '🎷'], others: ['🍇', '🐢', '⚽', ...OTROS] },
    { name: 'países que empiezan con M', text: true, items: ['México', 'Marruecos', 'Malasia', 'Mongolia', 'Mónaco', 'Malí', 'Malta'], others: ['Perú', 'Chile', 'Japón', 'Kenia', 'Italia', 'Noruega', 'Canadá', 'Egipto', ...OTROS2] },
    { name: 'países que empiezan con C', text: true, items: ['Colombia', 'Chile', 'Canadá', 'Cuba', 'China', 'Costa Rica', 'Croacia'], others: ['Perú', 'Japón', 'Kenia', 'Italia', 'Noruega', 'Egipto', 'Brasil', 'Argentina', ...OTROS2] },
    { name: 'comidas colombianas', text: true, items: ['Arepa', 'Ajiaco', 'Sancocho', 'Empanada', 'Tamal', 'Buñuelo', 'Bandeja paisa'], others: ['Sushi', 'Pizza', 'Ramen', 'Paella', 'Croissant', 'Lasaña', 'Hamburguesa', 'Falafel', ...OTROS2] },
    { name: 'animales marinos', items: ['🐙', '🐠', '🦀', '🐳', '🦈', '🐬', '🦑', '🐚'], others: ['🐶', '🐱', '🐴', '🐘', '🦒', '🐔', ...OTROS] },
    { name: 'colores', text: true, items: ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Morado', 'Naranja', 'Rosado'], others: ['Perro', ...OTROS2] }
]
const NEED = 6
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// 1. Pop-up tipo captcha (se crea una sola vez dentro de la interfaz del juego)
const panel = document.createElement('div')
panel.className = 'gx-cats'; panel.hidden = true; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Categorías mentales rápidas')
panel.innerHTML = '<div class="gx-cats-head"><span>Selecciona rápido las 6 que sean</span><strong></strong><div class="gx-cats-vidas" role="img" aria-label="Errores: 0 de 3"><i></i><i></i><i></i></div></div><div class="gx-cats-grid"></div>'
document.querySelector('.gx')?.appendChild(panel)
const title = panel.querySelector('strong'), grid = panel.querySelector('.gx-cats-grid')
const vidas = panel.querySelector('.gx-cats-vidas'), puntos = [...vidas.children] // tres círculos: cada error pone uno en rojo

// 2. Minijuego: misma forma que el Earthing (start / stop / update) para que breathing.js lo maneje igual
const MAX_MAL = 3 // con 3 casillas equivocadas en la ronda se pierde
let found = 0, wrong = 0, lostAt = -1, t = 0, last = -1
export const cats = {
    start() {
        let k; do { k = Math.floor(Math.random() * CATS.length) } while (k === last && CATS.length > 1); last = k
        const c = CATS[k], good = shuffle(c.items.slice()).slice(0, NEED), bad = shuffle(c.others.filter(o => !c.items.includes(o))).slice(0, 12 - NEED)
        found = 0; wrong = 0; lostAt = -1; t = 0; puntos.forEach(p => p.classList.remove('gx-cats-vida--mal')); vidas.setAttribute('aria-label', 'Errores: 0 de 3'); title.textContent = c.name
        grid.classList.toggle('gx-cats-grid--texto', !!c.text)
        grid.innerHTML = ''
        shuffle([...good.map(v => [v, true]), ...bad.map(v => [v, false])]).forEach(([v, ok]) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'gx-cats-tile'; b.textContent = v
            b.addEventListener('click', () => {
                if (b.classList.contains('gx-cats-tile--si') || lostAt >= 0) return
                if (ok) { b.classList.add('gx-cats-tile--si'); found++ }
                else { // equivocarse sacude la casilla; a la tercera se pierde (un momento después, para que se vea la sacudida)
                    b.classList.remove('gx-cats-tile--no'); void b.offsetWidth; b.classList.add('gx-cats-tile--no')
                    puntos[wrong]?.classList.add('gx-cats-vida--mal'); vidas.setAttribute('aria-label', `Errores: ${wrong + 1} de ${MAX_MAL}`)
                    if (++wrong >= MAX_MAL) lostAt = t
                }
            })
            grid.appendChild(b)
        })
        panel.hidden = false
    },
    stop() { panel.hidden = true },
    update(dt) {
        t += dt
        const timeLeft = Math.max(0, CONFIG.cats.timeout - t), fill = found / NEED
        if (found >= NEED) return { prompt: '', fill: 1, done: true, timeLeft }
        if (timeLeft <= 0 || (lostAt >= 0 && t - lostAt > 0.45)) return { prompt: '', fill, done: false, timeLeft }
        return { prompt: '', label: `${found} de ${NEED}`, fill, timeLeft }
    }
}
