# BuscoUnDoctor.com

Directorio médico para Monterrey y San Pedro Garza García (Nuevo León, México). Conecta pacientes con especialistas verificados. Sitio en producción: https://buscoundoctor.com

> **Si trabajas con Claude:** lee primero [`CLAUDE.md`](./CLAUDE.md). Explica cómo está armado el proyecto, las reglas del negocio y las trampas conocidas.

## Stack

- **Frontend:** React + Vite + Tailwind + componentes tipo shadcn/ui
- **Datos, usuarios y archivos:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel (se publica solo al subir cambios a `main`)
- **Correo:** Resend
- **Mapas:** Google Maps (mapa, autocompletado de direcciones y embed del perfil)

## Correrlo en tu computadora

Necesitas [Node.js](https://nodejs.org) instalado.

1. Clona el repositorio y entra a la carpeta:

   ```bash
   git clone https://github.com/jorgequintanillamtz-cpu/buscoundoctor.com.git
   cd buscoundoctor.com
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz con estas dos variables (pídeselas al dueño del proyecto; el archivo no se sube a git):

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

   Opcional, para que funcionen los mapas y el autocompletado de direcciones (sin ellas el sitio funciona, pero sin mapa):

   ```
   VITE_GOOGLE_MAPS_API_KEY=...
   VITE_GOOGLE_MAP_ID=...
   ```

   Nunca uses ni compartas la *service role key* de Supabase: no se necesita en el frontend.

4. Arranca el sitio:

   ```bash
   npm run dev
   ```

   Se abre en http://localhost:5173

Otros comandos: `npm run build`, `npm run lint` y `npm run typecheck`. No hay pruebas automáticas; los cambios se verifican a mano en el navegador.

## Trabajar entre dos personas

Los dos dueños (Jorge y David) pueden cambiar todo: código, base de datos y hosting. Para no estorbarse:

1. Cada quien trabaja en **su propia rama** (`git checkout -b david/nombre-del-cambio`), nunca directo en `main`.
2. Al terminar, se abre un **Pull Request** en GitHub. Vercel crea un enlace de prueba para revisarlo.
3. Se junta a `main` solo cuando esté revisado (eso es lo que publica el sitio).
4. Los cambios de base de datos se avisan al otro *antes* de aplicarlos.
5. Los datos de prueba llevan el prefijo `QA` más la inicial de quien los crea, y se borran al terminar.

Las llaves del archivo `.env` (mira `.env.example`) se pasan por un canal privado.

## Cómo publicar cambios

Cada cambio que llega a la rama `main` se publica solo en producción. Lo recomendado es trabajar en una rama propia y abrir un Pull Request para que lo revise el dueño antes de publicarse.

**Importante:** la base de datos de Supabase es la de producción (no hay un entorno de pruebas aparte). Cualquier dato de prueba que crees debe borrarse al terminar. `CLAUDE.md` explica cómo hacerlo con seguridad.
