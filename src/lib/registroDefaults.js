// Forma vacía de los datos que se van llenando en el wizard de registro de
// médicos (pasos "datos", "ubicacion", "fotos"). Vive aparte para que tanto
// RegistroMedico.jsx (registro real) como AdminVistaRegistro.jsx (vista de
// previsualización del admin) arranquen del mismo estado inicial — si se
// agrega un campo nuevo al wizard, se agrega aquí una sola vez.
export const EMPTY_REGISTRO_DATA = {
  title: "",
  full_name: "",
  whatsapp: "",
  specialty: "",
  subspecialty: "",
  subspecialties_relation: [],
  cedula: "",
  years_experience: "",
  service_price: "",
  modality: "presencial",
  zone: "",
  address_street: "",
  address_neighborhood: "",
  address_ext_number: "",
  address_int_number: "",
  address_floor: "",
  address_postal_code: "",
  profile_photo: "",
  gallery: [],
};
