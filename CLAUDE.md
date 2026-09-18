# CLAUDE.md — BuscoUnDoctor.com

Guía para Claude (Claude Code u otra sesión) que trabaje en este proyecto. Léela completa antes de tocar código o datos.

---

## 1. Qué es este proyecto

**BuscoUnDoctor.com** es un directorio médico premium para **Monterrey y San Pedro Garza García, Nuevo León, México**, con visión de escalar a otras ciudades. Conecta pacientes con médicos especialistas verificados (cédula profesional).

- El negocio depende de **tráfico orgánico (SEO)**, no de publicidad. La arquitectura de URLs, páginas y contenido está pensada para Google.
- El cuello de botella es **reclutar médicos**, no la tecnología. El registro (`/registro-medico`) es autoservicio con fricción mínima; la calidad se modera después.
- **Prelanzamiento:** el lanzamiento público es el **15 de octubre de 2026** (`LAUNCH_DATE` en `src/lib/launchCountdown.js`). Todavía hay muy pocos médicos reales; cualquier dato que veas en producción puede ser de prueba, así que pregunta antes de borrar.

## 2. Con quién trabajas (importante)

El dueño, **Jorge, no es técnico**. Reglas de trato:

- Explica en **español, en lenguaje sencillo**, sin jerga. Di qué hiciste y por qué, no cómo se llama el patrón.
- **Nunca hagas commit sin que lo pida, y nunca hagas push sin confirmación explícita** ("¿Lo subo a GitHub?" → espera "sí"). Cada push a `main` se publica solo en producción.
- **Verifica con evidencia real** (una prueba concreta en el navegador o en la base de datos), no con "debería funcionar". Reporta lo que viste.
- Antes de decidir por él algo que cambia el negocio (orden de secciones, textos, precios), propónlo y espera aprobación.

## 3. Stack actual (la migración desde Base44 ya se hizo)

| Pieza | Qué es |
|---|---|
| Frontend | React + Vite + Tailwind + componentes tipo shadcn/ui + react-router + TanStack Query |
| Backend / datos | **Supabase** (Postgres + Auth + Storage + RPCs), proyecto `iiklgyzyvbrtrxjfucoc` |
| Hosting | **Vercel**, despliega solo al hacer push a `main`. Dominio: `buscoundoctor.com` |
| Código | GitHub: `jorgequintanillamtz-cpu/buscoundoctor.com` |
| Correo | **Resend**, enviado desde Postgres (ver §7) |

**No existe entorno de pruebas.** Solo hay un proyecto Supabase, que es producción. Todo lo que pruebes toca datos reales (ver §9).

### La capa de compatibilidad `src/api/base44Client.js`

El sitio se construyó primero en Base44, y ~240 archivos llaman al SDK con la sintaxis de Base44 (`base44.entities.Specialist.filter(...)`, `base44.auth.*`, `base44.functions.invoke`, `base44.integrations.Core.*`). En vez de reescribirlos, `base44Client.js` **traduce esas llamadas a Supabase**. Entonces:

- Sigue usando `base44.entities.X` en el código nuevo; no llames a `supabase` directo salvo dentro de esa capa o de `src/lib/`.
- Una tabla nueva debe agregarse a `ENTITY_TABLE_MAP` (nombre PascalCase → tabla).
- `base44.functions.invoke(nombre)` se traduce a una **RPC de Postgres** vía `FUNCTION_MAP`.
- Las carpetas `base44/` (entidades `.jsonc`, funciones) son **código legado de referencia**. **No son fuente de verdad**: el esquema real está en Supabase y esos archivos están desactualizados (columnas que existen en la base no aparecen ahí). Consulta la base real.
- **Stripe / productos digitales / cobros** (`DoctorProduct`, `ProductSale`, `/panel-medico/productos`, `/pagos`, `/dr/:slug/producto/...`) están **fuera de alcance y dormidos**: llamarlos lanza un error a propósito.

### Variables de entorno

`.env` (no se sube a git) necesita solo: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. La anon key es pública por diseño. **Jamás** pongas la *service role key* en el repo ni en el frontend.

Para correrlo: `npm install` y `npm run dev` (Vite, puerto 5173). También existe `npm run build`, `lint` y `typecheck`. **No hay suite de pruebas**: se verifica a mano en el navegador.

## 4. Modelo de datos (fuente de verdad: Supabase)

Las tablas están en `snake_case`. Las principales:

- **`specialist`**: la **única** entidad de médico. Nunca crees otra (existió una tabla `Doctor` duplicada; se eliminó).
- Relacionadas con el médico: `office`, `office_hours`, `specialist_document`, `specialist_education`, `specialist_language`, `specialist_service`, `specialist_highlight`, `specialist_case`, `specialist_post`, `specialist_seo_checklist`.
- Catálogos: `specialty`, `subspecialty`, `condition`, `zone`, `insurer`, `language`, `plan`.
- Contenido: `blog_post`, `faq_page`, `faq_item`.
- Interacción: `review`, `appointment_request`, `doctor_contact`, `doctor_click`, `doctor_impression`, `newsletter_subscriber`, `specialty_interest_signup`.
- Panel del doctor / extras: `doctor_storefront` (+ `storefront_*`), `consult_summary`, `consult_review`, `premium_status`, `premium_payment`.
- Operación: `profiles` (rol de cada usuario), `activity_log`, `email_log`, `site_settings`.

### Reglas importantes de `specialist`

- **Vínculo usuario ↔ médico:** `owner_user_id` es el **único** mecanismo. Úsalo para todo "¿este perfil es del usuario logueado?".
- **Visibilidad pública requiere DOS cosas:** `publication_status = 'published'` **y** `active = true`. `active` es un interruptor que **solo el admin** puede cambiar (barra lateral del editor de admin). Un perfil "aceptado" pero con `active=false` no aparece en el sitio.
- `publication_status`: `draft` / `pending_review` / `published` / `suspended` / `rejected`.
- Cédula: `professional_license_number` (único) y `license_verification_status` (`pending`/`verified`/`rejected`). Aprobar un `specialist_document` de tipo `cedula_profesional` la marca `verified` automáticamente (trigger). El badge público "Verificado" depende **solo** de `license_verification_status === 'verified'`.
- `insurers_relation` (array de IDs de `insurer`) reemplazó al texto libre `insurers`; no lo recrees. `certifications` y los campos de un solo consultorio (`address`, `city`, `zone`) son legado: usa `specialist_education` y `office`.
- `has_seen_welcome_tour` controla el popup de bienvenida del panel del doctor.
- Un trigger protege columnas sensibles de `specialist` (un doctor no puede editar verificación, `active`, `featured`…); el frontend además las excluye con `DOCTOR_RESTRICTED_FIELDS`.

### `review`

`rating` general (1–5) más opcionales `rating_punctuality`, `rating_treatment`, `rating_facilities`, y `photo_url`. Cualquiera puede insertar una reseña (sin login) solo con `approved=false`; el admin la aprueba en `/admin/resenas`.

### Roles

Guardados en `profiles.role`: `doctor` (por defecto, lo crea un trigger al registrarse en Auth) o `admin`. La función `is_admin()` solo reconoce `'admin'`. No hay un rol "superadmin" real aunque algún código lo mencione.

## 5. Seguridad: RLS y Storage

Todo está protegido con **Row Level Security** en Postgres. Un doctor solo puede ver/editar filas cuyo `owner_user_id` sea el suyo (verificado con cuentas reales el 2026-09-17), o de tablas hijas vía `is_specialist_owner()`. El admin puede todo vía `is_admin()`.

**Storage** (buckets):

| Bucket | Público | Quién sube |
|---|---|---|
| `specialist-photos`, `specialist-videos` | sí | dueño autenticado, en carpeta = su `auth.uid()`; más la carpeta fija `pending-registro/` que acepta subidas **sin sesión** (el registro sube fotos antes de crear la cuenta) |
| `specialist-documents` | **no** (URLs firmadas) | dueño o admin, carpeta = `specialist_id` |
| `review-photos` | sí | cualquiera (sin login), porque quien reseña no inicia sesión |
| `blog-images`, `site-assets` | sí | solo admin |

`base44.integrations.Core.UploadFile({ file, bucket, folder })` sube archivos; pasa por `fileToWebP()` antes (recorta a 1600px y comprime). **Si un formulario público necesita subir archivos, revisa primero la política de Storage**: las subidas sin sesión fallan en silencio (400) si no hay una política que las permita.

### Trampa de permisos en funciones de Postgres

Una función nueva recibe `EXECUTE` por **dos caminos** (el rol `PUBLIC` y los privilegios por defecto de Supabase). Para restringirla hay que revocar **ambos** y verificar con `has_function_privilege`. Revocar solo uno deja la función expuesta.

## 6. Migraciones de base de datos

Las migraciones **viven solo en Supabase**, no en este repo (no hay carpeta `supabase/`). Se aplican con `apply_migration` (MCP de Supabase) o desde el panel; la lista la da `list_migrations`. Cuando cambies el esquema:

1. Aplica la migración a producción (no hay staging), y verifica con una prueba real.
2. Si el cambio afecta al código, hazlo en el mismo trabajo (columna nueva + UI que la usa).
3. Recuerda que **no queda registro en git**: describe la migración en el mensaje del commit.

## 7. Autenticación y correo

- **Registro/login:** Supabase Auth con correo + contraseña. El registro (`/registro-medico`, 4 pasos: datos → ubicación → fotos → cuenta) y la **recuperación de contraseña** (`/olvide-contrasena`) usan **códigos numéricos por correo (OTP)**, **no enlaces mágicos**. Motivo: Gmail/Outlook "previsualizan" los enlaces y consumen el token de un solo uso antes de que la persona haga clic. **Para cualquier verificación de un solo uso, usa código escrito, nunca un enlace.**
- Las plantillas de esos correos se editan en Supabase → Authentication → Email Templates (muestran `{{ .Token }}`).
- **Correos transaccionales** (bienvenida, perfil aprobado, nueva solicitud de cita, etc.): la RPC `send_transactional_email` valida el tipo contra una lista fija, resuelve el destinatario **dentro de Postgres** (nunca confía en el cliente), limita el ritmo, envía por **Resend** vía `pg_net` y registra en `email_log`. La llave de Resend vive en Supabase, no en el repo. Los avisos de contacto público e interés en especialidades llegan al correo del dueño.
- **Edge Functions** desplegadas: `create-doctor-profile`, `serve-sitemap-xml`. `/sitemap.xml` se reescribe hacia esta última en `vercel.json`.

## 7b. Rutas principales

Públicas: `/`, `/especialistas`, `/especialista/:slug`, `/especialidad/:slug[/:zonaSlug]`, `/:professionSlug/:citySlug[/:zonaSlug]` (páginas SEO), `/enfermedades[/:slug[/:citySlug]]`, `/blog[/:slug]`, `/planes`, `/para-medicos`, `/chequeos-medicos`, `/nosotros`, `/contacto`, `/preguntas-frecuentes`, `/registro-medico`, `/iniciar-sesion`, `/olvide-contrasena`.
Privadas (no indexables): `/panel-medico/*` (doctor) y `/admin/*` (admin). El mismo formulario de `/iniciar-sesion` sirve a ambos y **siempre** manda a `/panel-medico`; si la cuenta es admin, esa pantalla muestra un aviso ("Este panel es para médicos") con un botón hacia el panel de administración, o se entra directo a `/admin`.

Reglas SEO que ya existen (no las rompas): `/especialistas` es `noindex` cuando trae filtros en la URL; `/especialidad/:slug/:zona` solo es indexable si hay ≥1 médico; el perfil incluye schema `Physician` + `AggregateRating` + `FAQPage`; el perfil `noindex` si no está publicado.

## 8. Perfil público del médico (`src/pages/SpecialistProfile.jsx`)

- Orden de secciones **aprobado por Jorge** (igual en móvil, tablet y escritorio): hero (foto, nombre, especialidad, modalidad, años de experiencia + enfermedades principales, resumen de reseñas, bio) → **Especialidades → Hospitales → Servicios → Información → Experiencia → Estudios → Tecnología → Preguntas frecuentes → Casos → Publicaciones → Artículos del médico → Opiniones → Especialistas similares**. La reseña resumida del hero se oculta si no hay reseñas.
- El orden se logra con `order-N` / `lg:order-N` de flexbox, **no moviendo el JSX**. Por eso `get_page_text` (que lee el DOM) NO refleja el orden visual: para verificarlo, compara `getBoundingClientRect().top` de cada `id`. Tailwind trae `order-1..12`; `tailwind.config.js` lo extiende a 15. Si agregas una sección, renumera con cuidado.
- La tarjeta "Agendar cita" es `position: sticky` en escritorio; en móvil hay una barra fija abajo (`MobileBookingBar`).
- Reseñas con desglose y foto, botón Compartir, y artículos del médico ya existen.

## 9. Cómo probar sin ensuciar producción

Como no hay staging, el patrón acordado es: **crear datos de prueba, verificar, y borrarlos siempre al terminar**, confirmando con un `count(*)` que quedó en 0. Reglas:

- Cuentas de prueba: crea `auth.users` + `auth.identities` con SQL (`crypt(pass, gen_salt('bf'))`, `email_confirmed_at = now()`), pon el rol en `public.profiles`, y (si es doctor) crea su fila en `specialist` con `owner_user_id`. **Los campos de token de `auth.users` (`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`, `email_change_token_current`, `phone_change`, `phone_change_token`) deben ser `''`, no `NULL`**, o el login falla con "Database error querying schema".
- Borra en orden: `specialist` → `profiles` → `auth.identities` → `auth.users` (y usa el `owner_user_id`, no el `id` del specialist).
- Nombra las pruebas con prefijo `QA` para reconocerlas. Los archivos subidos a Storage no se pueden borrar por SQL; son diminutos y están bien de quedarse.
- Para ver la interfaz: levanta `npm run dev` (puerto 5173; en la app de Claude, `preview_start` con una config `dev` en `.claude/launch.json`, que no está en git: créala si falta) y prueba en móvil (375px), tablet (768px) y escritorio (1440px).
- Para llenar formularios de React desde automatización, los clics y `type` por referencia funcionan; asignar `.value` directo no actualiza el estado de React (usa el setter nativo + evento `input`).

## 10. Trampas conocidas del código

- **Autoguardado (`useAutoSaveSpecialist`):** cada 30 s envía el formulario **completo**. Si actualizas un campo directo en la base sin reflejarlo también en el estado local del formulario (`update(campo, valor)`), el siguiente autoguardado lo sobrescribe con el valor viejo.
- **`overflow-x: hidden` en `html/body` rompe `position: sticky`** (CSS obliga a `overflow-y: auto`). Se usa `overflow-x: clip` en `src/index.css`. No lo cambies.
- Un contenedor flex hijo sin `min-w-0` se estira al ancho de su contenido y provoca scroll horizontal (así se rompió el panel del médico en móvil). En el panel del doctor, la barra de pestañas móvil ahora es un menú hamburguesa.
- Si una página se ve "cortada a la derecha" en móvil, compara `document.documentElement.scrollWidth` con `clientWidth`.

## 11. Sistema de diseño

- Tokens de color y tipografía en `tailwind.config.js` (`primary`, `background`, `card`, `muted`, `brand.navy` = `#0B1E4D`, `brand.blue`, `fontFamily.heading/body`). **No hardcodees colores hex ni tamaños sueltos**; usa los tokens.
- `src/components/ui/` tiene los componentes base tipo shadcn.
- **`SpecialistCard.jsx` es la única tarjeta de médico**; no crees otra.
- Componentes de dominio del panel en `src/components/admin/`.

## 12. Decisiones históricas (no las repitas)

1. **`Doctor` vs `Specialist`:** ganó `Specialist` (tenía los datos reales). `Doctor` se eliminó y no debe volver.
2. **`insurers` (texto) → `insurers_relation` (catálogo):** el campo de texto se eliminó.
3. **`owner_user_id`** es el único vínculo usuario ↔ perfil.
4. **Migración Base44 → Supabase/Vercel/GitHub/Resend:** ya completada. No reintroduzcas dependencias de Base44 más allá de la capa de compatibilidad.

## 13. Principio de trabajo más importante: auditar antes de construir

Este proyecto **no se construye desde cero**. Antes de agregar algo:

1. Verifica si ya existe, aunque sea parcialmente (varias veces resultó que un componente ya estaba hecho pero sin conectar, p. ej. el botón Compartir).
2. Si algo parece duplicado o inconsistente, **diagnostica primero** qué tabla/componente tiene datos reales y qué usa la app pública, antes de borrar o fusionar.
3. Un cambio = un commit enfocado. No mezcles datos y UI de temas no relacionados.
4. Toda funcionalidad nueva se verifica con un caso real probado.
5. Las cosas mal ordenadas o rotas que encuentres fuera del alcance: avísalas, no las arregles en silencio.

## 14. Pendientes y riesgos abiertos

- Antes de lanzar, **auditar la tabla `specialist`** para quitar cuentas de prueba y confirmar con Jorge qué perfiles son reales.
- No existe módulo propio de gestión de aseguradoras, analíticas avanzadas ni de roles/usuarios en el admin (no urgente).
- No hay página dedicada de zona (`/zona/:slug`); la zona solo funciona como filtro.
- No hay sistema de citas transaccional: el "contacto" es WhatsApp + formulario, **por diseño**.
- `README.md` sigue describiendo Base44 y está desactualizado; esta guía es la referencia vigente.
- Fases futuras (solo con tracción validada): citas transaccionales, página de hospital/clínica, página de autor médico, cobros con Stripe (hoy dormido).
