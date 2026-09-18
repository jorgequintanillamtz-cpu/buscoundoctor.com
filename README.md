# BuscoUnDoctor.com

Directorio médico para Monterrey y San Pedro Garza García (Nuevo León, México). Conecta pacientes con especialistas verificados. Sitio en producción: https://buscoundoctor.com

> **Si trabajas con Claude:** lee primero [`CLAUDE.md`](./CLAUDE.md). Explica cómo está armado el proyecto, las reglas del negocio y las trampas conocidas.

## Stack

- **Frontend:** React + Vite + Tailwind + componentes tipo shadcn/ui
- **Datos, usuarios y archivos:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel (se publica solo al subir cambios a `main`)
- **Correo:** Resend

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

   Nunca uses ni compartas la *service role key* de Supabase: no se necesita en el frontend.

4. Arranca el sitio:

   ```bash
   npm run dev
   ```

   Se abre en http://localhost:5173

Otros comandos: `npm run build`, `npm run lint` y `npm run typecheck`. No hay pruebas automáticas; los cambios se verifican a mano en el navegador.

## Cómo publicar cambios

Cada cambio que llega a la rama `main` se publica solo en producción. Lo recomendado es trabajar en una rama propia y abrir un Pull Request para que lo revise el dueño antes de publicarse.

**Importante:** la base de datos de Supabase es la de producción (no hay un entorno de pruebas aparte). Cualquier dato de prueba que crees debe borrarse al terminar. `CLAUDE.md` explica cómo hacerlo con seguridad.
