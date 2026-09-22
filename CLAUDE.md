# CLAUDE.md — BuscoUnDoctor.com

Guía para Claude (Claude Code u otra sesión) que trabaje en este proyecto. Léela completa antes de tocar código o datos.

---

## 1. Qué es este proyecto

**BuscoUnDoctor.com** es un directorio médico premium para **Monterrey y San Pedro Garza García, Nuevo León, México**, con visión de escalar a otras ciudades. Conecta pacientes con médicos especialistas verificados (cédula profesional).

- El negocio depende de **tráfico orgánico (SEO)**, no de publicidad. La arquitectura de URLs, páginas y contenido está pensada para Google.
- El cuello de botella es **reclutar médicos**, no la tecnología. El registro (`/registro-medico`) es autoservicio con fricción mínima; la calidad se modera después.
- **Prelanzamiento:** el lanzamiento público es el **15 de octubre de 2026** (`LAUNCH_DATE` en `src/lib/launchCountdown.js`). Todavía hay muy pocos médicos reales; cualquier dato que veas en producción puede ser de prueba, así que pregunta antes de borrar.

## 1b. Vocabulario: los dos tipos de "admin" (importante)

Los dueños usan estos dos nombres; úsalos igual y, si alguien dice solo "el admin", **pregunta a cuál se refiere**:

| Nombre | Qué es | Quién lo usa | Ruta | Código principal |
|---|---|---|---|---|
| **Página admin doctores** | Donde los doctores suscritos entran a mover su propia información (perfil, documentos, citas, reseñas, notificaciones). | Los doctores (nuestros clientes) | `/panel-medico` | `src/pages/DoctorPanel.jsx` |
| **Página admin dueños** | Donde los dueños hacen cambios al sitio y administran la empresa (revisar y aprobar doctores, bandeja, blog, catálogos, historial…). | Jorge y David | `/admin` | `src/components/AdminLayout.jsx` y `src/pages/admin/*` |

- En pantalla, el primero se titula "Panel de Médico" y el segundo "Panel de Administración".
- **Ojo con las carpetas:** `src/components/admin/` guarda componentes de **los dos** (es un nombre heredado). Por ejemplo `ProfileStatusCard`, `ProfileHub` o `NotificationBell` son de admin doctores; `AdminInbox`, `AdminDoctorReview` o `DoctorEditorSidebar` son de admin dueños. Guíate por quién lo usa, no por la carpeta.
- El editor de un doctor dentro de admin dueños (`/admin/doctores/editar/:id`) reutiliza varias pantallas de admin doctores (por eso lleva `DoctorEditorPerfil simple`).

## 2. Con quién trabajas (importante)

Los dueños son **Jorge y David** (hermanos). Los dos tienen acceso completo (código, base de datos, hosting) y cada quien usa **su propia cuenta de Claude**. Si no es evidente quién está en la sesión, pregúntalo al empezar.

- **Jorge no es técnico.** Con él: explica en **español, en lenguaje sencillo**, sin jerga; di qué hiciste y por qué, no cómo se llama el patrón. Con David, pregúntale al inicio qué nivel de detalle técnico prefiere y adáptate.
- **Nunca hagas commit sin que te lo pidan, y nunca hagas push sin confirmación explícita** ("¿Lo subo a GitHub?" → espera "sí"). Cada push a `main` se publica solo en producción.
- **Verifica con evidencia real** (una prueba concreta en el navegador o en la base de datos), no con "debería funcionar". Reporta lo que viste.
- Antes de decidir algo que cambia el negocio (orden de secciones, textos, precios), propónlo y espera aprobación del dueño con quien trabajas. Si el cambio es grande, conviene que el otro dueño se entere antes de publicarlo.

### Trabajar entre dos personas (y dos Claude)

- **Ramas, no `main` directo:** cada cambio se hace en su propia rama (`jorge/…`, `david/…`) y se abre un Pull Request. Vercel genera un enlace de prueba por rama; se revisa ahí y luego se junta a `main`, que es lo que publica. Antes de empezar, actualiza tu copia (`git pull`) para no pisar lo del otro.
- **Un solo cambio por rama/commit**, y describe en el mensaje del commit cualquier cambio de base de datos (las migraciones no viven en git, ver §6).
- **Cambios en la base de datos (producción):** avísale al otro dueño *antes* de aplicarlos y pruébalos con datos de prueba (§9). No hay copia de pruebas: un error afecta a los médicos reales.
- **Datos de prueba:** usa el prefijo `QA` más tu inicial (`QA-J…`, `QA-D…`) para no borrar por error los del otro, y bórralos al terminar.
- **Secretos:** cada quien tiene sus propias cuentas y contraseñas; nunca las compartan ni las pongan en el repositorio. Las llaves del `.env` (ver `.env.example`) se pasan por un canal privado.
- Las **rutinas de Claude** (blog, keep-alive; ver §7a) viven en la cuenta de Jorge. Si David necesita manejarlas, hay que recrearlas en su cuenta.

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

`.env` (no se sube a git) necesita: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (obligatorias), y opcionalmente `VITE_GOOGLE_MAPS_API_KEY` y `VITE_GOOGLE_MAP_ID` (mapas, ver sección 8b; sin ellas el sitio funciona pero sin mapa ni autocompletado). La anon key de Supabase es pública por diseño; la llave de Google también va en el navegador y se protege en Google Cloud con restricción de sitio (buscoundoctor.com, localhost) y de APIs, no ocultándola. Las mismas variables deben existir en Vercel. **Jamás** pongas la *service role key* en el repo ni en el frontend.

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

## 7a. Tareas programadas

- **Publicar posts programados:** `pg_cron` en Supabase, job `publish-scheduled-posts` (cada 15 min) llama a `public.publish_scheduled_posts()`. Ya no existe el flujo equivalente de Base44.
- **Rutina diaria "BLOG POSTS"** (Claude, 9:10 a. m. hora de Monterrey): toma los 2 artículos más recientes de la carpeta de Google Drive "Blogs Doctores 2.0" y, si su slug no existe, los crea como **borrador** (`published = false`) en `blog_post` de Supabase. Jorge los revisa y publica desde el admin. No usa Base44. Se edita desde la app de Claude (Rutinas/Cowork) o con la herramienta `RemoteTrigger`.
- **Rutina "Supabase keep-alive"** (cada 4 días): una lectura ligera a la API para que Supabase no pause el proyecto por inactividad.
- La rutina "schema watchdog" de Base44 se apagó: ya no aplica.

## 7b. Rutas principales

Públicas: `/`, `/especialistas`, `/especialista/:slug`, `/especialidad/:slug[/:zonaSlug]`, `/:professionSlug/:citySlug[/:zonaSlug]` (páginas SEO), `/enfermedades[/:slug[/:citySlug]]`, `/blog[/:slug]`, `/planes`, `/para-medicos`, `/chequeos-medicos`, `/nosotros`, `/contacto`, `/preguntas-frecuentes`, `/registro-medico`, `/iniciar-sesion`, `/olvide-contrasena`.
Privadas (no indexables): `/panel-medico/*` (doctor) y `/admin/*` (admin). El mismo formulario de `/iniciar-sesion` sirve a ambos y **siempre** manda a `/panel-medico`; si la cuenta es admin, esa pantalla muestra un aviso ("Este panel es para médicos") con un botón hacia el panel de administración, o se entra directo a `/admin`.

Reglas SEO que ya existen (no las rompas): `/especialistas` es `noindex` cuando trae filtros en la URL; `/especialidad/:slug/:zona` solo es indexable si hay ≥1 médico; el perfil incluye schema `Physician` + `AggregateRating` + `FAQPage`; el perfil `noindex` si no está publicado.

## 8. Perfil público del médico (`src/pages/SpecialistProfile.jsx`)

- Orden de secciones **aprobado por Jorge** (igual en móvil, tablet y escritorio): hero (foto, nombre, especialidad, modalidad, años de experiencia + enfermedades principales, resumen de reseñas, bio) → **Especialidades → Hospitales → Servicios → Información → Experiencia → Estudios → Tecnología → Preguntas frecuentes → Casos → Publicaciones → Artículos del médico → Opiniones → Especialistas similares**. La reseña resumida del hero se oculta si no hay reseñas.
- El orden se logra con `order-N` / `lg:order-N` de flexbox, **no moviendo el JSX**. Por eso `get_page_text` (que lee el DOM) NO refleja el orden visual: para verificarlo, compara `getBoundingClientRect().top` de cada `id`. Tailwind trae `order-1..12`; `tailwind.config.js` lo extiende a 15. Si agregas una sección, renumera con cuidado.
- La tarjeta "Agendar cita" es `position: sticky` en escritorio; en móvil hay una barra fija abajo (`MobileBookingBar`).
- Reseñas con desglose y foto, botón Compartir, y artículos del médico ya existen.

## 8a. Panel del médico (`src/pages/DoctorPanel.jsx`)

- Pensado para médicos **no técnicos**: sin jerga (nada de "SEO", "score", "clicks", "impresiones", "slug"). Usa palabras de médico ("Veces que te vieron", "Mis consultorios", "Llena tu perfil").
- **Un solo porcentaje:** `completeness_score` ("Tu perfil está completo al X%"), calculado por la RPC `recalculate_specialist_score` con 9 puntos (nombre, número de cédula, presentación de 50+ palabras, especialidad, consultorio, documento de cédula, formación, idiomas, foto). La pantalla "Llena tu perfil" (`ProfileChecklist.jsx`) usa `completeness_checklist` de esa misma RPC. `seo_score` sigue calculándose en la base pero **ya no se muestra** en el panel.
- La especialidad cuenta como capturada con el texto `specialty` (antes solo se miraba `specialty_id`, que nadie llena, y el porcentaje nunca llegaba a 100%).
- **Funciones ocultas del menú por ahora** (el código sigue ahí para reactivarlas; ver el comentario sobre `SECTION_GROUPS`): "Tu plan", "Escribir blog", "Productos digitales", "Configuración de pagos" y "Resumen de consulta".
- `DoctorEditorPerfil` recibe `simple` en el panel del médico (sin dirección web, sin certificaciones en texto libre, sin barra de formato); el admin lo ve completo.
- La bienvenida es una sola pantalla (`WelcomeTourModal.jsx`).
- **Menú de 7 opciones:** Inicio, Solicitudes de cita, Reseñas, Llena tu perfil, Mi perfil, Mi cédula y documentos, y el enlace "Mi página pública". "Mi perfil" (`ProfileHub.jsx`) es una página de tarjetas que abre las pantallas de siempre (datos, formación, idiomas, consultorios, servicios, seguros y lo opcional); esas pantallas siguen teniendo su propia clave en `DoctorPanel` y `PROFILE_SUB_KEYS` mantiene "Mi perfil" resaltado.
- **Inicio del médico:** arriba `ProfileStatusCard` ("¿ya aparezco en el sitio?"; se calcula con `publication_status`, `active`, `license_verification_status` y el estado de los documentos de cédula e identificación), luego "Tus próximos pasos" (los 3 primeros pendientes de `src/lib/profileChecklistItems.js`), luego estadísticas (con perfil nuevo solo un aviso corto). La ayuda por WhatsApp está en el menú y en una tarjeta al final del inicio (`supportWhatsAppLink`).
- **Paso a paso** (`GuidedStepBar.jsx`, lógica en `DoctorPanel`: `startGuided`/`goGuided`): botón "Empezar paso a paso" en "Llena tu perfil" y en la bienvenida. Junta lo pendiente por pantalla y recorre las pantallas de siempre con una barra fija abajo ("Paso 2 de 5", Atrás / Siguiente / Salir); guarda al cambiar de paso y se apaga si el médico usa el menú. No hay formularios duplicados.
- Para probar los estados de esa tarjeta con datos de prueba: `publication_status` y `active` solo los cambia un admin (trigger `protect_specialist_admin_columns`); por SQL se simula con `set_config('request.jwt.claims', …sub de un admin…, true)` dentro de la misma consulta.

## 8a-ter. Notificaciones del médico (campana del panel)

- **Para el doctor, dentro de su panel** (no para los admins): campana arriba (escritorio) o en la barra superior (celular), con el número de novedades sin leer; "Ver todas" abre la pantalla `notificaciones` (últimas 50). Además, contadores rojos en el menú (Solicitudes de cita, Reseñas, Mi cédula y documentos) y, al entrar a una de esas pantallas, sus avisos se marcan como leídos solos. Se refresca cada minuto y al volver a la pestaña. Código: `NotificationBell.jsx`, `DoctorNotifications.jsx`, `useDoctorNotifications.js`, `src/lib/doctorNotifications.js`.
- **Los avisos los crea la base de datos con triggers** (así no depende de qué pantalla origine el evento): tabla `doctor_notification` (RLS: cada doctor lee solo los suyos; nadie escribe directo) con `notify_doctor()` (interna) y `mark_doctor_notifications_read(ids)` (la usa el panel). Eventos: nueva solicitud de cita (`appointment_request` insert), nueva reseña y reseña publicada (`review`), documento aprobado/rechazado (`specialist_document`, incluye el motivo), perfil publicado / necesita ajuste / en pausa, y cédula verificada (`specialist`). `notify_doctor` atrapa sus propios errores: un aviso que falla nunca debe bloquear una cita, reseña o aprobación. Migraciones aplicadas en Supabase (no están en git): `doctor_notifications` y `doctor_notifications_never_block`.
- Para agregar un tipo de aviso: crear el trigger/función en Supabase, y darle icono y color en `src/lib/doctorNotifications.js`.
- Pendiente a propósito: avisos de "nuevo mensaje" o de artículos del blog (el blog del médico está oculto).

## 8a-quater. Ajustes del médico (admin doctores)

- Botón **"Ajustes"** (engranaje) debajo del menú del panel, en escritorio y en el menú de celular; sección `ajustes` de `DoctorPanel.jsx`. Pestañas en `src/components/admin/settings/DoctorSettings.jsx`: **Mi cuenta**, **Correos**, **Vacaciones**, **Compartir** y **Ayuda** (el asistente, ver más abajo, no ve "Mi cuenta").
- **Mi cuenta** (`AccountSettings.jsx`, solo el dueño real): cambiar contraseña (pide la actual, la verifica iniciando sesión de nuevo; si la cuenta entra con Google/Microsoft no se muestra), **gestionar a su asistente** (ver más abajo), **cerrar sesión en todos los dispositivos**, **descargar mis datos** y **solicitar baja**. El **correo de acceso no se cambia solo**: se muestra y se manda por WhatsApp (cambiarlo exige confirmar con código y se prefirió no abrir esa puerta todavía).
- **Solicitar baja no borra nada.** La RPC `request_profile_deletion(reason)` pone `specialist.deletion_requested_at`, registra `doctor_solicita_baja` en el historial y manda correo a `admin_notification_emails()`; `cancel_profile_deletion()` lo revierte (`doctor_cancela_baja`). Los dueños la ven en la **Bandeja** ("Solicitudes de baja", cuenta en el número rojo) y como aviso rojo en la pantalla de revisión; si se confirma, se manda a la papelera desde Doctores. `buildData` nunca escribe `deletion_requested_at` (para que el autoguardado no la pise). Estas dos RPC, y `export_my_data()`, comprueban `owner_user_id = auth.uid()` **directo** (no `is_specialist_owner()`), a propósito: son del dueño, nunca del asistente.
- **Cerrar sesión en todos los dispositivos** (`signOutEverywhere` en `doctorSettings.js`, usa `supabase.auth.signOut({ scope: 'global' })`, probado revocando de verdad el refresh token de "otro dispositivo"). **Importante:** el logout normal (`base44.auth.logout`, botón "Salir del panel") por defecto de supabase-js usa scope `'global'` — **sin querer cerraba sesión en todos lados**; se corrigió pasando `scope: 'local'` por defecto en `logout()` (`base44Client.js`). Si necesitas cerrar todo explícitamente, pasa `logout(returnUrl, 'global')`.
- **Descargar mis datos**: RPC `export_my_data()` (solo dueño) arma un JSON con perfil, consultorios y horarios, documentos (sin `file_url`), formación, idiomas, servicios, distintivos, casos, publicaciones, reseñas y solicitudes de cita recibidas, preferencias de correo y la página pública personalizada; se descarga como archivo `.json` en el navegador. Deja rastro en `activity_log` (`doctor_descarga_datos`).
- **Compartir mi perfil** (pestaña Compartir, `ShareProfile.jsx`): enlace con copiar, botón "Compartir" (share nativo del celular si existe, si no copia), enlace directo de WhatsApp, y un código QR generado **en el navegador** con la librería `qrcode` (sin mandar la URL a ningún servicio externo) con botón para descargarlo como PNG.
- **Correos** (`EmailPreferences.jsx`): tres interruptores — `citas`, `resenas` y `estado` — en la tabla `doctor_email_preference` (RLS vía `is_specialist_owner()`; sin fila = todo activado). `send_transactional_email` los respeta (`case p_type when 'nueva_solicitud_cita' then citas when 'nueva_resena' then resenas else estado end`) y devuelve `preferencia_desactivada` (la bienvenida siempre sale). La campana del panel no se apaga. El aviso de reseña nueva lo dispara `notifyNewReview()` (`doctorNotify.js`) desde `ReviewForm.jsx` al crear la reseña (Review.create no regresa la fila para quien reseña, por eso se avisa con los datos ya capturados en el formulario, no con la respuesta del insert).
- **Correo de tu asistente** (en la pestaña Correos, columna `doctor_email_preference.aviso_email`): opcional. Las **solicitudes de cita** (`nueva_solicitud_cita`) se mandan también a ese correo, además de al del doctor; `send_transactional_email` lo resuelve dentro de Postgres (el cliente nunca elige destinatario). Los correos de perfil/documentos solo llegan al doctor. Si el doctor apaga el interruptor de citas, no se manda a nadie.
- **Vacaciones** (pestaña Vacaciones, `VacationSettings.jsx`, dueño o asistente): el doctor oculta su perfil por unos días (hasta 90) y regresa solo. RPC `start_vacation(fecha)` / `end_vacation()` (SECURITY DEFINER; resuelven "mi" specialist con `get_my_specialist_id()`, y usan `app.bypass_score_protection` para poder cambiar `active` sin tocar el trigger de protección) ponen `specialist.active = false` y `specialist.vacation_until`. Un job de `pg_cron` (`end-expired-vacations`, cada hora al minuto 5) corre `end_expired_vacations()` y devuelve a los que cumplieron la fecha (hora de Monterrey). Solo aplica a perfiles publicados y visibles. **Cualquier decisión del equipo (aprobar, rechazar, pausar, regresar a revisión, activar/desactivar en la lista) pone `vacation_until = null`** (`src/api/doctorReview.js`, `AdminDoctores.jsx`) para que el job no la contradiga. El doctor ve el estado en su Inicio (`ProfileStatusCard`) y los dueños lo ven como "De vacaciones hasta…" / "Vacaciones" en Doctores. `buildData` nunca escribe `vacation_until`. El trigger `trg_notify_specialist_status` manda avisos propios de vacaciones (`perfil_vacaciones`). Historial: `doctor_inicia_vacaciones` / `doctor_termina_vacaciones`.
- **Ayuda** (`HelpCenter.jsx`, textos en `src/lib/doctorHelp.js`): enlace público del perfil con botón copiar, preguntas frecuentes por tema y WhatsApp. Si cambias nombres del menú, actualiza esos textos.

### Acceso para un asistente

Un médico puede invitar a **una** persona (secretaria, asistente) para que entre a su panel con su propia cuenta. Decisión de alcance (2026-09-22, aprobada por Jorge): el asistente puede ver y editar **casi todo** (perfil, documentos, consultorios, citas, reseñas, correos, vacaciones) **igual que el dueño**, pero **no** puede cambiar la contraseña/correo del dueño, pedir la baja del perfil, descargar los datos, ni invitar/quitar a otro asistente — esas cuatro cosas viven solo en la pestaña "Mi cuenta", que ni siquiera se le muestra.

- **Tabla `specialist_assistant`** (`specialist_id` único — un solo asistente por médico — `user_id` único, `email`). Sin policies de insert/update/delete: con RLS activo y ninguna definida, esas operaciones quedan bloqueadas para todos salvo las dos RPC de abajo (SECURITY DEFINER).
- **`is_specialist_owner(specialist_id)`** (la función central que ya usaban ~46 policies de tablas hijas — `office`, documentos, formación, citas, reseñas, storefront, notificaciones…) ahora también reconoce a un asistente. Fue el cambio de más apalancamiento: extenderla ahí arregló todas esas tablas de un solo golpe, sin tocar cada policy. Las policies propias de `specialist` (select/update) se homologaron para usarla también (antes tenían el chequeo del dueño repetido en línea).
- **`get_my_specialist_id()`**: para las funciones que antes solo reconocían al dueño por `owner_user_id = auth.uid()` y ahora también deben aceptar al asistente (`start_vacation`, `end_vacation`, `resubmit_for_review`); `mark_doctor_notifications_read` se cambió para usar `is_specialist_owner()` directo.
- **Fotos y video (`specialist-photos`, `specialist-videos`)**: la carpeta de Storage sigue siendo el `auth.uid()` del **dueño** (no se movió ni renombró ningún archivo existente). Para que el asistente pueda subir ahí, se agregó `can_write_specialist_media(owner_uid)` (dueño, o asistente de ese dueño, o admin) en las 6 policies de esas dos buckets, y `base44Client.js` (`uploadFile`) resuelve la carpeta correcta: si quien sube no es dueño de ningún perfil, busca su fila en `specialist_assistant` y usa el `owner_user_id` del médico, no su propio uid. Documentos y productos ya usaban `specialist_id` como carpeta con `is_specialist_owner()`, así que no necesitaron cambios.
- **Invitar** (`invite_specialist_assistant(email)`, botón "Invitar" en Mi cuenta): valida el correo, rechaza si el médico ya tiene asistente, si el correo es el suyo propio, si ya es dueño de otro perfil, si es del equipo (admin), o si ya es asistente de otro médico. Si el correo no tiene cuenta, la crea (mismo patrón que las cuentas QA/David: contraseña aleatoria que nadie conoce, `email_confirmed_at = now()`, campos de token en `''`) y le manda un correo explicando que debe entrar a `/olvide-contrasena` con ese correo para poner su propia contraseña. `crypt()`/`gen_salt()` viven en el esquema `extensions`, no en `public` — hay que calificarlos (`extensions.crypt(...)`) porque estas funciones fijan `search_path` a solo `'public'` por seguridad.
- **Quitar acceso** (`remove_specialist_assistant()`, solo dueño): borra la fila de `specialist_assistant`. Es inmediato — probado que, apenas se borra, un `UPDATE` del ex-asistente sobre `specialist` afecta 0 filas — pero **no** borra la cuenta de `auth.users` (puede volver a invitarse a la misma persona después).
- Ambas RPC (`invite_specialist_assistant`, `remove_specialist_assistant`) comprueban `owner_user_id = auth.uid()` directo, nunca `is_specialist_owner()`/`get_my_specialist_id()`: un asistente no puede invitar a otro ni quitarse el acceso a sí mismo (verificado).
- El panel (`DoctorPanel.jsx`) resuelve "¿de quién es este panel?": primero busca `Specialist.filter({owner_user_id})`; si no hay nada, busca su fila en `specialist_assistant` y carga ESE `specialist_id`. Guarda `isAssistant` y se lo pasa a `DoctorSettings`, que oculta la pestaña "Mi cuenta". El sidebar (escritorio y menú de celular) muestra "Entraste como asistente de este médico." en vez de "Administra tu perfil en BuscoUnDoctor.".
- Historial: `doctor_invita_asistente` / `doctor_quita_asistente`.
- **Trampa conocida (no nueva, pero más probable ahora):** si el dueño y su asistente tienen el panel abierto al mismo tiempo, el autoguardado de quien lleva más tiempo con la pestaña abierta (formulario en memoria desactualizado) puede sobrescribir un cambio reciente del otro 30 segundos después — el mismo problema de §10, ahora entre dos personas distintas y no solo entre dos pestañas del mismo doctor. No se resolvió (edición concurrente con fusión/bloqueo optimista quedaría para otra sesión si se vuelve un problema real).
- Migraciones aplicadas en Supabase (no están en git): `doctor_settings_email_prefs_and_deletion_request`, `doctor_settings_notice_email_and_vacation`, `doctor_settings_reviews_email_and_data_export`, `specialist_assistant_access`, `fix_invite_assistant_crypt_schema`, `review_owner_visibility_and_doctor_reply`.

### Pedir una reseña y responder reseñas

- **Pedir una reseña** (pestaña Compartir, `ShareProfile.jsx`, junto a "Compartir mi perfil"): un mensaje de WhatsApp listo para mandarle a un paciente después de su consulta, con un enlace a `/especialista/:slug#opiniones` — esa ancla ya existía en `ReviewsSection.jsx` y abre directo el botón "✏️ Escribir opinión". No hubo que tocar el perfil público para esto, solo reusar lo que ya había.
- **Responder una reseña** (`DoctorReviews.jsx`, botón "Responder" en cada reseña ya aprobada — no tiene caso responder una que todavía nadie ve): la respuesta se guarda con la RPC `reply_to_review(review_id, reply)` (`review.doctor_reply` / `doctor_reply_at`), se ve públicamente debajo de la reseña en el perfil (`ReviewsSection.jsx`) con un estilo distinto ("Respuesta de [nombre]"). Se puede editar o borrar. A propósito **no** hay una policy de UPDATE general en `review` para dueño/asistente — todo pasa por esa función, que solo toca esas dos columnas (nunca `rating`, `comment` ni `approved`). Historial: `doctor_responde_resena` / `doctor_borra_respuesta_resena`.
- **Hueco que se encontró y corrigió de paso:** `review_select` solo dejaba ver reseñas con `approved = true` (o admin) — el doctor **nunca había podido ver sus propias reseñas pendientes o rechazadas** desde su panel, aunque `DoctorReviews.jsx` ya mostraba (mal, siempre en 0) un contador de "Pendientes". Se corrigió agregando `is_specialist_owner(specialist_id)` a esa policy, igual que en todo lo demás.

## 8a-bis. Revisar y aprobar doctores (admin)

- **"Aprobar" hace todo en un paso:** deja el perfil `published` **y** `active = true` (visible en el directorio) y manda **un solo** correo de "perfil publicado". Vive en `src/api/doctorReview.js` (`approveDoctor` / `rejectDoctor`); la Bandeja, la lista de Doctores y la pantalla de revisión lo usan, para que se comporten igual. Antes "Aprobar" solo cambiaba `publication_status` y el perfil seguía invisible hasta encender "Perfil activo" aparte.
- **Pantalla de revisión** `/admin/doctores/revisar/:id` (`AdminDoctorReview.jsx`): resumen del doctor, qué tiene y qué le falta (9 puntos), sus documentos con aprobar/rechazar (`DocumentManager`) y los botones "Aprobar y publicar" / "Pedir cambios" (esto último deja `rejected` y le manda el motivo por correo). Aprobar el perfil no marca la cédula como verificada: eso lo hace aprobar el documento.
- **Estados del perfil (admin):** en el editor, sección "Estado y visibilidad" (`DoctorEditorSidebar.jsx`), un solo control con tres opciones que se aplican al momento y actualizan el formulario (para que el autoguardado no las revierta): **En revisión** (`pending_review`, no visible), **Publicado** (`published` + `active`, visible; manda el correo) y **En pausa** (`published` + `active = false`, oculto). `rejected` ("Pedir cambios") solo se pone desde la pantalla de revisión, que exige el motivo. La lógica está en `setDoctorState` (`src/api/doctorReview.js`). "Perfil destacado" y "Sello de verificado" siguen guardándose con "Guardar cambios"/autoguardado. La dirección web (slug) quedó bajo "Avanzado". Un perfil `published` pero con `active = false` se le muestra al médico como "en pausa".
- El editor del admin usa `DoctorEditorPerfil simple` (sin barra de formato ni campos técnicos). Para un doctor **nuevo** el encabezado ofrece "Guardar como borrador" y "Crear y publicar"; el estado solo se puede cambiar una vez guardado.
- **Doctor que corrige tras "Pedir cambios":** en su tarjeta de estado aparece "Ya corregí, enviar a revisión", que llama a la RPC `resubmit_for_review()`. Esta **no** cambia `publication_status` (queda `rejected`; solo un admin cambia estados, por el trigger `protect_specialist_admin_columns`): pone `specialist.resubmitted_at`, registra en el historial y manda correo a los avisos del equipo. `isAwaitingReview` (`src/api/doctorReview.js`) cuenta como "esperando revisión" a `pending_review`, borradores con dueño y `rejected` con `resubmitted_at`; lo usan la Bandeja, la lista de Doctores y los contadores. Aprobar, pedir cambios o cambiar el estado desde el editor limpian `resubmitted_at`. `buildData` nunca escribe esa columna (para que el autoguardado no la pise).
- **Correos de aviso al equipo:** ya no hay un correo fijo en las funciones. Viven en la tabla `admin_notification_recipient` (solo admin) y la función `admin_notification_emails()`; las usan `create_doctor_profile`, `send_transactional_email` (contacto público / interés en especialidades) y `resubmit_for_review`. Para agregar a alguien: `insert into public.admin_notification_recipient (email) values ('correo@ejemplo.com');` (para quitarlo, `active = false`). Migraciones aplicadas en Supabase (no están en git): `admin_notification_recipients` y `resubmit_for_review`.
- **Premium oculto en el admin:** el interruptor `SHOW_PREMIUM` (`src/lib/featureFlags.js`, ahora `false`) esconde el menú Premium, el banner y la etiqueta Gratis/Premium de la lista, la sección de la Bandeja y su conteo. Las rutas y el código siguen ahí; ponerlo en `true` los devuelve. "Planes y precios" (configuración) y la página pública `/planes` no se tocaron.
- **Dirección web (`slug`):** se genera sola desde el nombre solo mientras el perfil aún no existe (no tiene `id`). Ya guardado, cambiar el nombre **no** la cambia (rompería enlaces compartidos y SEO); el admin puede cambiarla a propósito en "Avanzado". Vive en `update` de `useSpecialistForm` (`src/api/specialistForm.js`).

## 8b. Mapas y ubicación (Google Maps)

- Todo el mapa usa **Google Maps** (`@vis.gl/react-google-maps`); Leaflet/CARTO ya no existen. Utilidades y configuración en `src/lib/googleMaps.js`.
- **Autocompletado de direcciones** (`src/components/PlaceAutocomplete.jsx`, Places API New): se usa en el paso de ubicación del registro (`StepUbicacion.jsx`) y en `OfficeManager.jsx`. Al elegir una sugerencia guarda **latitud/longitud exactas**; sin llave de Google el componente no se muestra y la dirección se captura a mano.
- **Registro:** al terminar (después del OTP) `RegistroMedico.jsx` crea el `office` principal del médico con esas coordenadas (`createOfficeFromData`, best-effort: si falla, el registro sigue).
- **Mapa de búsqueda** (`SpecialistsMapPanel.jsx`): dibuja solo consultorios con `latitude/longitude` guardados; **ya no geocodifica en el navegador del visitante**. Sin llave no se muestra en producción.
- **Perfil público** (`PublicOfficeList.jsx`): iframe oficial de la Maps Embed API (gratuita) en el punto exacto.
- `src/lib/officeGeo.js` (Nominatim) queda solo como respaldo **al guardar** un consultorio capturado a mano; editar el texto de la dirección borra las coordenadas para que se recalculen.
- APIs que deben estar habilitadas en Google Cloud: Maps JavaScript API, Places API (New), Maps Embed API. Conviene un tope de gasto (cuota diaria) en el proyecto.
- Sin llave, `PublicOfficeList.jsx` y `storefront/StorefrontLocation.jsx` caen al embed no oficial de Google (`maps.google.com/maps?...&output=embed`).

## 8c. Programa de referidos ("invita a un colega")

Decisión de negocio (2026-09-22, aprobada por Jorge) para atacar el cuello de botella real: reclutar médicos. Cada médico tiene un código único; si invita a otro médico que se registra con ese código **y su perfil queda aprobado**, el que invitó gana **1 mes de Premium** — aunque Premium hoy esté apagado (`SHOW_PREMIUM=false`) y sin cobros (Stripe dormido), el mes se acumula en `premium_status.trial_ends_at` para cuando se active. El premio es para quien **invita**, no para quien se registra.

- **`specialist.referral_code`** (6 caracteres, alfabeto sin 0/O/1/I/L para que se lea fácil por WhatsApp o en voz alta), único, generado solo por `generate_referral_code()` (revocada de `public`/`anon`/`authenticated` — nadie la llama directo). Todos los médicos que ya existían recibieron uno al aplicar la migración.
- **`specialist.referred_by_id`** (a qué médico se le atribuye la invitación) y **`referral_rewarded_at`** (evita pagar el premio dos veces si el perfil se pausa y se vuelve a publicar).
- **Captura en el registro:** un campo opcional "¿Te invitó otro médico?" al final de `StepDatos.jsx`, con validación en vivo vía `validate_referral_code(code)` (RPC pública, sin exponer nada del médico salvo su nombre) que muestra "Fuiste invitado por Dr. X". Un código inválido o vacío **nunca bloquea el registro** — se ignora en silencio. `RegistroMedico.jsx` lee `?ref=CODIGO` de la URL para precargarlo (así funciona el enlace de invitación de un clic). `create_doctor_profile` resuelve el código a `referred_by_id` una sola vez, sea que el perfil se cree de cero o se reclame desde un borrador (`saveRegistrationDraft` no necesitó cambios: el código va en el payload final).
- **El premio NO se acredita solo (decisión explícita de Jorge, 2026-09-22).** Aprobar al invitado (o que su perfil se vuelva visible por cualquier otro camino) no toca `premium_status` ni manda nada — solo dispara los avisos normales de siempre. El **equipo decide y acredita a mano** con `credit_referral_reward(specialist_id)` (SECURITY DEFINER, revisa `is_admin()` ella misma además de estar revocada de `public`/`anon` — verificado que un doctor normal la llama y le rechaza "No autorizado"). Esa función exige que el invitado ya esté `published`+`active` y que no se le haya pagado antes (`referral_rewarded_at is null`); entonces le suma 30 días a `trial_ends_at` de quien invitó (se acumulan si invita a varios), le manda un aviso en la campana (`referido_premiado`, ícono de regalo) y un correo (`referido_aprobado`, respeta la preferencia `estado`).
- **Dónde lo acredita el equipo:** una cola nueva en la **Bandeja** ("Premios de referidos por acreditar", `AdminInbox.jsx` — cuenta en el número rojo vía `pendingCounts.js`) con un botón por cada invitado ya publicado, y el mismo botón aparece directo en la pantalla de revisión (`AdminDoctorReview.jsx`) cuando corresponde, para no tener que ir a buscarlo aparte.
- **"Invita a un colega"** (pestaña Compartir, `ShareProfile.jsx`): el código propio, el enlace `/registro-medico?ref=CODIGO`, un mensaje de WhatsApp, y dos números — **"Colegas invitados"** (todos, cuenten o no con premio todavía) y **"Llevas ahorrado"** (solo los ya premiados × el precio del plan Premium, leído de `plan.price_monthly` en vivo, no un número fijo en el código) — y debajo el detalle de cada invitado con su estado ("Esperando aprobación" / "Premio acreditado"). Usa `list_my_referrals()` (RPC propia) en vez de leer `specialist` directo, porque un médico no puede ver el perfil de otro que todavía no está publicado.
- **Correo a quien invitó:** ya estaba desde que se armó `credit_referral_reward` — cuando el equipo acredita el premio, el correo `referido_aprobado` (plantilla "¡Ganaste un mes de Premium!") se manda solo, como parte de esa misma función. Verificado con una prueba real: queda en `email_log` con `status = 'sent'` al correo de quien invitó.
- El admin ve "🎁 Invitado por [nombre]" en la pantalla de revisión (`AdminDoctorReview.jsx`) cuando aplica.
- Migraciones aplicadas en Supabase (no están en git): `doctor_referral_program`, `list_my_referrals_rpc`, `referral_reward_manual_not_automatic`.

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
