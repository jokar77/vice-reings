# Original User Request

## Initial Request — 2026-08-24T17:47:21Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Reescribir el juego "Vice Shores" como una aplicación móvil nativa utilizando React Native. El juego mantiene el estilo gráfico inspirado en GTA 6, los fondos dinámicos y la lógica de deslizar cartas, incorporando un sistema de Protagonista Dual.

Working directory: C:\Users\nanot\.gemini\antigravity\scratch\teamwork_projects\vice_shores_mobile
Integrity mode: development

## Verification Resources
- Especificaciones de Diseño de Arquitectura Dual: `C:\Users\nanot\.gemini\antigravity\scratch\teamwork_projects\vice_shores_mobile\docs\superpowers\specs\2026-08-24-react-native-duo-architecture-design.md`
- Código base original en HTML (como referencia de la lógica de stats e UI): `C:\Users\nanot\.gemini\antigravity\scratch\vice_shores\index.html`

## Requirements

### R1. Estructura React Native y UI Inmersiva
Crear un nuevo proyecto de React Native (usando Expo) que compile correctamente. La UI debe ocultar los elementos del sistema operativo, tener un botón de engranaje minimalista para abrir el "Hub del Imperio" (historial y años jugados), animaciones fluidas con React Native Reanimated para el swipe de cartas, y usar React Native SVG para los retratos.

### R2. Lógica de Protagonista Dual y Estado
Implementar el estado del juego usando `Zustand` y `AsyncStorage` (para guardado automático). El estado debe manejar a dos protagonistas (`partnerA` y `partnerB`), rastreando quién está activo. El mazo de cartas (DECK) debe ser filtrado según el protagonista activo. Cuando un personaje cae, el estado debe cambiar al otro compañero. El `Game Over` solo ocurre cuando ambos caen.

## Acceptance Criteria

### Compilación y Persistencia
- [ ] Ejecutar la compilación estándar (`npx expo export` o compilación de TypeScript) sin errores (código de salida 0).
- [ ] Escribir una prueba automatizada (Jest) que verifique que, tras simular un cambio de estado en el store de Zustand, la información se persiste y se puede recuperar.

### Verificación de Lógica Dual (Motor)
- [ ] Escribir pruebas automatizadas (Jest) para el motor del juego que verifiquen que:
  - Al matar al `partnerA`, el estado cambia y el `partnerB` se vuelve activo automáticamente.
  - El sistema detecta el "Game Over" de toda la generación únicamente si ambos personajes cambian a estado "dead" o "jailed".
