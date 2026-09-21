// Los 9 puntos que forman el porcentaje "perfil completo" del panel del
// médico. Las claves salen de la función recalculate_specialist_score
// (completeness_checklist). Van en orden de importancia para el paciente; los
// tres últimos ya se llenan en el registro, así que casi siempre aparecen como
// listos. Los usan la pantalla "Llena tu perfil" y "Tus próximos pasos" del
// inicio.
export const PROFILE_CHECKLIST_ITEMS = [
  { key: "photo", label: "Tu foto de perfil", hint: "Los pacientes confían mucho más en un perfil con foto.", target: "perfil", cta: "Subir mi foto" },
  { key: "cedula_document", label: "Tu cédula profesional", hint: "Sube una foto de tu cédula. Con eso verificamos tu perfil y aparece el sello \"Verificado\".", target: "documentos", cta: "Subir mi cédula" },
  { key: "biography", label: "Tu presentación", hint: "Cuéntale a tus pacientes quién eres y cómo trabajas. Con unas 50 palabras es suficiente.", target: "perfil", cta: "Escribir mi presentación" },
  { key: "office", label: "Tu consultorio", hint: "La dirección donde atiendes, para que los pacientes te encuentren en el mapa.", target: "consultorios", cta: "Agregar mi consultorio" },
  { key: "education", label: "Tu formación", hint: "Dónde estudiaste y tus especialidades. Muestra que eres un profesional certificado.", target: "formacion", cta: "Agregar mi formación" },
  { key: "languages", label: "Los idiomas que hablas", hint: "Muchos pacientes buscan un médico que hable su idioma.", target: "idiomas", cta: "Agregar idiomas" },
  { key: "specialty", label: "Tu especialidad", hint: "La especialidad con la que apareces en el directorio.", target: "perfil", cta: "Revisar mi especialidad" },
  { key: "license_number", label: "Tu número de cédula", hint: "El número de tu cédula profesional.", target: "perfil", cta: "Revisar mi cédula" },
  { key: "name", label: "Tu nombre completo", hint: "Como quieres que te vean los pacientes.", target: "perfil", cta: "Revisar mi nombre" },
];
