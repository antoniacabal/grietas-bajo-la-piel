# Grietas bajo la piel

Experiencia web interactiva sobre las huellas emocionales que deja un sismo. El proyecto vive en `grietas-bajo-la-piel/` (Vite + Three.js).

## Trabajar en el proyecto

```bash
npm install
npm run dev
```

## Modelos 3D

Los modelos se exportan de Blender como FBX a `static/assets/`, pero el juego carga su versión GLB comprimida con Draco (unas 7 veces más liviana). Después de agregar o cambiar un FBX:

```bash
npm run modelos
```

Los FBX no se publican: `npm run build` los quita de `dist/`.
