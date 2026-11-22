# Nodomics

<p align="center">
  <img src="./project-logo.png" alt="Nodomics Logo" width="160" />
</p>

<p align="center">
  <strong>Análisis de datos que se arma con nodos como LEGO, se comparte como código y lo construye un agente contigo.</strong>
</p>

<p align="center">
  <a href="https://nodomics-web.onrender.com"><strong>🌐 Probar Demo en Vivo</strong></a> ·
  <a href="#arquitectura-del-monorepo">Arquitectura</a> ·
  <a href="#primeros-pasos">Primeros Pasos</a> ·
  <a href="./docs/engineering/arquitectura.md">Guía Técnica</a>
</p>

---

## 🏆 Proyecto Platanus Hack 26 (Track: 🔗 Multiplayer)

**Equipo (team-48):**
- Jesus Gabriel Gudiño Lara ([@Gabriels114](https://github.com/Gabriels114))
- Diego Sebastian Cruz Cervantes ([@SebasCrucer](https://github.com/SebasCrucer))
- Arturo Cantú Olivarez ([@Cantuuuu](https://github.com/Cantuuuu))

---

## ¿Qué es Nodomics?

La mayoría de los profesionales que analizan datos no programan: dependen de hojas de cálculo frágiles, difíciles de auditar, imposibles de versionar y complejas de compartir.

**Nodomics** transforma ese proceso en un **lienzo visual reactivo** donde cualquier persona conecta fuentes de datos, transformaciones, filtros, SQL, Python y visualizaciones a través de nodos modulares. Cada flujo se ejecuta de forma segura, se guarda con versionado semántico en la nube y puede reutilizarse, bifurcarse (*fork*) o convertirse en un submódulo dentro de otro flujo.

---

## Pilares del Sistema

### 1. Motor Desacoplado 100% en el Navegador
- **DuckDB-WASM y Pyodide en Web Workers**: Toda la computación de datos corre localmente en el cliente a través del protocolo **NEP** (*Nodomics Engine Protocol*).
- **Privacidad absoluta**: Los datos del usuario nunca viajan a servidores externos durante la exploración y transformación.
- **Rendimiento instantáneo**: Consultas SQL sobre millones de filas y scripts analíticos de Python con latencia cero.

### 2. Identidad Visual y Linaje («Lenguaje del Nudo»)
- **Trazabilidad visual**: Cada flujo cuenta la historia de sus adaptaciones a través de un sistema de linaje visual (hebra de origen, nudos, trenzas, bifurcaciones y empalmes).
- **Diseño propio**: Tipografía editorial (*Newsreader* para titulares, *IBM Plex Sans/Mono* para interfaz) y tokens semánticos rigurosos en `@nodomics/ui`.

### 3. Agente Autónomo Colaborativo vía MCP
- **Servidor MCP del Motor**: Un agente impulsado por Claude se conecta al lienzo a través de herramientas estándar del Model Context Protocol.
- **Borradores Aislados**: El agente construye y prueba modificaciones en un entorno aislado, ejecuta validaciones y presenta un *diff visual* para que el usuario decida qué cambios incorporar.
- **Memoria Episódica y Vectorial**: Almacenamiento de episodios analíticos y búsquedas semánticas con embeddings en Supabase para aprender de flujos previos.

### 4. Hub Comunitario y Red de Colaboración
- **Publicación con versiones**: Historial de cambios, forks comunitarios y reutilización de flujos como nodos personalizados.
- **Feed «Para ti» y Mapa de Afinidad**: Recomendaciones inteligentes de colaboradores basadas en las necesidades y habilidades de cada perfil.

### 5. Despliegue y Hosteo en Producción
- Pestaña de despliegues conectada con Render que permite convertir flujos analíticos en servicios y tableros publicados en producción con un clic.

---

## Arquitectura del Monorepo

El repositorio es un monorepo gestionado con **pnpm workspaces** y tipado estricto en TypeScript:

```
├── apps/
│   ├── web/          # Aplicación web React (Vite): lienzo visual, editor de nodos y Hub
│   ├── agent/        # Servicio del agente autónomo con memoria episódica en Supabase
│   ├── deploy/       # Microservicio de orquestación y despliegue a Render
│   └── mcp/          # Servidor MCP que expone el motor analítico a herramientas de IA
├── packages/
│   ├── coordinator/  # Planificador y orquestador del grafo acíclico dirigido (DAG)
│   ├── engine-browser/# Motor en cliente integrando DuckDB-WASM y Pyodide
│   ├── nodes-core/   # Catálogo de nodos nativos (CSV, Parquet, SQL, Python, Charts, etc.)
│   ├── protocol/     # Tipos y esquemas del protocolo NEP (Nodomics Engine Protocol)
│   ├── ui/           # Sistema de diseño @nodomics/ui (componentes, tokens y tipografía)
│   ├── hub/          # Cliente y capa de persistencia de flujos y versiones
│   └── profile/      # Modelos y contratos de perfiles de colaboración
└── docs/             # Decisiones de arquitectura (ADRs), estándares y especificaciones
```

---

## Primeros Pasos

### Requisitos Previos
- Node.js >= 22
- pnpm >= 10

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/platanus-hack/platanus-hack-26-cl-team-48.git
cd platanus-hack-26-cl-team-48

# 2. Instalar dependencias
pnpm install

# 3. Iniciar el entorno de desarrollo
pnpm dev
```

La aplicación estará disponible de inmediato en `http://localhost:5173`.

### Verificación de Calidad

```bash
# Ejecutar verificación completa (TypeScript, ESLint, arquitectura, formato y tests)
pnpm check
```

---

## Documentación Técnica

- **[Guía de Arquitectura](./docs/engineering/arquitectura.md)**: Flujo de datos, capas de software y ciclo de vida de ejecución.
- **[Estándares de Ingeniería](./docs/engineering/estandares.md)**: Principios de código, inmutabilidad y reglas de diseño.
- **[Decisiones de Arquitectura (ADRs)](./docs/decisions/)**: Registro formal de decisiones técnicas (protocolo NEP, Supabase, memoria del agente, linaje visual).
