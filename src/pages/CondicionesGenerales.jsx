import { useEffect } from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function CondicionesGenerales() {
  useEffect(() => {
    const title = "Condiciones Generales de Contratación | BuscoUnDoctor";
    const description = "Términos y condiciones de uso de BuscoUnDoctor: qué es el directorio, cómo funcionan las solicitudes de cita, y los límites de responsabilidad del sitio.";
    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index,follow");
    setOpenGraph({ title, description, image: SITE_OG.image });
  }, []);

  return (
    <LegalPageLayout
      title="Condiciones Generales de Contratación"
      updatedAt="3 de agosto de 2026"
      breadcrumbLabel="Términos y condiciones"
    >
      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          Este sitio (buscoundoctor.com, el “Sitio”) es operado por <strong>[NOMBRE COMPLETO DEL TITULAR]</strong>, persona
          física, con domicilio en Monterrey, Nuevo León, México (“BuscoUnDoctor”, “nosotros”).
        </p>
        <p>Puedes contactarnos en <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>.</p>
      </section>

      <section>
        <h2>2. Aceptación y capacidad para usar el Sitio</h2>
        <p>
          Al usar el Sitio, escribir una reseña, enviar una solicitud de cita o crear una cuenta como Especialista en
          Salud, aceptas quedar obligado por estas Condiciones Generales de Contratación (las “Condiciones”). Si no
          estás de acuerdo con ellas, por favor no uses el Sitio.
        </p>
        <p>
          Debes tener al menos 18 años, o contar con la supervisión de un adulto responsable, para usar el Sitio. Si un
          menor de edad necesita ayuda para encontrar o contactar a un especialista, un adulto debe hacerlo en su
          nombre.
        </p>
        <p>
          Si eres Especialista en Salud, debes contar con las licencias y cédulas profesionales vigentes que la ley
          exija para ejercer tu profesión en todo momento en que tu perfil esté publicado.
        </p>
      </section>

      <section>
        <h2>3. Qué es BuscoUnDoctor (y qué no es)</h2>
        <p>
          BuscoUnDoctor es un directorio en línea que ayuda a los pacientes a encontrar especialistas de la salud en
          Monterrey y San Pedro Garza García por especialidad, padecimiento y zona, y a contactarlos directamente por
          WhatsApp.
        </p>
        <p>
          <strong>BuscoUnDoctor no es un centro médico, no presta servicios de salud, no emplea a los especialistas
          listados en el Sitio, y no participa en la relación médico-paciente.</strong> Somos únicamente un
          intermediario tecnológico: facilitamos que encuentres información sobre especialistas y que los contactes;
          la cita, el diagnóstico, el tratamiento y cualquier otra atención médica ocurren directamente entre tú y el
          Especialista en Salud, fuera de nuestra plataforma.
        </p>
        <p>
          Nuestros Servicios no están pensados para emergencias médicas. Si tienes una emergencia, llama al 911 o
          acude directamente al servicio de urgencias más cercano.
        </p>
      </section>

      <section>
        <h2>4. Nuestros Servicios</h2>
        <ul className="list-disc pl-5">
          <li>Directorio de especialistas: te damos acceso a un directorio con perfiles de especialistas de la salud, con información como especialidad, zona, cédula profesional y precio de consulta;</li>
          <li>Solicitud de cita por WhatsApp: puedes llenar un formulario con tus datos y el motivo de tu consulta, y te ayudamos a generar y enviar un mensaje de WhatsApp al especialista elegido. Esto es una solicitud, no una cita confirmada — es el especialista quien decide si la acepta, la reprograma o no puede atenderla;</li>
          <li>Reseñas: puedes leer y escribir reseñas sobre tu experiencia con un especialista. Todas las reseñas pasan por una revisión antes de publicarse.</li>
        </ul>
      </section>

      <section>
        <h2>5. Uso aceptable del Sitio</h2>
        <p>Al usar el Sitio, te comprometes a no:</p>
        <ul className="list-disc pl-5">
          <li>Proporcionar información falsa, engañosa o que no te pertenezca al crear un perfil, escribir una reseña o enviar una solicitud de cita;</li>
          <li>Publicar u ofrecer contenido ilegal, difamatorio, discriminatorio, sexual, amenazante o que viole los derechos de terceros;</li>
          <li>Escribir o fomentar reseñas falsas, fraudulentas o que no correspondan a una experiencia real con el especialista;</li>
          <li>Suplantar la identidad de otra persona, incluyendo a otro especialista o paciente;</li>
          <li>Intentar dañar, sobrecargar o comprometer la seguridad del Sitio (por ejemplo, con virus, scraping masivo, o ataques de denegación de servicio);</li>
          <li>Copiar, descompilar o intentar extraer el código fuente del Sitio; y</li>
          <li>Usar el Sitio para fines distintos a buscar, evaluar o contactar especialistas de la salud, o publicar tu perfil profesional.</li>
        </ul>
        <p>
          Si incumples estas Condiciones, podemos advertirte, eliminar el contenido en cuestión, suspender o cancelar
          tu cuenta o perfil, o negarte el acceso al Sitio, dependiendo de la gravedad del caso.
        </p>
      </section>

      <section>
        <h2>6. Reseñas</h2>
        <p>
          Las reseñas auténticas ayudan a otros pacientes a elegir un especialista con confianza. Por eso, antes de
          publicar cualquier reseña, la revisamos manualmente para verificar que cumpla con estas Condiciones.
        </p>
        <p>
          Podemos negarnos a publicar, o eliminar posteriormente, cualquier reseña que sea falsa, ofensiva, que no
          describa una experiencia real con el especialista, o que de cualquier otra forma incumpla estas Condiciones.
          Si un Especialista en Salud considera que una reseña sobre su perfil es falsa o injusta, puede escribirnos a{" "}
          <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>{" "}
          para que la revisemos.
        </p>
      </section>

      <section>
        <h2>7. Solicitudes de cita</h2>
        <p>
          Cuando envías una solicitud de cita, guardamos la información que nos proporcionas y la usamos para generar
          un mensaje de WhatsApp dirigido al especialista. A partir de ese momento, la conversación y cualquier
          acuerdo sobre honorarios, disponibilidad, confirmación, cancelación o reprogramación ocurre directamente
          entre tú y el especialista, fuera del Sitio.
        </p>
        <p>
          No garantizamos que el especialista confirme, responda o esté disponible en la fecha u horario que
          solicitaste; los horarios mostrados en el formulario son solo sugerencias y deben confirmarse directamente
          con el especialista.
        </p>
      </section>

      <section>
        <h2>8. Cuentas de Especialistas en Salud</h2>
        <ul className="list-disc pl-5">
          <li>Para crear un perfil público que los pacientes puedan encontrar y contactar, debes crear una cuenta y proporcionarnos información veraz, completa y actualizada, incluyendo tu número de cédula profesional;</li>
          <li>Verificamos manualmente la cédula profesional antes de publicar tu perfil. Nos reservamos el derecho de no publicar, suspender o cancelar un perfil si tenemos motivos razonables para sospechar que la información proporcionada es falsa, inexacta o que la cédula no está vigente;</li>
          <li>Eres responsable de mantener actualizada la información de tu perfil y de la confidencialidad de tu contraseña;</li>
          <li>Puedes solicitar la eliminación de tu perfil en cualquier momento escribiéndonos o desde tu panel de médico. Al eliminar tu perfil, se elimina también la información asociada en todas las secciones del Sitio (documentos, fotos, servicios, casos, publicaciones), salvo la información que debamos conservar por obligación legal. Podrás crear un nuevo perfil en el futuro con la misma información si así lo decides;</li>
          <li>No garantizamos una posición específica en los resultados de búsqueda del Sitio ni en buscadores externos como Google.</li>
        </ul>
      </section>

      <section>
        <h2>9. Planes y pagos</h2>
        <p>
          Ofrecemos distintos planes para Especialistas en Salud, con distintas funcionalidades. Al día de hoy, el
          cobro de los planes de pago se gestiona de forma manual (por ejemplo, por transferencia bancaria), fuera de
          la plataforma; el Sitio no procesa pagos con tarjeta directamente.
        </p>
        <p>
          Si en el futuro habilitamos el cobro en línea con tarjeta u otro medio, actualizaremos esta sección para
          explicar el procesador de pagos, la política de reembolsos y cualquier condición adicional aplicable, y te
          lo notificaremos con anticipación.
        </p>
        <p>
          Si decides cancelar tu suscripción a un plan de pago, tu perfil puede pasar a un plan gratuito o ser
          suspendido según el caso, y no habrá reembolso de periodos ya cubiertos salvo que la ley disponga lo
          contrario o acordemos algo distinto por escrito.
        </p>
      </section>

      <section>
        <h2>10. Propiedad intelectual</h2>
        <p>
          El Sitio, su diseño, funcionalidades, marca “BuscoUnDoctor” y contenidos (salvo el contenido que tú u otros
          usuarios publiquen) son propiedad de BuscoUnDoctor o de sus licenciantes y están protegidos por las leyes de
          propiedad intelectual aplicables. No puedes copiar, reproducir o distribuir el Sitio o su código sin nuestra
          autorización previa por escrito.
        </p>
        <p>
          Al publicar contenido en el Sitio (por ejemplo, tu foto de perfil, tu biografía, o una reseña), nos otorgas
          una licencia no exclusiva para usar, mostrar y reproducir ese contenido dentro del Sitio, únicamente con el
          fin de prestar los Servicios.
        </p>
      </section>

      <section>
        <h2>11. Límites y exclusiones de responsabilidad</h2>
        <h3>11.1 Sobre los Especialistas en Salud</h3>
        <p>
          <strong>BuscoUnDoctor actúa únicamente como intermediario tecnológico entre pacientes y especialistas.</strong>{" "}
          No prestamos servicios de salud, no somos parte de la relación entre tú y el especialista, y no garantizamos
          las calificaciones, disponibilidad, calidad del trabajo, diagnósticos, tratamientos, precios ni ningún otro
          aspecto de los servicios que preste un Especialista en Salud.
        </p>
        <p>
          Cualquier queja, reclamación o disputa relacionada con la atención médica recibida, incluyendo casos de
          negligencia, mala praxis, diagnósticos erróneos o cualquier daño derivado de la relación médico-paciente,
          debe dirigirse directamente al Especialista en Salud correspondiente y no a BuscoUnDoctor.
        </p>
        <p>
          Aunque verificamos manualmente la cédula profesional antes de publicar un perfil, esto no constituye una
          garantía continua ni una supervisión de la práctica profesional del especialista a lo largo del tiempo.
        </p>
        <h3>11.2 El Sitio se ofrece “tal cual”</h3>
        <p>
          El Sitio y los Servicios se ofrecen “tal cual” y “según disponibilidad”. No garantizamos que el Sitio esté
          libre de errores, interrupciones o que funcione sin fallas en todo momento. No somos responsables de
          pérdidas o daños causados por virus, fallas técnicas o interrupciones del Sitio que estén fuera de nuestro
          control razonable.
        </p>
        <h3>11.3 Límite máximo de responsabilidad</h3>
        <p>
          En la máxima medida permitida por la ley aplicable: (i) solo seremos responsables por daños directos y
          comprobados que resulten de un incumplimiento de nuestra parte a estas Condiciones; (ii) no seremos
          responsables por lucro cesante, pérdida de ingresos ni daños indirectos, incidentales o consecuenciales
          derivados del uso del Sitio; y (iii) si llegáramos a ser responsables frente a ti por cualquier motivo
          relacionado con estas Condiciones, el monto máximo agregado que estaríamos obligados a pagarte será el
          equivalente a lo que hayas pagado a BuscoUnDoctor (no al Especialista en Salud) por el Servicio en cuestión
          durante los tres meses anteriores al reclamo, o [$1,000.00 MXN] si no nos has pagado nada.
        </p>
        <p>Nada en esta sección pretende excluir o limitar responsabilidad en los casos en que la ley mexicana no permita hacerlo.</p>
      </section>

      <section>
        <h2>12. Indemnización</h2>
        <p>
          Aceptas indemnizar y sacar en paz y a salvo a BuscoUnDoctor frente a cualquier reclamación, daño, pérdida o
          gasto (incluyendo honorarios legales razonables) que resulte de: (i) tu incumplimiento de estas Condiciones;
          (ii) información falsa, inexacta o engañosa que hayas proporcionado; o (iii) tu uso indebido del Sitio o de
          los Servicios.
        </p>
      </section>

      <section>
        <h2>13. Cómo contactarnos y presentar una queja</h2>
        <p>
          Puedes escribirnos a <a href="mailto:contacto@buscoundoctor.com" className="text-brand-blue hover:underline">contacto@buscoundoctor.com</a>{" "}
          para cualquier duda, reporte de contenido ilegal o inapropiado, o inconformidad con una decisión que hayamos
          tomado sobre tu cuenta, perfil o una reseña. Revisaremos tu solicitud y te responderemos en un plazo
          razonable.
        </p>
      </section>

      <section>
        <h2>14. Modificaciones a estas Condiciones</h2>
        <p>
          Podemos actualizar estas Condiciones de tiempo en tiempo, por ejemplo para reflejar nuevas funcionalidades
          del Sitio (como cobro en línea). Publicaremos la versión actualizada en esta misma página con una nueva
          fecha de “Última actualización”. Si sigues usando el Sitio después de un cambio, se entenderá que lo
          aceptas; si no estás de acuerdo, debes dejar de usar el Sitio.
        </p>
      </section>

      <section>
        <h2>15. Suspensión o cierre del Sitio</h2>
        <p>
          No garantizamos que el Sitio esté disponible de forma ininterrumpida. Podemos suspender, restringir o dar de
          baja todo o parte del Sitio por razones de mantenimiento, seguridad o de negocio, procurando avisarte con
          anticipación razonable cuando sea posible.
        </p>
      </section>

      <section>
        <h2>16. Eventos fuera de nuestro control</h2>
        <p>
          No seremos responsables por incumplimientos o retrasos causados por circunstancias fuera de nuestro control
          razonable (por ejemplo, fallas de proveedores de internet o de nuestra plataforma tecnológica, desastres
          naturales, o disposiciones gubernamentales).
        </p>
      </section>

      <section>
        <h2>17. Ley aplicable, jurisdicción y resolución de disputas</h2>
        <p>
          Estas Condiciones se rigen e interpretan conforme a las leyes de los Estados Unidos Mexicanos. Para
          cualquier controversia que surja de o en relación con estas Condiciones, las partes se someten a la
          jurisdicción de los tribunales competentes de Monterrey, Nuevo León, renunciando a cualquier otro fuero que
          pudiera corresponderles por razón de su domicilio presente o futuro.
        </p>
        <p>Si eres consumidor, también puedes presentar tu queja ante la Procuraduría Federal del Consumidor (PROFECO).</p>
      </section>
    </LegalPageLayout>
  );
}
