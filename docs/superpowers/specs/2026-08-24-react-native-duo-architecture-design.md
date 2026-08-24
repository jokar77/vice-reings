# Diseño Arquitectónico: Vice Shores Mobile

## 1. Visión General
"Vice Shores" hace la transición de un prototipo web HTML a una aplicación móvil nativa. Se mantiene la mecánica de deslizamiento de cartas estilo *Reigns* con una estética Synthwave / GTA 6. La mayor innovación mecánica es el sistema de **Protagonista Dual (La Pareja)**, donde el jugador controla simultáneamente a dos líderes de un imperio criminal.

## 2. Pila Tecnológica (Tech Stack)
- **Framework:** React Native con Expo.
- **Estado y Persistencia:** Zustand + `@react-native-async-storage/async-storage` (guardado local automático).
- **Animaciones y Gestos:** `react-native-reanimated` y `react-native-gesture-handler` para 60 FPS en el swipe de cartas.
- **Gráficos:** `react-native-svg` para renderizar los retratos procedurales.

## 3. Interfaz de Usuario (UI/UX)
- **Inmersión Pantalla Completa:** La UI del sistema operativo (batería, reloj) estará oculta o superpuesta de forma translúcida.
- **Hub del Imperio:** Un ícono sutil de engranaje (esquina superior derecha) abrirá un dashboard superpuesto. Este dashboard contendrá:
  - Historial de cartas recientes.
  - Estadísticas de la partida (ej. Años en el poder, Dinero lavado).
  - Espacio modular para futuras características.
- **Indicador de Protagonista:** La UI mostrará de forma sutil quién es el personaje activo actual (ej. un color de acento diferente en la carta, o un pequeño retrato/nombre estático en la interfaz).

## 4. Sistema de Protagonista Dual
El núcleo de la lógica del juego cambia de un solo jugador a una pareja cooperativa.

### 4.1. Estado del Jugador (Zustand)
El estado rastreará:
- `partnerA`: { id: "hombre", status: "alive" | "dead" | "jailed" }
- `partnerB`: { id: "mujer", status: "alive" | "dead" | "jailed" }
- `activePartner`: Referencia a cuál de los dos está tomando la decisión actual.
- `stats`: Las 4 barras (Dinero, Búsqueda, Estrés, Reputación) son compartidas por el imperio.

### 4.2. Mazo Dinámico y Filtros
Cada carta en el `DECK` tendrá un campo opcional `target`:
- `common`: Puede aparecerle a cualquiera de los dos.
- `partnerA_only`: Eventos específicos para él.
- `partnerB_only`: Eventos específicos para ella.
El motor filtrará el mazo disponible basándose en quién es el `activePartner`.

### 4.3. Cambio de Perspectiva (Switch)
El cambio de protagonista activo ocurrirá de dos formas:
1. **Orgánica:** Cartas de historia o eventos aleatorios forzarán el cambio de perspectiva de forma fluida para representar el paso del tiempo o situaciones paralelas.
2. **Supervivencia (Caída de un compañero):** Si el protagonista activo pierde (una de las estadísticas llega a 0 o 100), ese personaje queda inactivo ("dead" o "jailed"). Aparece una carta narrativa especial informando al compañero de la caída, y el otro protagonista asume el 100% del control del imperio.

### 4.4. Game Over y Nueva Generación
La partida termina *únicamente* cuando **ambos** protagonistas cambian su estado a inactivo ("dead" o "jailed"). En ese momento, se muestra la pantalla de fin de partida y se comienza una nueva "Generación" heredando ciertas bonificaciones/penalizaciones.

## 5. Pruebas y Verificación
- Se escribirán pruebas unitarias con **Jest** para aislar el motor lógico de Zustand.
- Se verificará programáticamente que:
  - El deslizamiento altera las estadísticas correctamente.
  - El sistema cambia al compañero correctamente si uno muere.
  - El `Game Over` real solo se dispara cuando ambos caen.
