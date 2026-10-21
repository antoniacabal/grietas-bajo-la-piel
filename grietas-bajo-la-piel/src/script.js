/* Indice

    0. Imports
    1. Menu desplegable (y desplazamiento suave a las secciones)
    2. Ventana de advertencia (index.html)
    3. Muestra 3D del juego (index.html)
        3.1 Canvas
        3.2 Escena
        3.3 Luces
        3.4 Objetos: cuarto de prueba (Cuarto-prueba.fbx) y protagonista (Personaje.fbx, con su esqueleto y su pose)
        3.5 Tamaños
        3.6 Camara
        3.7 Controles
        3.8 Render
        3.9 Animacion
    4. Color del scroll
    5. Juego
    6. Mapa de apoyo
    7. Techo que se derrumba
    7.1 Flecha hacia abajo (index.html)
    8. Inicio

*/

// 0. Imports -----------------
import './style.css'


// 1. Menu desplegable -----------------
function iniciarMenu() {
    var boton = document.querySelector('.menu-boton');
    var panel = document.getElementById('menu-panel');
    if (!boton || !panel) return;

    function abrir(valor) {
        panel.hidden = !valor;
        boton.setAttribute('aria-expanded', String(valor));
        boton.classList.toggle('menu-boton--abierto', valor);
    }

    boton.addEventListener('click', function () {
        abrir(panel.hidden);
    });

    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', function (e) {
        if (!panel.hidden && !e.target.closest('.menu')) abrir(false);
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !panel.hidden) {
            abrir(false);
            boton.focus();
        }
    });

    // Cerrar al elegir un enlace
    panel.addEventListener('click', function (e) {
        if (e.target.closest('a')) abrir(false);
    });
}

function iniciarDesplazamientoSuave() {
    var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.addEventListener('click', function (e) {
        var enlace = e.target.closest('a[href*="#"]');
        if (!enlace || enlace.target === '_blank') return;
        var url = new URL(enlace.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return; // solo enlaces a esta misma página
        var destino = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!destino) return;
        e.preventDefault();
        destino.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth' });
        history.pushState(null, '', url.hash);
    });
}

// 2. Ventana de advertencia -----------------
    // (index.html)
function iniciarAdvertencia() {
    const dialogo = document.getElementById('advertencia')
    const botonIniciar = document.getElementById('boton-iniciar')

    if (dialogo && botonIniciar) {
        const botonVolver = dialogo.querySelector('[data-volver]')
        const animacionesAviso = ['advertencia-sacudida', 'advertencia-destello']

        // Sacude la caja para recordar que hay que elegir una opción
        const sacudir = () => {
            dialogo.classList.remove('sacudir')
            void dialogo.offsetWidth
            dialogo.classList.add('sacudir')
        }

        dialogo.addEventListener('animationend', (evento) => {
            if (animacionesAviso.includes(evento.animationName)) {
                dialogo.classList.remove('sacudir')
            }
        })

        botonIniciar.addEventListener('click', () => {
            dialogo.classList.remove('sacudir')
            dialogo.showModal()
            document.documentElement.classList.add('modal-abierto')
        })

        // Volver
        botonVolver.addEventListener('click', () => dialogo.close())

        // No cierra y se sacude
        dialogo.addEventListener('pointerdown', (evento) => {
            if (evento.target === dialogo) sacudir()
        })

        // Tecla Esc: tampoco cierra
        dialogo.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape') {
                evento.preventDefault()
                sacudir()
            }
        })

        dialogo.addEventListener('cancel', (evento) => {
            evento.preventDefault()
            sacudir()
        })

        // Se dispara al cerrar
        dialogo.addEventListener('close', () => {
            document.documentElement.classList.remove('modal-abierto')
        })
    }
}

// 3. Muestra 3D del juego -----------------
    //  (index.html)
async function iniciarMuestra() {
    const canvas = document.querySelector('.escena-canvas canvas.webgl')
    if (!canvas) return

    const THREE = await import('three')
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')

    // 3.1 Canvas -----------------
    const contenedor = canvas.parentElement

    // 3.2 Escena -----------------
    const scene = new THREE.Scene()

    // 3.3 Luces -----------------
    const luzAmbiente = new THREE.AmbientLight(0x8890b0, 0.9)
    scene.add(luzAmbiente)

    const luzSol = new THREE.DirectionalLight(0xffffff, 0.9)
    luzSol.position.set(5, 10, 4)
    scene.add(luzSol)

    // Luz roja: solo se enciende en el glitch de ansiedad (3.9)
    const luzTension = new THREE.PointLight(0xff3a2a, 0, 12)
    luzTension.position.set(0, 3, 0)
    scene.add(luzTension)

    // 3.4 Objetos: cuarto de prueba y protagonista -----------------
        // El cuarto de Gabriela sin paredes (Cuarto-prueba.fbx) como piso de la muestra, con ella de pie en medio, ansiosa.
        // Misma escala y colores del juego (environment.js), para que la muestra se vea como el juego
        const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js')
        const SH = 0.0065 // escala del cuarto en el juego
        const COLORES = { Pared: '#A6869B', suelo: '#BF895A', Suelo: '#BF895A', Cafe: '#A16A49', 'Cafe claro': '#BF895A', Naranja: '#BF4E24', Colchon: '#A6869B', Cortina: '#F2C063', Amarillo: '#F2C063', Material: '#799180', Salida: '#71708A' }
        // pareja de ansiedad de cada color (la misma de environment.js): en el glitch el cuarto cambia a estos colores
        const TENSOS = { '#A6869B': '#482642', '#BF895A': '#580213', '#A16A49': '#201826', '#BF4E24': '#580213', '#F2C063': '#580213', '#799180': '#482642', '#71708A': '#201826' }
        const pintura = {}, tonos = []
        const pintar = (m) => {
            if (pintura[m.name]) return pintura[m.name]
            const calma = COLORES[m.name] || '#A16A49', mat = new THREE.MeshStandardMaterial({ color: calma })
            tonos.push({ mat, calma: new THREE.Color(calma), tenso: new THREE.Color(TENSOS[calma] || '#201826') })
            return pintura[m.name] = mat
        }
        const paleta = (k) => tonos.forEach(({ mat, calma, tenso }) => mat.color.copy(calma).lerp(tenso, k)) // 0: calma · 1: ansiedad
        const cuarto = new THREE.Group()
        scene.add(cuarto)
        const contornoMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), contornos = []
        // piso más grueso: una losa debajo del piso del modelo, del mismo color (también cambia en el glitch)
        // del mismo tamaño que la base del modelo (en el archivo va de x -371.4 a 369.4 y de z -329.5 a 328.9) y justo debajo de ella: al ras
        const losa = new THREE.Mesh(new THREE.BoxGeometry(740.8 * SH, 0.34, 658.4 * SH), pintar({ name: 'suelo' }))
        losa.position.set((-1 + 19) * SH, -22 * SH - 0.17, (-0.3 + 5) * SH); cuarto.add(losa)
        // contorno de la losa: las aristas de los lados y de abajo, no las de arriba (esas coinciden con la base y se veía una raya)
        const losaContorno = (() => {
            const p = new THREE.EdgesGeometry(losa.geometry).attributes.position, quedan = []
            for (let i = 0; i < p.count; i += 2) if (!(p.getY(i) > 0.1 && p.getY(i + 1) > 0.1)) quedan.push(p.getX(i), p.getY(i), p.getZ(i), p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1))
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(quedan, 3)); return new THREE.LineSegments(g, contornoMat)
        })()
        losaContorno.visible = false; losa.add(losaContorno); contornos.push(losaContorno)
        // el celular sobre el escritorio, en el mismo lugar que en el juego (environment.js: R0.x - 290 · SH, 1.02, -0.25; aquí el cuarto está corrido 19 · SH y 5 · SH)
        const celular = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.5), pintar({ name: 'Colchon' }))
        celular.position.set((-290 + 19) * SH, 1.02, -0.25 + 5 * SH); cuarto.add(celular)
        const celularContorno = new THREE.LineSegments(new THREE.EdgesGeometry(celular.geometry), contornoMat); celularContorno.visible = false; celular.add(celularContorno); contornos.push(celularContorno)
        new FBXLoader().load('assets/casa/cuarto/Cuarto-prueba.fbx', (o) => {
            const sobra = []; o.traverse(c => { if (c.isLight || c.isCamera) sobra.push(c) }); sobra.forEach(c => c.removeFromParent()) // luces y cámaras de Blender
            o.traverse(c => { if (c.isMesh) c.material = Array.isArray(c.material) ? c.material.map(pintar) : pintar(c.material) })
            o.scale.setScalar(SH)
            o.position.set(19 * SH, -24 * SH, 5 * SH) // centrado (el archivo va de x -407 a 369 y de z -340 a 329) y con el piso (y = 24) en 0
            cuarto.add(o)
            // contorno blanco de cada mueble: solo se ve en el glitch (los colores de ansiedad son muy oscuros y el cuarto se perdía en el fondo)
            o.updateMatrixWorld(true)
            // (sin los bordes de abajo de la base: ahí se junta con la losa y quedaba una raya blanca en medio del piso)
            const aArchivo = new THREE.Matrix4(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), inversa = o.matrixWorld.clone().invert()
            o.traverse(c => {
                if (!c.isMesh) return
                const bordes = new THREE.EdgesGeometry(c.geometry, 35), p = bordes.attributes.position, quedan = []
                aArchivo.multiplyMatrices(inversa, c.matrixWorld)
                for (let i = 0; i < p.count; i += 2) {
                    v1.fromBufferAttribute(p, i).applyMatrix4(aArchivo); v2.fromBufferAttribute(p, i + 1).applyMatrix4(aArchivo)
                    if (v1.y < 4 && v2.y < 4) continue // borde de abajo de la base (y = 2 en el archivo)
                    quedan.push(p.getX(i), p.getY(i), p.getZ(i), p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1))
                }
                const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(quedan, 3))
                const l = new THREE.LineSegments(g, contornoMat); l.visible = false; c.add(l); contornos.push(l)
            })
        })

        // Gabriela (assets/protagonista/Personaje.fbx). MUESTRA: es una copia del armado del juego (game/personaje.js), para que la
        // muestra no dependa de los archivos del juego. El archivo no trae huesos (está en pose de T): se le arma un esqueleto
        // y cada vértice se pega al hueso de su zona. Si cambia el modelo, actualizar las dos copias
        const comoEnBlender = (c) => { const crudo = {}; c.getRGB(crudo, THREE.SRGBColorSpace); return new THREE.Color().setRGB(crudo.r, crudo.g, crudo.b, THREE.LinearSRGBColorSpace) }
        const materialDe = (m) => new THREE.MeshStandardMaterial({ color: comoEnBlender(m.color), roughness: 0.8, side: THREE.DoubleSide })

        // Esqueleto (en unidades del archivo: pies en y = 0, frente hacia +z, brazos estirados en x). x > 0 = lado "I", x < 0 = lado "D"
        const MODELO = 140 // alto del archivo
        const JOINTS = {
            raiz: [null, 0, 0, 0], cadera: ['raiz', 0, 42, 0], espalda: ['cadera', 0, 56, 0], cabeza: ['espalda', 0, 81, 0],
            brazoI: ['espalda', 14, 75, 0], antebrazoI: ['brazoI', 33, 74, 0], brazoD: ['espalda', -14, 75, 0], antebrazoD: ['brazoD', -33, 74, 0], // hombro arriba del brazo y codo a la mitad: al bajar el brazo no se abre un hueco en el hombro
            // codos de ayuda: en el mismo lugar que el antebrazo, giran la mitad que él (ver codos). La manga del codo se pega a ellos: así al doblar
            // el brazo se curva en vez de aplastarse
            codoI: ['brazoI', 33, 74, 0], codoD: ['brazoD', -33, 74, 0],
            musloI: ['cadera', 8, 40, 0], piernaI: ['musloI', 8, 20, 0], musloD: ['cadera', -8, 40, 0], piernaD: ['musloD', -8, 20, 0],
            // manos (medidas sobre el modelo: la muñeca en |x| 47, la palma hasta 55 con el pulgar hacia adelante, los dedos hasta 64)
            // los dedos tienen dos partes (nudillos y la mitad del dedo): con las dos dobladas la mano cierra el puño
            manoI: ['antebrazoI', 47, 74, -3], dedosI: ['manoI', 55, 74, -4], dedos2I: ['dedosI', 59.5, 74, -4], pulgarI: ['manoI', 49, 73, 1],
            manoD: ['antebrazoD', -47, 74, -3], dedosD: ['manoD', -55, 74, -4], dedos2D: ['dedosD', -59.5, 74, -4], pulgarD: ['manoD', -49, 73, 1],
            // pies (el tobillo a 8 de alto, el zapato va del talón en z -15 a la punta en z +13)
            pieI: ['piernaI', 8, 8, -2], puntaI: ['pieI', 8, 3, 5], pieD: ['piernaD', -8, 8, -2], puntaD: ['pieD', -8, 3, 5],
            // puntas (sin peso): solo marcan dónde termina cada hueso (el visor del debug dibuja la línea hasta aquí)
            dedosFinI: ['dedos2I', 64, 74, -4], pulgarFinI: ['pulgarI', 53, 73, 7], dedosFinD: ['dedos2D', -64, 74, -4], pulgarFinD: ['pulgarD', -53, 73, 7],
            puntaFinI: ['puntaI', 8, 2, 13], puntaFinD: ['puntaD', -8, 2, 13], coronilla: ['cabeza', 0, 128, 0]
        }
        const NAMES = Object.keys(JOINTS)
        const paso = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) } // 0 → 1 suave entre a y b
        // los codos de ayuda giran la mitad que el antebrazo (se llama después de cada pose)
        const codos = (meta) => { meta.codoI.copy(meta.antebrazoI).multiplyScalar(0.5); meta.codoD.copy(meta.antebrazoD).multiplyScalar(0.5) }
        // A qué huesos pertenece un vértice (con mezcla en las articulaciones, para que no se rompa la malla al doblarse).
        // Escribe directo en idx / w (hasta 4 huesos por vértice), sin crear arreglos: la falda tiene ~100 000 vértices
        const B = Object.fromEntries(Object.keys(JOINTS).map((n, i) => [n, i]))
        function pesos(malla, x, y, z, idx, w, o) {
            const I = x >= 0, ax = Math.abs(x)
            const pon = (k, b, v) => { idx[o + k] = b; w[o + k] = v }
            if (/^\d+$/.test(malla)) return pon(0, B.cabeza, 1)                                  // pelo
            if (malla === 'Falda') return pon(0, B.cadera, 1)
            const pie = () => { // tobillo (de y 11 a 7) y punta del pie (z > 2): zapatos, medias y piel
                const a = 1 - paso(7, 11, y), t = paso(2, 6, z)
                pon(0, I ? B.piernaI : B.piernaD, 1 - a); pon(1, I ? B.pieI : B.pieD, a * (1 - t)); pon(2, I ? B.puntaI : B.puntaD, a * t)
            }
            if (malla === 'Zapatos') return pie()
            if (malla !== 'Medias' && y < 86 && ((y > 64 && ax > 12) || (y > 58 && ax > 16))) { // mangas y brazos (en pose de T, horizontales): el hombro empieza en |x| 12 por arriba;
                const h = paso(12, 20, ax)                                                          // por debajo de la axila el costado del torso (|x| < 16) no es brazo
                if (ax > 44) { // mano: muñeca (|x| 44 a 48), pulgar (adelante, z > 1) y dedos (|x| > 55, la segunda parte desde |x| 59)
                    const m = paso(44, 48, ax), t = ax < 58 ? paso(0.5, 3, z) : 0, d = paso(53, 57, ax) * (1 - t), d2 = paso(58, 61, ax)
                    if (ax < 48) { pon(0, I ? B.antebrazoI : B.antebrazoD, 1 - m); pon(1, I ? B.manoI : B.manoD, m * (1 - t)); pon(2, I ? B.pulgarI : B.pulgarD, m * t); return }
                    pon(0, I ? B.manoI : B.manoD, 1 - t - d); pon(1, I ? B.pulgarI : B.pulgarD, t); pon(2, I ? B.dedosI : B.dedosD, d * (1 - d2)); pon(3, I ? B.dedos2I : B.dedos2D, d * d2); return
                }
                // el codo pasa del brazo al codo de ayuda (|x| 27 a 31) y de él al antebrazo (|x| 35 a 39)
                const c1 = paso(27, 31, ax), c2 = paso(35, 39, ax)
                pon(0, y >= 62 ? B.espalda : B.cadera, 1 - h); pon(1, I ? B.brazoI : B.brazoD, h * (1 - c1)); pon(2, I ? B.codoI : B.codoD, h * c1 * (1 - c2)); pon(3, I ? B.antebrazoI : B.antebrazoD, h * c2); return
            }
            if (y < 12) return pie()
            if (y < 44) { // piernas (la piel y las medias)
                const p = 1 - paso(17, 23, y), m = paso(36, 44, y)
                pon(0, I ? B.piernaI : B.piernaD, p); pon(1, I ? B.musloI : B.musloD, (1 - p) * (1 - m)); pon(2, B.cadera, m); return
            }
            const e = paso(52, 60, y), k = paso(78, 85, y)
            pon(0, B.cadera, 1 - e); pon(1, B.espalda, e * (1 - k)); pon(2, B.cabeza, e * k)
        }
        function armar(fbx, escala) {
            const cont = new THREE.Group(), bones = {}
            NAMES.forEach(n => { const [p, x, y, z] = JOINTS[n], b = new THREE.Bone(); b.name = n; const q = p ? JOINTS[p] : [0, 0, 0, 0]; b.position.set(x - q[1], y - q[2], z - q[3]); bones[n] = b; if (p) bones[p].add(b) })
            cont.add(bones.raiz); cont.updateMatrixWorld(true)
            const skeleton = new THREE.Skeleton(NAMES.map(n => bones[n]))
            fbx.updateMatrixWorld(true)
            const mallas = []; fbx.traverse(c => { if (c.isMesh) mallas.push(c) })
            mallas.forEach(c => {
                const g = c.geometry.clone().applyMatrix4(c.matrixWorld), pos = g.attributes.position, n = pos.count
                // Piezas reflejadas en Blender (escala negativa, como un mechón del pelo): al pasarlas al modelo quedan con las caras al revés y
                // se iluminaban por dentro (se veían más oscuras). Se invierte el orden de sus triángulos
                if (c.matrixWorld.determinant() < 0) {
                    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t } g.index.needsUpdate = true }
                    else Object.values(g.attributes).forEach(at => { const k = at.itemSize, a = at.array; for (let i = 0; i < at.count; i += 3) for (let j = 0; j < k; j++) { const t = a[(i + 1) * k + j]; a[(i + 1) * k + j] = a[(i + 2) * k + j]; a[(i + 2) * k + j] = t } at.needsUpdate = true })
                }
                const idx = new Uint16Array(n * 4), w = new Float32Array(n * 4)
                for (let i = 0; i < n; i++) pesos(c.name, pos.getX(i), pos.getY(i), pos.getZ(i), idx, w, i * 4)
                g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4))
                const sm = new THREE.SkinnedMesh(g, Array.isArray(c.material) ? c.material.map(materialDe) : materialDe(c.material))
                sm.frustumCulled = false; sm.bind(skeleton, new THREE.Matrix4()); cont.add(sm)
            })
            // enagua: un disco oscuro dentro de la falda, un poco arriba del borde, pegado a la cadera. Sin él, por debajo de la falda
            // se veía su interior claro (y a través de ella)
            const enagua = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x15111c, roughness: 1 }))
            enagua.scale.set(1.05, 1, 0.82); enagua.position.set(0, 37.5 - 42, -4.3); bones.cadera.add(enagua)
            cont.scale.setScalar(escala)
            return { cont, bones }
        }

        const personaje = new THREE.Group()
        personaje.position.set(0.15, 0.015, 1.0) // al frente del cuarto: el armario no la tapa cuando la muestra gira · 0.015: los zapatos sobre el piso
        personaje.rotation.y = 0.6 // mira un poco hacia la cámara
        cuarto.add(personaje)
        let prota = null
        const ALTO_MUESTRA = 2.15 // un poco más alta que en el juego (1.8): en la muestra se veía muy pequeña al lado de los muebles
        new FBXLoader().load('assets/protagonista/Personaje.fbx', (o) => {
            try { prota = armar(o, ALTO_MUESTRA / MODELO); personaje.add(prota.cont) }
            catch (error) { // si armar el esqueleto falla, igual se ve (quieta, con sus colores)
                console.error('Muestra: no se pudo animar a la protagonista', error)
                o.traverse(c => { if (c.isMesh) c.material = Array.isArray(c.material) ? c.material.map(materialDe) : materialDe(c.material) })
                o.scale.setScalar(ALTO_MUESTRA / MODELO); personaje.add(o)
            }
        }, undefined, (error) => console.error('Muestra: no se pudo cargar Personaje.fbx', error))

        // dedos: k = 0 abiertos, 0.35 relajados, 1.5 puño cerrado (los dedos se doblan hacia la palma y el pulgar se cierra encima)
        function mano(meta, k) {
            meta.dedosI.z = -k; meta.dedosD.z = k
            meta.dedos2I.z = -0.9 * k; meta.dedos2D.z = 0.9 * k                                   // la segunda parte del dedo se dobla casi igual
            meta.pulgarI.y = 0.4 * k; meta.pulgarD.y = -0.4 * k
        }
        // Idle contento (la muestra del index), como un idle alegre de anime: rebota suave doblando las rodillas, con el peso en una pierna y la
        // otra suelta (rodilla adelante y un poco hacia adentro, el talón levantado que sube y baja, apoyada en la punta). Los pies no se
        // despegan del piso: el tobillo compensa lo que se doblan la rodilla y el muslo. Los puños sueltos cerca del mentón, los codos abajo y
        // pegados, rebotando con el cuerpo; cada tanto levanta un puño, mira alrededor o pasa el peso a la otra pierna
        const PIERNA = 20 // largo del muslo y de la pierna (unidades del archivo)
        function posarFeliz(meta, t) {
            const w = paso(-0.25, 0.25, Math.sin(t * 0.35)) * 2 - 1        // 1: peso en la pierna I · -1: en la D (cambia cada ~9 s)
            const rebote = (1 - Math.cos(t * 4.4)) / 2                     // 0 → 1 → 0, unas 0.7 veces por segundo
            const resp = Math.sin(t * 1.8)
            meta.cadera.z = 0.07 * w; meta.espalda.z = -0.06 * w + 0.02 * Math.sin(t * 2.6); meta.espalda.x = -0.03 - 0.03 * rebote
            // piernas: la de apoyo dobla un poco la rodilla al rebotar y el pie queda plano; la libre adelante, con el talón arriba
            const pierna = (lado, libre) => {
                const f = 0.12 + 0.12 * rebote                              // flexión de la rodilla de apoyo
                const talon = libre * (0.35 + 0.25 * Math.max(0, Math.sin(t * 2.6)))  // la pierna libre sube y baja el talón
                const mx = -f - 0.22 * libre, px = 2 * f + 0.25 * libre
                meta['muslo' + lado].x = mx; meta['pierna' + lado].x = px
                meta['pie' + lado].x = -(mx + px) + talon                   // el tobillo deja el pie plano (y en la libre, apoyado en la punta)
                meta['punta' + lado].x = -talon                             // los dedos del pie siguen en el piso
                meta['muslo' + lado].y = (lado === 'I' ? 0.15 : -0.15) * libre // rodilla libre un poco hacia adentro
            }
            const libreI = paso(-1, 1, -w)
            pierna('I', libreI); pierna('D', 1 - libreI)
            meta.musloI.z = meta.musloD.z = -0.07 * w
            // brazos: puños sueltos cerca del mentón, codos abajo y pegados; rebotan con el cuerpo, un poco desfasados entre sí
            meta.brazoI.z = -BRAZO_ABAJO - 0.12; meta.brazoD.z = BRAZO_ABAJO + 0.12
            meta.brazoI.x = -0.72 - 0.1 * Math.sin(t * 4.4 + 0.4); meta.brazoD.x = -0.72 - 0.1 * Math.sin(t * 4.4)
            meta.antebrazoI.y = -2.3; meta.antebrazoD.y = 2.3
            meta.manoI.z = -0.35; meta.manoD.z = 0.35; meta.manoI.x = meta.manoD.x = -0.2
            mano(meta, 1.5)                                                  // puños cerrados
            // cada 7 s levanta un puño, contenta (como cuando celebra)
            const g = t % 7, festeja = Math.max(0, Math.min(1, (g - 4.5) / 0.25, (5.6 - g) / 0.25))
            meta.brazoD.x -= 0.55 * festeja; meta.antebrazoD.y += 0.25 * festeja; meta.cabeza.z = -0.12 * festeja
            // cabeza: ladeada siguiendo el rebote, y mira alrededor de vez en cuando
            const mira = paso(-0.2, 0.2, Math.sin(t * 0.23 + 1)) * 2 - 1
            meta.cabeza.y = 0.3 * mira; meta.cabeza.z += 0.08 * Math.sin(t * 2.6 - 0.5) - 0.04 * w; meta.cabeza.x = -0.06 + 0.04 * rebote + 0.015 * resp
            return alturaFeliz(t)
        }
        // cuánto baja el cuerpo al doblar la rodilla de apoyo (en unidades del juego para alto 1.8): así los pies no se meten en el piso
        const alturaFeliz = (t) => { const f = 0.12 + 0.12 * (1 - Math.cos(t * 4.4)) / 2, v = PIERNA * (Math.cos(f) + Math.cos(f) - 2); return v * 1.8 / MODELO }

        // Sobresalto (player.sobresalto y el visor): dura SALTO s; atras = qué fracción del salto hacia atrás lleva, y = altura (unidades del juego)
        const SALTO = 0.8
        const saltoSusto = (p) => { const a = Math.min(1, Math.max(0, (p - 0.12) / 0.48)); return { atras: paso(0.12, 0.6, p), y: 0.32 * Math.sin(Math.PI * a) - 0.07 * (paso(0, 0.1, p) * (1 - paso(0.1, 0.2, p)) + paso(0.6, 0.66, p) * (1 - paso(0.78, 1, p))) } }

        // Poses de la muestra (cada hueso va suave hacia su giro):
        //   feliz: el idle contento de arriba (posarFeliz, la misma pose del visor del debug)
        //   miedo: durante el glitch se tapa las mejillas con las dos manos, encogida, temblando
        const giro = Object.fromEntries(NAMES.map(n => [n, new THREE.Vector3()])), meta = Object.fromEntries(NAMES.map(n => [n, new THREE.Vector3()]))
        const BRAZO_ABAJO = 1.25
        const posar = (t, modo, dt, rapido = 10) => {
            NAMES.forEach(n => meta[n].set(0, 0, 0))
            meta.brazoI.z = -BRAZO_ABAJO; meta.brazoD.z = BRAZO_ABAJO
            mano(meta, 0.35) // manos relajadas
            let y = 0
            if (modo === 'feliz') {
                y = posarFeliz(meta, t) // idle contento: respira rebotando, pasa el peso de un pie al otro, codos afuera y cada tanto se mece o sube los hombros
            } else if (modo === 'miedo') {
                // la misma pose de miedo del juego (personaje.js): se tapa las mejillas con las dos manos, encogida, temblando y moviendo la cabeza
                const tr = (v) => Math.sin(t * v) * 0.04                       // temblor
                const mece = Math.sin(t * 1.1), niega = Math.sin(t * 1.7)
                meta.cadera.y = 0.12 * mece; meta.cadera.x = 0.05
                meta.espalda.x = 0.25 + tr(31); meta.espalda.y = 0.1 * mece
                meta.cabeza.x = 0.15 + tr(27); meta.cabeza.y = 0.22 * niega + tr(23); meta.cabeza.z = 0.06 * niega
                meta.brazoI.set(-1.0 + tr(29), -0.28, -BRAZO_ABAJO + 0.02); meta.brazoD.set(-1.0 + tr(29), 0.28, BRAZO_ABAJO - 0.02) // codos abajo, al frente
                meta.antebrazoI.set(-0.04, -2.01, 0.03); meta.antebrazoD.set(-0.04, 2.01, -0.03)           // manos a la cara
                meta.manoI.set(-0.95, -0.2, 0.62); meta.manoD.set(-0.95, 0.2, -0.62)                       // las palmas (no el dorso) contra las mejillas
                meta.musloI.x = meta.musloD.x = -0.32; meta.piernaI.x = meta.piernaD.x = 0.6; meta.pieI.x = meta.pieD.x = -0.28
                meta.musloI.y = 0.2; meta.musloD.y = -0.2                                                  // rodillas hacia adentro
                mano(meta, 0.55)                                                                           // los dedos sueltos sobre la cara
                y = -0.03                                                                                  // al encogerse baja lo que se acortan las piernas
            }
            codos(meta) // los codos de ayuda giran la mitad que el antebrazo
            const f = Math.min(1, dt * rapido)
            NAMES.forEach(n => { giro[n].lerp(meta[n], f); prota?.bones[n].rotation.set(giro[n].x, giro[n].y, giro[n].z) })
            personaje.position.y += (0.015 + y - personaje.position.y) * f
        }

    // 3.5 Tamaños -----------------
    const sizes = {
        width: contenedor.clientWidth,
        height: contenedor.clientHeight
    }

    // 3.6 Cámara -----------------
        const radioCuarto = 3.3 // el cuarto mide unos 5 × 5: así se ve más grande
        const margen = 1.05
        const anchoMinimo = radioCuarto * 2 * margen   // ancho visible necesario (~9.1)
        const altoMinimo = 5.6                         // alto visible necesario

        const calcularVista = (relacion) => Math.max(altoMinimo, anchoMinimo / relacion)

        let aspecto = sizes.width / sizes.height
        let vista = calcularVista(aspecto)
        const camera = new THREE.OrthographicCamera(-vista * aspecto / 2, vista * aspecto / 2, vista / 2, -vista / 2, -50, 100)
        scene.add(camera)

        camera.position.set(10, 8.2, 10)
        camera.lookAt(0, 0.9, 0)

    // 3.7 Controles -----------------
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 0.9, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = false
    controls.minZoom = 0.8
    controls.maxZoom = 1.1
    controls.minPolarAngle = Math.PI * 0.1
    controls.maxPolarAngle = Math.PI / 2

    controls.autoRotate = !sinMovimiento
    controls.autoRotateSpeed = 2

    let temporizadorGiro = null

    controls.addEventListener('start', () =>
    {
        clearTimeout(temporizadorGiro)
        controls.autoRotate = false
        canvas.style.cursor = 'grabbing'
    })

    controls.addEventListener('end', () =>
    {
        canvas.style.cursor = 'grab'
        if (sinMovimiento) return
        temporizadorGiro = setTimeout(() => { controls.autoRotate = true }, 2000)
    })

    canvas.style.cursor = 'grab'

    // Pistas de giro y zoom: aparecen en cada visita, después de un rato con la muestra a la vista,
    // y cada una se va cuando el usuario usa ese control (al volver a la página aparecen de nuevo)
    const pistas = contenedor.querySelector('.muestra-pistas')
    const usadas = { giro: false, zoom: false }
    let pistasVisibles = false

    const actualizarPistas = () =>
    {
        if (!pistas) return
        pistas.classList.toggle('mostrar-giro', pistasVisibles && !usadas.giro)
        pistas.classList.toggle('mostrar-zoom', pistasVisibles && !usadas.zoom)
    }

    const usar = (clave) =>
    {
        if (usadas[clave]) return
        usadas[clave] = true
        actualizarPistas()
    }

    if (pistas)
    {
        const aLaVista = () => { const caja = contenedor.getBoundingClientRect(); return caja.bottom > window.innerHeight * 0.3 && caja.top < window.innerHeight * 0.7 }
        const mostrar = () =>
        {
            if (!aLaVista()) return
            pistasVisibles = true
            actualizarPistas()
            window.removeEventListener('scroll', mostrar)
        }
        const programar = () => setTimeout(() => { mostrar(); if (!pistasVisibles) window.addEventListener('scroll', mostrar, { passive: true }) }, 4000) // si la muestra no está a la vista, espera a que vuelvan a ella
        programar()
        window.addEventListener('pageshow', (e) => // al volver con "atrás" el navegador restaura la página tal cual: las pistas vuelven a empezar
        {
            if (!e.persisted) return
            usadas.giro = usadas.zoom = pistasVisibles = false
            actualizarPistas()
            programar()
        })
    }

    // Giro: el ángulo cambió entre que se agarró y se soltó la muestra
    let anguloInicial = null
    controls.addEventListener('start', () => { anguloInicial = [controls.getAzimuthalAngle(), controls.getPolarAngle()] })
    controls.addEventListener('end', () =>
    {
        if (!anguloInicial) return
        const giro = Math.abs(controls.getAzimuthalAngle() - anguloInicial[0]) + Math.abs(controls.getPolarAngle() - anguloInicial[1])
        if (giro > 0.08) usar('giro')
        anguloInicial = null
    })

    // Zoom: rueda del mouse o pellizco con dos dedos (cuenta aunque ya esté en el límite del zoom)
    const dedos = new Set()
    canvas.addEventListener('wheel', () => usar('zoom'), { passive: true })
    canvas.addEventListener('pointerdown', (e) => { dedos.add(e.pointerId); if (dedos.size >= 2) usar('zoom') })
    ;['pointerup', 'pointercancel'].forEach(tipo => canvas.addEventListener(tipo, (e) => dedos.delete(e.pointerId)))

    // 3.8 Render -----------------
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault()) // permite que el navegador lo devuelva (webglcontextrestored): sin esto la muestra desaparecía para siempre
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(sizes.width, sizes.height, false)

    const resizeObserver = new ResizeObserver(() =>
    {
        sizes.width = contenedor.clientWidth
        sizes.height = contenedor.clientHeight

        if (sizes.width === 0 || sizes.height === 0) return

        // Actualizar Camara
        aspecto = sizes.width / sizes.height
        vista = calcularVista(aspecto)
        camera.left = -vista * aspecto / 2
        camera.right = vista * aspecto / 2
        camera.top = vista / 2
        camera.bottom = -vista / 2
        camera.updateProjectionMatrix()

        // Actualizar renderizador (también la resolución: si cambia el zoom del navegador o la pantalla, no queda pixelado)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(sizes.width, sizes.height, false)
    })
    resizeObserver.observe(contenedor)
    window.addEventListener('resize', () => renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))) // el zoom del navegador puede no cambiar el tamaño del contenedor

    // 3.9 Animación -----------------
    const clock = new THREE.Clock()

    const tick = () =>
    {
        const tiempo = clock.getElapsedTime()

        // Glitch de ansiedad: casi siempre el cuarto se ve normal y Gabriela está contenta, pero cada tanto, por un segundo, la imagen
        // "falla": se enciende la luz roja, el cuarto toma los colores de la ansiedad (los del juego) y ella se tapa la cara con miedo.
        // Entra y sale con parpadeos, como una señal que se corta. Si el usuario prefiere menos movimiento, no hay glitch y queda quieta
        const dt = Math.min(0.1, tiempo - (tick.antes ?? tiempo)); tick.antes = tiempo
        const ciclo = tiempo % 7, dentro = ciclo > 5.2 && ciclo < 6.3                      // un segundo de cada siete
        const borde = ciclo < 5.45 || ciclo > 6.05, parpadeo = borde && Math.sin(tiempo * 60) > 0 // al entrar y al salir parpadea
        const glitch = !sinMovimiento && dentro && !parpadeo
        if (glitch !== tick.glitch) { tick.glitch = glitch; paleta(glitch ? 1 : 0); luzAmbiente.intensity = glitch ? 0.55 : 0.9; contornos.forEach(l => { l.visible = glitch }) }
        luzTension.intensity = glitch ? 2.6 + Math.sin(tiempo * 40) * 0.8 : 0
        canvas.style.transform = glitch ? `translate(${(Math.random() * 6 - 3).toFixed(1)}px, ${(Math.random() * 2 - 1).toFixed(1)}px)` : ''
        canvas.style.filter = glitch ? 'contrast(1.15) saturate(1.2)' : ''
        posar(tiempo, sinMovimiento ? "quieta" : glitch || (dentro && tick.glitchVisto) ? "miedo" : "feliz", sinMovimiento ? 1 : dt, glitch ? 12 : 8) // (más suave: con 22 las manos saltaban y se trababan)
        tick.glitchVisto = dentro

        controls.update()

        renderer.render(scene, camera)

        window.requestAnimationFrame(tick)
    }
    tick()
}

// 4. Color del scroll -----------------
function iniciarScroll() {
    if (!document.querySelector('.escena, .footer')) return
    const oscuras = () => document.querySelectorAll('.escena, .derrumbe-espacio, .footer') // (el espacio del derrumbe lo crea la sección 7)

    let pendiente = false

    const revisar = () => {
        pendiente = false
        const alto = window.innerHeight
        let cubierto = 0

        oscuras().forEach((zona) => {
            const caja = zona.getBoundingClientRect()
            cubierto += Math.max(0, Math.min(caja.bottom, alto) - Math.max(caja.top, 0))
        })

        document.documentElement.classList.toggle('scroll-oscuro', cubierto > alto / 2)
    }

    const pedirRevision = () => {
        if (pendiente) return
        pendiente = true
        window.requestAnimationFrame(revisar)
    }

    window.addEventListener('scroll', pedirRevision, { passive: true })
    window.addEventListener('resize', pedirRevision)
    revisar()
}

// 5. Juego -----------------
    // (narrativa.html)
async function iniciarJuego() {
    if (!document.querySelector('canvas.webgl--narrativa')) return

    await import('./game/game.css')
    await import('./game/main.js')
}

// 6. Mapa de apoyo -----------------
    // (index.html) Google Maps con marcadores, filtros y tarjetas propias: ver src/mapa/
async function iniciarMapa() {
    if (!document.getElementById('mapa-apoyo')) return

    const { iniciarMapaApoyo } = await import('./mapa/mapa.js')
    iniciarMapaApoyo()
}

// 7. Techo que se derrumba -----------------
    // (index.html) Debajo de la muestra del juego la página sigue oscura, como un techo de concreto morado.
    // Al bajar, el techo tiembla, se agrieta y se cae a pedazos (con gravedad, piedritas y polvo), como un derrumbe,
    // y debajo aparece el contenido. Arriba queda el borde roto del techo. Va con el scroll: al subir, los pedazos vuelven a su lugar.
    // Se dibuja en un canvas fijo encima de la página, así los pedazos que caen no agrandan la página ni crean scroll
function iniciarDerrumbe() {
    const escena = document.querySelector('.pagina-inicio .escena'), contenido = document.querySelector('.pagina-inicio .contenido')
    if (!escena || !contenido || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const raiz = document.documentElement

    // Espacio oscuro extra entre la muestra y los recursos: ahí ocurre el derrumbe
    const espacio = document.createElement('div'); espacio.className = 'derrumbe-espacio'; espacio.setAttribute('aria-hidden', 'true')
    contenido.before(espacio)
    const lienzo = document.createElement('canvas'); lienzo.className = 'derrumbe'; lienzo.setAttribute('aria-hidden', 'true')
    document.body.append(lienzo)
    const ctx = lienzo.getContext('2d')
    raiz.classList.add('derrumbe-activo')

    const lim = (v) => Math.min(1, Math.max(0, v))
    const tramo = (p, a, b) => lim((p - a) / (b - a)) // 0 → 1 mientras p va de a a b
    const rnd = (a, b) => a + Math.random() * (b - a)
    const GRAVEDAD = 2400 // px/s²
    const ARRIBA = [10, 5, 14], ABAJO = [10, 5, 14] // el techo es del mismo color de la escena (--color-escena): no se nota dónde empieza
    const color = (y, luz = 0) => { const k = lim(y / alto); return `rgb(${ARRIBA.map((c, i) => Math.round(c + (ABAJO[i] - c) * k + luz)).join(',')})` }
    const LADO = '#040207' // grosor de los pedazos

    let W = 0, vh = 0, alto = 0, altoEspacio = 0, banda = 0, dpr = 1 // banda: alto de la parte de arriba que no se cae (sigue la escena)
    let piezas = [], bordes = [], polvo = [], origen = [0, 0], alcance = 1
    let inicial = true

    // Arma el techo: una malla de puntos movidos al azar; cada celda (o media celda) es un pedazo.
    // Las coordenadas son relativas al borde de arriba del espacio oscuro
    function armar() {
        vh = window.innerHeight; W = raiz.clientWidth; dpr = Math.min(window.devicePixelRatio || 1, 2)
        lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(vh * dpr)
        lienzo.style.width = W + 'px'; lienzo.style.height = vh + 'px'
        espacio.style.height = ''; altoEspacio = espacio.offsetHeight // el alto lo decide el CSS (.derrumbe-espacio)
        alto = altoEspacio // el techo ocupa solo el espacio oscuro: los pedazos caen sobre los recursos, pero nunca los tapan quietos
        piezas = []; bordes = []; polvo = []; inicial = true

        const x0 = -30, ancho = W + 60, y0 = -40 // más grande que la pantalla y 40 px montado sobre la escena: al temblar no se ven los bordes ni la unión
        const tam = Math.min(68, Math.max(38, W / 24)) // pedazos más pequeños (antes hasta 105 px): se ve más como escombro
        const cols = Math.ceil(ancho / tam), filas = Math.ceil((alto - y0) / tam)
        const cw = ancho / cols, ch = (alto - y0) / filas
        const P = []
        for (let i = 0; i <= filas; i++) {
            P.push([])
            for (let j = 0; j <= cols; j++) {
                const dentroX = j > 0 && j < cols, dentroY = i > 0 && i < filas
                P[i].push([x0 + j * cw + (dentroX ? rnd(-0.38, 0.38) * cw : 0), y0 + i * ch + (dentroY ? rnd(-0.38, 0.38) * ch : 0)])
            }
        }
        // Cuántas filas de arriba quedan pegadas en cada columna (el borde roto del techo)
        const base = Math.max(1, Math.round((altoEspacio * 0.65 - y0) / ch)) // la parte de arriba se queda: solo se rompe lo de abajo, cerca de los recursos
        banda = y0 + base * ch
        // detrás del techo que no se cae, el espacio también es del color de la escena: aunque el dibujo se corra un pixel, no asoma nada claro
        espacio.style.background = `linear-gradient(to bottom, var(--color-escena) ${Math.max(0, banda - ch * 0.5).toFixed(0)}px, transparent ${Math.max(0, banda - ch * 0.5).toFixed(0)}px)`
        const fijas = Array.from({ length: cols }, () => base + (Math.random() < 0.45 ? 1 : 0))

        const mapaBordes = new Map()
        const agregarBorde = (a, b, pieza) => {
            const clave = a < b ? a + '|' + b : b + '|' + a
            let borde = mapaBordes.get(clave)
            if (!borde) { borde = { a: llave[a], b: llave[b], piezas: [] }; mapaBordes.set(clave, borde); bordes.push(borde) }
            borde.piezas.push(pieza)
        }
        const llave = {}
        const id = (i, j) => { const k = i + ',' + j; llave[k] = P[i][j]; return k }
        const crear = (ids, fija) => {
            const pts = ids.map(k => llave[k])
            const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
            const pieza = {
                pts: pts.map(([x, y]) => [x - cx, y - cy]), cx, cy, fija, estado: 'puesta', alfa: 1,
                abajo: (cy - banda) / (alto - banda) > 0.55, // los de la orilla de abajo se caen apenas entran en pantalla (aunque el derrumbe no haya empezado): el borde de abajo nunca se ve entero
                limite: rnd(0.45, 0.75) + 0.7 * lim((cy - banda) / (alto - banda)) ** 2, // se cae cuando su centro sube hasta esta altura de la pantalla…
                tarde: rnd(0.6, 0.9),          // …o cuando el derrumbe ya va por aquí
                dx: 0, dy: 0, vx: 0, vy: 0, ang: 0, va: 0, luz: rnd(4, 10)
            }
            piezas.push(pieza)
            ids.forEach((k, n) => agregarBorde(k, ids[(n + 1) % ids.length], pieza))
        }
        for (let i = 0; i < filas; i++) {
            for (let j = 0; j < cols; j++) {
                const a = id(i, j), b = id(i, j + 1), c = id(i + 1, j + 1), d = id(i + 1, j)
                const fija = i < fijas[j]
                if (!fija && Math.random() < 0.5) { // algunas celdas se parten en dos triángulos
                    if (Math.random() < 0.5) { crear([a, b, c], false); crear([a, c, d], false) }
                    else { crear([a, b, d], false); crear([b, c, d], false) }
                } else crear([a, b, c, d], fija)
            }
        }
        // Las grietas salen de un punto del techo y se extienden hacia todos lados
        origen = [W * rnd(0.3, 0.7), banda + (alto - banda) * 0.25] // las grietas salen de la parte que se rompe
        const dist = (p) => Math.hypot(p[0] - origen[0], p[1] - origen[1])
        bordes.forEach(b => {
            b.d = dist([(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2]) + rnd(-25, 25)
            b.fuerte = Math.random() < 0.35 // unas grietas se marcan más que otras
            const largo = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) || 1, nx = -(b.b[1] - b.a[1]) / largo, ny = (b.b[0] - b.a[0]) / largo
            b.zig = [0.3, 0.55, 0.8].map(k => { const o = rnd(-3.5, 3.5); return [b.a[0] + (b.b[0] - b.a[0]) * k + nx * o, b.a[1] + (b.b[1] - b.a[1]) * k + ny * o] }) // la grieta no es recta
        })
        piezas.forEach(p => { p.d = dist([p.cx, p.cy]) })
        alcance = Math.max(...bordes.map(b => b.d)) + 30
    }

    // Piedritas y polvo que salen cuando un pedazo se cae
    function soltar(pieza, yTecho) {
        const radio = Math.max(...pieza.pts.map(([x, y]) => Math.hypot(x, y)))
        for (let n = 0; n < 5 + Math.random() * 6; n++) {
            const r = rnd(3, Math.min(11, radio * 0.25)), lados = 3 + Math.floor(Math.random() * 3)
            polvo.push({
                tipo: 'piedra', x: pieza.cx + rnd(-0.6, 0.6) * radio, y: yTecho + pieza.cy + rnd(-0.4, 0.6) * radio,
                vx: rnd(-90, 90), vy: rnd(-120, 40), ang: rnd(0, 6), va: rnd(-8, 8), vida: 4,
                pts: Array.from({ length: lados }, (_, k) => { const a = k / lados * Math.PI * 2 + rnd(-0.3, 0.3), rr = r * rnd(0.6, 1); return [Math.cos(a) * rr, Math.sin(a) * rr] }),
                color: color(pieza.cy, pieza.luz)
            })
        }
        for (let n = 0; n < 2; n++) {
            polvo.push({
                tipo: 'nube', x: pieza.cx + rnd(-0.5, 0.5) * radio, y: yTecho + pieza.cy + rnd(-0.3, 0.5) * radio,
                vx: rnd(-20, 20), vy: rnd(10, 50), r: rnd(16, 30), crece: rnd(25, 45), vida: rnd(0.9, 1.5), edad: 0
            })
        }
    }

    // p = 0 cuando la parte que se rompe llega al 62 % de la pantalla (la muestra del juego ya casi salió) · p = 1 cuando ya subió hasta arriba.
    // Así nada tiembla mientras se ve la muestra del juego: el temblor empieza ya en el pedazo de la animación
    const progreso = (yTecho) => lim((vh * 0.62 - (yTecho + banda - window.scrollY)) / (vh * 0.4 + alto - banda))

    let anterior = performance.now(), activo = false, pMax = 0
    // lo que tiembla: el contenido de la escena (texto y muestra) y los recursos, cada uno por dentro. El fondo oscuro de la escena se queda quieto:
    // si se movía todo el main, por los bordes asomaba el fondo claro de la página
    const sacudibles = [...escena.children, contenido]
    function cuadro(ahora) {
        const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora
        const yTecho = espacio.getBoundingClientRect().top + window.scrollY // posición del techo en la página
        const sy = window.scrollY
        const p = pMax = Math.max(pMax, progreso(yTecho)) // el derrumbe pasa una sola vez: al subir no se rearma (vuelve al recargar o al regresar a la página)
        const grieta = tramo(p, 0.06, 0.42) * alcance // hasta dónde llegaron las grietas
        const temblor = tramo(p, 0.04, 0.14) * (1 - tramo(p, 0.4, 0.6))
        const t = ahora / 1000
        const tx = (Math.sin(t * 53) * 2.5 + Math.sin(t * 31) * 1.5) * temblor, ty = Math.cos(t * 47) * 1.5 * temblor

        // Todo tiembla junto: la escena y el contenido (main) y el techo (más abajo se dibuja con tx, ty)
        const sacudir = temblor > 0.01 ? `${tx.toFixed(1)}px ${ty.toFixed(1)}px` : ''
        sacudibles.forEach(el => { if (el.style.translate !== sacudir) el.style.translate = sacudir })

        // ¿Qué pedazos se caen? (una vez que se cae, ya no vuelve)
        piezas.forEach(pz => {
            if (pz.fija) return
            const yPantalla = yTecho + pz.cy - sy
            const cae = (pz.abajo && yPantalla < vh * pz.limite) || (p > 0.12 && grieta > pz.d + 20 && (yPantalla < vh * pz.limite || p > pz.tarde))
            if (cae && pz.estado === 'puesta') {
                const fuera = inicial || yPantalla > vh + 150 || yPantalla < -150
                pz.estado = fuera ? 'fuera' : 'suelta' // suelta: tiembla un momento en su lugar antes de caer (así no cae todo junto)
                pz.retraso = rnd(0.05, 0.5); pz.alfa = 1 // (si estaba reapareciendo, vuelve a ser sólido)
                pz.dx = pz.dy = pz.ang = 0
                pz.vx = rnd(-50, 50) + (pz.cx - W / 2) * 0.06; pz.vy = rnd(40, 220); pz.va = rnd(-1.8, 1.8)
            }
        })
        inicial = false

        // Física
        piezas.forEach(pz => {
            if (pz.estado === 'puesta' && pz.alfa < 1) pz.alfa = Math.min(1, pz.alfa + dt * 4)
            if (pz.estado === 'suelta' && (pz.retraso -= dt) <= 0) { pz.estado = 'cayendo'; soltar(pz, yTecho) }
            if (pz.estado !== 'cayendo') return
            pz.vy += GRAVEDAD * dt; pz.dx += pz.vx * dt; pz.dy += pz.vy * dt; pz.ang += pz.va * dt
            if (yTecho + pz.cy + pz.dy - sy > vh + 200) pz.estado = 'fuera'
        })
        // Polvillo que se desprende de las grietas mientras tiembla
        if (temblor > 0.2 && Math.random() < temblor * 0.6) {
            const b = bordes[Math.floor(Math.random() * bordes.length)]
            if (b.d < grieta && b.piezas.some(pz => pz.estado === 'puesta')) {
                const k = Math.random()
                polvo.push({ tipo: 'piedra', x: b.a[0] + (b.b[0] - b.a[0]) * k, y: yTecho + b.a[1] + (b.b[1] - b.a[1]) * k, vx: rnd(-15, 15), vy: rnd(0, 40), ang: 0, va: rnd(-5, 5), vida: 3,
                    pts: [[-1.5, -1], [1.8, -0.6], [0.8, 1.6], [-1.2, 1.2]], color: '#5a4566' })
            }
        }
        polvo.forEach(q => {
            if (q.tipo === 'piedra') { q.vy += GRAVEDAD * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.ang += q.va * dt; q.vida -= dt; if (q.y - sy > vh + 50) q.vida = 0 }
            else { q.edad += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 0.97; q.r += q.crece * dt }
        })
        polvo = polvo.filter(q => q.tipo === 'piedra' ? q.vida > 0 : q.edad < q.vida)

        // Dibujo (en coordenadas de la página, corridas por el scroll)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, W, vh)
        const arriba = yTecho - sy
        const visible = arriba < vh && arriba + alto > 0
        const cayendo = piezas.some(pz => pz.estado === 'cayendo')
        if (visible) {
            ctx.save(); ctx.translate(0, arriba)
            // pedazos en su lugar (los que no son del borde de arriba tiemblan)
            ctx.lineJoin = 'round'
            piezas.forEach(pz => {
                if (pz.estado !== 'puesta' && pz.estado !== 'suelta') return
                const m = 1, sacude = pz.estado === 'suelta' ? 1.5 : 0
                ctx.globalAlpha = pz.alfa
                trazar(pz.pts, pz.cx + tx * m + rnd(-sacude, sacude), pz.cy + ty * m + rnd(-sacude, sacude))
                ctx.fillStyle = color(pz.cy); ctx.fill()
                ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke() // tapa las rayitas entre pedazos
            })
            ctx.globalAlpha = 1
            // grietas entre dos pedazos en su lugar · borde roto (con grosor) donde ya se cayó el vecino
            bordes.forEach(b => {
                const puestas = b.piezas.filter(pz => pz.estado === 'puesta' || pz.estado === 'suelta')
                if (!puestas.length) return
                const m = 1 // todo el techo tiembla igual: si el borde fijo se moviera menos, entre los dos se abría una rendija clara
                const ax = b.a[0] + tx * m, ay = b.a[1] + ty * m, bx = b.b[0] + tx * m, by = b.b[1] + ty * m
                if (puestas.length === 2) {
                    if (b.d > grieta || puestas[0].fija || puestas[1].fija) return // la parte de arriba (que no se cae) no se agrieta: si no, entre la escena y el derrumbe quedaba una raya
                    const a = lim((grieta - b.d) / 60)
                    const zig = (dy) => { ctx.beginPath(); ctx.moveTo(ax, ay + dy); b.zig.forEach(([x, y]) => ctx.lineTo(x + tx * m, y + ty * m + dy)); ctx.lineTo(bx, by + dy) }
                    const k = b.fuerte ? 1 : 0.45
                    zig(0); ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * a * k})`; ctx.lineWidth = b.fuerte ? 2 : 1.1; ctx.stroke()
                } else if (b.piezas.length === 2) {
                    const pz = puestas[0], otra = b.piezas.find(o => o !== pz)
                    if (otra.cy > pz.cy) { // el hueco queda abajo: se ve el grosor del techo
                        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 8); ctx.lineTo(ax, ay + 8); ctx.closePath()
                        ctx.fillStyle = LADO; ctx.fill()
                    }
                }
            })
            ctx.restore()
        }
        // pedazos cayendo (con grosor, girando)
        piezas.forEach(pz => {
            if (pz.estado !== 'cayendo') return
            ctx.save(); ctx.translate(pz.cx + pz.dx, yTecho + pz.cy + pz.dy - sy); ctx.rotate(pz.ang)
            trazar(pz.pts, 0, 7); ctx.fillStyle = LADO; ctx.fill()
            trazar(pz.pts, 0, 0); ctx.fillStyle = color(pz.cy, pz.luz); ctx.fill()
            ctx.restore()
        })
        polvo.forEach(q => {
            if (q.tipo === 'piedra') {
                ctx.save(); ctx.translate(q.x, q.y - sy); ctx.rotate(q.ang); trazar(q.pts, 0, 0); ctx.fillStyle = q.color; ctx.fill(); ctx.restore()
            } else {
                const a = 0.16 * (1 - q.edad / q.vida)
                const g = ctx.createRadialGradient(q.x, q.y - sy, 0, q.x, q.y - sy, q.r)
                g.addColorStop(0, `rgba(80, 64, 92, ${a})`); g.addColorStop(1, 'rgba(80, 64, 92, 0)')
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y - sy, q.r, 0, Math.PI * 2); ctx.fill()
            }
        })

        // Sigue animando mientras el techo se ve o algo cae; si no, descansa hasta el próximo scroll
        activo = visible || cayendo || polvo.length > 0 || piezas.some(pz => pz.alfa < 1)
        if (activo) requestAnimationFrame(cuadro)
    }
    function trazar(pts, x, y) {
        ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px + x, py + y) : ctx.moveTo(px + x, py + y)); ctx.closePath()
    }
    const despertar = () => { if (activo) return; activo = true; anterior = performance.now(); requestAnimationFrame(cuadro) }

    armar(); despertar()
    window.addEventListener('pageshow', (e) => { if (e.persisted) { pMax = 0; armar(); despertar() } }) // al volver con "atrás" (por ejemplo, desde los recursos) el techo está entero otra vez
    window.addEventListener('scroll', despertar, { passive: true })
    let ancho = window.innerWidth
    window.addEventListener('resize', () => {
        if (window.innerWidth === ancho) { vh = window.innerHeight; lienzo.height = Math.round(vh * dpr); lienzo.style.height = vh + 'px'; return despertar() } // (en celular la barra del navegador cambia el alto: no se rearma por eso)
        ancho = window.innerWidth; armar(); despertar()
    })
}

// 7.1 Flecha hacia abajo -----------------
    // (index.html) Si la persona se queda quieta un rato antes de llegar al derrumbe (9 s, después de las pistas de la muestra), aparece abajo
    // una flecha que da un saltito y la página entera salta con ella: hay más información más abajo. Se va al hacer scroll; al tocarla baja hasta los recursos.
    // Una vez que la persona llegó hasta donde empieza el derrumbe, no vuelve a salir
function iniciarFlecha() {
    const recursos = document.getElementById('recursos')
    if (!document.body.classList.contains('pagina-inicio') || !recursos) return
    const flecha = document.createElement('button')
    flecha.type = 'button'; flecha.className = 'flecha-abajo'; flecha.setAttribute('aria-label', 'Hay más información abajo: ir a los recursos')
    flecha.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9 L12 16 L19 9"/></svg>'
    document.body.append(flecha)
    let espera = null, llego = false
    const espacio = () => document.querySelector('.derrumbe-espacio') // donde empieza la animación del derrumbe (sección 7)
    const falta = () => {
        if (llego) return false
        const e = espacio(), arriba = e ? e.getBoundingClientRect().top : recursos.getBoundingClientRect().top
        if (arriba < window.innerHeight * 0.4 || recursos.getBoundingClientRect().top < window.innerHeight * 0.6) llego = true // ya bajó hasta la animación: la flecha no sale más
        return !llego
    }
    const programar = () => {
        flecha.classList.remove('flecha-abajo--ver'); clearTimeout(espera)
        document.body.classList.remove('pagina-salta')
        if (falta()) espera = setTimeout(() => { if (falta()) { flecha.classList.add('flecha-abajo--ver'); document.body.classList.add('pagina-salta') } }, 9000) // 9 s: un rato después de las pistas de girar / acercar
    }
    window.addEventListener('scroll', programar, { passive: true })
    flecha.addEventListener('click', () => {
        flecha.classList.remove('flecha-abajo--ver'); document.body.classList.remove('pagina-salta')
        recursos.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
    programar()
}

// 8. Inicio -----------------
iniciarMenu()
iniciarDesplazamientoSuave()
iniciarMapa()
iniciarAdvertencia()
iniciarScroll()
iniciarDerrumbe()
iniciarFlecha()
iniciarMuestra()
iniciarJuego()