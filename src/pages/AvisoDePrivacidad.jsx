import { useEffect } from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function AvisoDePrivacidad() {
  useEffect(() => {
    const title = "Aviso de Privacidad y Política de Cookies | BuscoUnDoctor";
    const description = "Cómo BuscoUnDoctor recopila, usa y protege tus datos personales, y qué cookies utiliza el sitio.";
    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index,follow");
    setOpenGraph({ title, description, image: SITE_OG.image });
  }, []);

  return (
    <LegalPageLayout
      title="Aviso de Privacidad y Política de Cookies"
      updatedAt="3 de agosto de 2026"
      breadcrumbLabel="Aviso de privacidad"
    >
      <section>
        <h2>1. Introducción</h2>
        <p>
          Proteger tu privacidad y la seguridad de tus datos personales es una prioridad para BuscoUnDoctor
          (“BuscoUnDoctor”, “nosotros”). Este Aviso de Privacidad y Política de Cookies (el “Aviso de Privacidad”)
          explica cómo recopilamos, usamos, almacenamos, compartimos y protegemos los datos personales de quienes
          utilizan buscoundoctor.com (el “Sitio”) y los servicios que ofrecemos a través de él (los “Servicios”).
        </p>
        <p>
          Te recomendamos leer este Aviso de Privacidad junto con nuestras{" "}
          <a href="/terminos-y-condiciones" className="text-brand-blue hover:underline">Condiciones Generales de Contratación</a>{" "}
          antes de usar el Sitio, escribir una reseña, solicitar una cita con un especialista o crear una cuenta
          como profesional de la salud.
        </p>
      </section>

      <section>
        <h2>2. A quién aplica este Aviso</h2>
        <p>Este Aviso de Privacidad aplica a cualquier persona que visite o utilice el Sitio. Para efectos de este documento:</p>
        <ul className="list-disc pl-5">
          <li><strong>“Visitante”</strong>: cualquier persona que navega el Sitio sin escribir una reseña, sin solicitar una cita y sin tener una cuenta.</li>
          <li><strong>“Paciente” o “Usuario”</strong>: la persona que utiliza el Sitio para buscar especialistas, escribir una reseña o enviar una solicitud de cita, con o sin haber creado una cuenta.</li>
          <li><strong>“Especialista en Salud” o “Doctor”</strong>: el médico o profesional de la salud que crea una cuenta y un perfil público en el Sitio, incluyendo quienes contratan un plan de pago.</li>
        </ul>
        <p>Ten en cuenta que BuscoUnDoctor no ofrece cuentas de paciente: para buscar especialistas, escribir una reseña o solicitar una cita no necesitas registrarte.</p>
      </section>

      <section>
        <h2>3. Responsable del tratamiento de tus datos personales</h2>
        <p>
          BuscoUnDoctor es operado por <strong>[NOMBRE COMPLETO DEL TITULAR]</strong>, persona física, con domicilio en
          Monterrey, Nuevo León, México, quien es responsable del tratamiento de tus datos personales conforme a este
          Aviso de Privacidad.
        </p>
        <p>Puedes contactarnos para cualquier duda relacionada con tus datos personales en: <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>.</p>
      </section>

      <section>
        <h2>4. Origen de tus datos personales</h2>
        <p>
          Recabamos tus datos personales directamente de ti: cuando creas una cuenta como Especialista en Salud,
          cuando llenas el formulario de registro, cuando escribes una reseña, cuando envías una solicitud de cita, o
          cuando te comunicas con nosotros por correo electrónico.
        </p>
        <p>
          El Sitio también recaba automáticamente cierta información técnica cuando lo navegas, a través de cookies y
          tecnologías similares. Puedes conocer más sobre esto en la sección 18 de este Aviso de Privacidad.
        </p>
      </section>

      <section>
        <h2>5. Categorías de datos personales que tratamos</h2>
        <h3>5.1 Si eres Paciente o Visitante</h3>
        <p>Si solo navegas el Sitio, no recabamos datos que te identifiquen más allá de la información técnica de navegación descrita en la sección de cookies.</p>
        <p>Si escribes una reseña sobre un especialista, recabamos:</p>
        <ul className="list-disc pl-5">
          <li>Tu nombre (el que decidas usar en la reseña, no requerimos que sea tu nombre legal completo);</li>
          <li>Tu calificación (de 1 a 5 estrellas) y el comentario que escribas.</li>
        </ul>
        <p>Si envías una solicitud de cita con un especialista, recabamos:</p>
        <ul className="list-disc pl-5">
          <li>Datos de identificación y contacto: nombre completo y número telefónico;</li>
          <li>Datos sobre el motivo de tu consulta, fecha y horario preferido, y comentarios adicionales que decidas incluir.</li>
        </ul>
        <p>
          Te informamos que el campo “motivo de consulta” puede llegar a contener <strong>datos personales sensibles
          relacionados con tu salud</strong> (por ejemplo, si describes un síntoma o padecimiento). Te recomendamos
          incluir únicamente la información estrictamente necesaria para que el especialista entienda el motivo de tu
          solicitud, y evitar compartir detalles médicos que no sean indispensables en este formulario.
        </p>
        <p>
          Esta información se guarda en nuestros sistemas y, al mismo tiempo, se utiliza para generar un mensaje que se
          abre en WhatsApp dirigido al especialista que elegiste — es decir, el envío final de tu solicitud ocurre a
          través de WhatsApp, un servicio operado por Meta Platforms, Inc., sujeto a su propia política de privacidad.
        </p>

        <h3>5.2 Si eres Especialista en Salud (doctor)</h3>
        <p>Para crear y mantener tu perfil público y tu cuenta, recabamos:</p>
        <ul className="list-disc pl-5">
          <li>Datos de identificación: título, nombre completo, número de cédula profesional, especialidad y subespecialidad, años de experiencia;</li>
          <li>Datos de contacto: número de WhatsApp, dirección de tu(s) consultorio(s) (calle, colonia, número exterior e interior, piso, código postal, zona);</li>
          <li>Datos de tu cuenta: correo electrónico y contraseña (gestionados a través de nuestro proveedor de autenticación, ver sección 9);</li>
          <li>Imagen personal: fotografía de perfil y, si decides subirlas, fotografías de tu consultorio o certificados en tu galería;</li>
          <li>Datos patrimoniales: precio de tu consulta de primera vez y, en su caso, de otros servicios que decidas publicar;</li>
          <li>Cualquier otra información que decidas agregar voluntariamente a tu perfil (formación académica, idiomas, aseguradoras, publicaciones, casos de éxito, documentos de identificación o cédula que subas para nuestra verificación manual).</li>
        </ul>
        <p>
          Ten en cuenta que la información que publicas en tu perfil (a excepción de tus documentos de verificación y tu
          correo/contraseña) es pública y visible para cualquier persona que visite el Sitio, ya que ese es el
          propósito de un perfil de directorio médico.
        </p>
      </section>

      <section>
        <h2>6. Finalidades del tratamiento</h2>
        <h3>6.1 Si eres Paciente o Visitante</h3>
        <ul className="list-disc pl-5">
          <li>Mostrarte resultados de búsqueda de especialistas por especialidad, padecimiento y zona;</li>
          <li>Publicar tu reseña (previa moderación manual) en el perfil del especialista correspondiente;</li>
          <li>Generar y enviarte al canal de WhatsApp del especialista el mensaje con tu solicitud de cita;</li>
          <li>Responder tus dudas cuando nos contactas directamente;</li>
          <li>Prevenir fraudes, reseñas falsas y usos indebidos del Sitio, y hacer cumplir nuestras Condiciones Generales de Contratación;</li>
          <li>Cumplir obligaciones legales aplicables.</li>
        </ul>
        <h3>6.2 Si eres Especialista en Salud</h3>
        <ul className="list-disc pl-5">
          <li>Crear, verificar (incluida la verificación manual de tu cédula profesional) y publicar tu perfil público;</li>
          <li>Administrar tu cuenta y tu suscripción a alguno de nuestros planes;</li>
          <li>Calcular el nivel de completitud y el “score SEO” de tu perfil, y mostrarte recomendaciones para mejorarlo;</li>
          <li>Enviarte las solicitudes de cita y reseñas de pacientes relacionadas con tu perfil;</li>
          <li>Comunicarnos contigo para soporte técnico, avisos sobre tu cuenta o cambios en nuestras políticas;</li>
          <li>Cumplir obligaciones legales y fiscales aplicables a la relación contractual entre tú y nosotros.</li>
        </ul>
        <h3>6.3 Finalidades secundarias</h3>
        <p>
          Actualmente no utilizamos tus datos personales con fines de mercadotecnia, publicidad o prospección
          comercial de terceros, y no compartimos datos de salud con fines publicitarios. Si en el futuro quisiéramos
          hacerlo, te lo informaremos y, cuando la ley lo requiera, solicitaremos tu consentimiento expreso, dándote la
          oportunidad de negarte sin que ello afecte los Servicios principales que ya utilizas.
        </p>
      </section>

      <section>
        <h2>7. Base jurídica y carácter facultativo de tus datos</h2>
        <p>
          No estás obligado a proporcionarnos tus datos personales. Sin embargo, si no nos das los datos necesarios
          para operar el Sitio, escribir una reseña, enviar una solicitud de cita o crear un perfil de especialista, es
          posible que no podamos ofrecerte esos Servicios en particular.
        </p>
        <p>
          El tratamiento de tus datos se basa en tu consentimiento (al usar el Sitio, enviar un formulario o crear una
          cuenta) y, en el caso de los Especialistas en Salud de pago, en la necesidad de cumplir con la relación
          contractual entre BuscoUnDoctor y el Especialista.
        </p>
      </section>

      <section>
        <h2>8. Cómo protegemos tus datos</h2>
        <p>
          Tomamos medidas de seguridad técnicas y organizativas razonables para proteger tus datos personales frente a
          accesos no autorizados, pérdida o uso indebido, incluyendo el uso de conexiones cifradas y control de acceso
          a la información dentro de nuestra organización. Sin embargo, ningún sistema es completamente infalible: la
          transmisión de información por internet nunca puede garantizarse como absolutamente segura, y te
          recomendamos usar siempre una conexión segura al utilizar el Sitio.
        </p>
      </section>

      <section>
        <h2>9. Con quién compartimos tus datos personales</h2>
        <p>Podemos compartir tus datos personales con:</p>
        <ul className="list-disc pl-5">
          <li>El Especialista en Salud con el que decidas contactarte, cuando envías una solicitud de cita o una reseña dirigida a su perfil;</li>
          <li>Base44 (plataforma tecnológica sobre la que está construido el Sitio) y sus proveedores de infraestructura en la nube, quienes alojan nuestra base de datos y actúan como encargados del tratamiento siguiendo nuestras instrucciones;</li>
          <li>WhatsApp / Meta Platforms, Inc., como canal que tú eliges para contactar directamente al especialista;</li>
          <li>Autoridades competentes, cuando exista una obligación legal de hacerlo o nos sea requerido mediante un mandato válido;</li>
          <li>Un tercero, en caso de una eventual fusión, adquisición o reorganización del negocio, quien continuaría tratando tus datos conforme a este mismo Aviso de Privacidad o a uno equivalente.</li>
        </ul>
        <p>No vendemos tus datos personales a terceros ni los compartimos con fines de publicidad de terceros.</p>
      </section>

      <section>
        <h2>10. Transferencias internacionales de datos</h2>
        <p>
          Algunos de nuestros proveedores de infraestructura tecnológica (por ejemplo, servicios de hospedaje en la
          nube) pueden operar servidores fuera de México. En esos casos, únicamente compartimos la información
          necesaria para prestar el Servicio y buscamos que dichos proveedores mantengan medidas de seguridad y
          confidencialidad adecuadas. Si deseas más información sobre estas transferencias, puedes escribirnos a{" "}
          <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>.
        </p>
      </section>

      <section>
        <h2>11. Conservación de tus datos</h2>
        <ul className="list-disc pl-5">
          <li>Datos de cuenta de Especialistas en Salud: se conservan mientras tu cuenta esté activa, y durante el plazo adicional que exija la legislación fiscal y contable aplicable después de que canceles tu cuenta.</li>
          <li>Reseñas: se conservan mientras el perfil del especialista esté publicado, incluso si tú, como Especialista, solicitas la eliminación de tu perfil, salvo que la reseña en sí sea eliminada por incumplir nuestras normas de contenido.</li>
          <li>Solicitudes de cita: se conservan por un plazo razonable para fines de soporte y prevención de abuso, y después se eliminan o anonimizan.</li>
        </ul>
        <p>
          Si eliminas tu perfil como Especialista en Salud, borraremos tu información de todas las áreas del Sitio
          (perfil público, documentos, fotos, servicios, casos, publicaciones) conforme a nuestro proceso interno de
          baja de cuentas, salvo la información que debamos conservar por obligación legal.
        </p>
      </section>

      <section>
        <h2>12. Derechos ARCO y cómo ejercerlos</h2>
        <p>
          Tú o tu representante legal pueden ejercer en cualquier momento tus derechos de Acceso, Rectificación,
          Cancelación y Oposición (“Derechos ARCO”) sobre los datos personales que tratamos como responsables, así
          como revocar el consentimiento que nos hayas dado, enviando un correo a{" "}
          <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>{" "}
          indicando claramente tu solicitud.
        </p>
        <p>
          Para dar trámite a tu solicitud, podemos pedirte que acredites tu identidad con una identificación oficial
          vigente. Nos esforzaremos por responderte en un plazo razonable y, en cualquier caso, dentro de los plazos
          que establece la legislación aplicable en materia de protección de datos personales.
        </p>
        <p>
          <strong>Importante:</strong> si eres Paciente y quieres ejercer tus derechos ARCO sobre los datos que un
          Especialista en Salud conserva de forma independiente en sus propios registros (por ejemplo, tras haberlo
          contactado por WhatsApp), debes dirigir tu solicitud directamente a ese especialista, ya que en esa relación
          él es responsable independiente del tratamiento de tus datos y BuscoUnDoctor no tiene control sobre esos
          registros.
        </p>
      </section>

      <section>
        <h2>13. Autoridad de protección de datos</h2>
        <p>
          Si consideras que tu solicitud de Derechos ARCO no fue atendida correctamente, tienes derecho a acudir ante
          la Secretaría Anticorrupción y Buen Gobierno, autoridad competente en materia de protección de datos
          personales en posesión de particulares en México conforme a la Ley Federal de Protección de Datos Personales
          en Posesión de los Particulares vigente desde marzo de 2025.
        </p>
      </section>

      <section>
        <h2>14. Menores de edad</h2>
        <p>
          El Sitio no está dirigido a menores de edad. Si necesitas buscar o contactar a un especialista en nombre de
          un menor (por ejemplo, tu hijo o hija), debes hacerlo tú como adulto responsable, proporcionando información
          veraz y siendo tú quien interactúa con el Sitio y con el especialista.
        </p>
      </section>

      <section>
        <h2>15. Toma de decisiones automatizada</h2>
        <p>
          No tomamos decisiones que te afecten legalmente o de forma significativa basadas única y exclusivamente en el
          tratamiento automatizado de tus datos personales. El “score SEO” o de completitud de perfil de los
          Especialistas en Salud es solo una guía informativa y no una decisión que afecte su elegibilidad para usar
          el Sitio.
        </p>
      </section>

      <section>
        <h2>16. Enlaces a otros sitios y a WhatsApp</h2>
        <p>
          El Sitio puede contener enlaces a otros sitios web (por ejemplo, mapas, redes sociales de un especialista) o
          abrir WhatsApp para que contactes a un especialista. No somos responsables de las prácticas de privacidad de
          esos sitios o servicios de terceros; te recomendamos revisar sus propias políticas de privacidad.
        </p>
      </section>

      <section>
        <h2>17. Cambios a este Aviso de Privacidad</h2>
        <p>
          Podemos actualizar este Aviso de Privacidad de tiempo en tiempo, por ejemplo si incorporamos nuevas
          funcionalidades (como cobro en línea o herramientas de análisis de tráfico). Cuando hagamos cambios
          importantes, actualizaremos la fecha de “Última actualización” en la parte superior de este documento y, si
          la ley lo requiere, te lo notificaremos de forma adicional.
        </p>
      </section>

      <section>
        <h2>18. Política de Cookies</h2>
        <h3>18.1 Qué son las cookies y tecnologías similares</h3>
        <p>
          Las cookies son pequeños archivos de datos que un sitio web guarda en tu navegador. El “almacenamiento
          local” (localStorage) es una tecnología similar: guarda pequeños fragmentos de información directamente en
          tu navegador, en tu propio dispositivo.
        </p>
        <h3>18.2 Qué cookies y almacenamiento usamos actualmente</h3>
        <p>
          A la fecha de este Aviso de Privacidad, BuscoUnDoctor no utiliza cookies de publicidad ni de redes sociales
          de terceros, ni herramientas de analítica de terceros (como Google Analytics). Utilizamos únicamente:
        </p>
        <ul className="list-disc pl-5">
          <li>Cookies necesarias: gestionadas por nuestro proveedor de plataforma (Base44) para mantener tu sesión iniciada si eres un Especialista en Salud con cuenta, y para el funcionamiento básico y seguro del Sitio. No puedes desactivarlas sin afectar el funcionamiento del Sitio;</li>
          <li>Almacenamiento local (localStorage) para recordar, únicamente en tu propio navegador, tu lista de “doctores guardados” como favorito y el progreso de tu registro si estás en proceso de crear un perfil de especialista. Esta información no se sincroniza entre dispositivos ni se envía a nuestros servidores como “cookie” de rastreo — se queda en tu navegador.</li>
        </ul>
        <p>
          Si en el futuro incorporamos herramientas de analítica, publicidad o redes sociales que instalen cookies
          adicionales, actualizaremos esta sección y, cuando corresponda, incorporaremos un panel de consentimiento de
          cookies antes de instalarlas.
        </p>
        <h3>18.3 Cómo desactivar las cookies</h3>
        <p>
          Puedes configurar tu navegador para bloquear o eliminar cookies desde su panel de configuración de
          privacidad y seguridad. Ten en cuenta que bloquear las cookies necesarias puede impedir que inicies sesión o
          que el Sitio funcione correctamente.
        </p>
      </section>

      <section>
        <h2>19. Contacto</h2>
        <p>
          Si tienes cualquier duda sobre este Aviso de Privacidad o sobre el tratamiento de tus datos personales,
          escríbenos a <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
