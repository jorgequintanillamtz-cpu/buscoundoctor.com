import { supabase } from '@/lib/supabaseClient';

// Sube un archivo a Supabase Storage y devuelve `{ file_url }`, con la misma
// forma que devolvía `base44.integrations.Core.UploadFile({ file })`.
//
// A diferencia de Base44 (un solo blob-storage genérico sin conceptos de
// bucket/carpeta), Supabase necesita saber a qué bucket va cada archivo. Por
// eso cada sitio de subida debe indicar el bucket correcto:
//   - "specialist-photos"   fotos de perfil, galería, casos, posts, highlights
//   - "specialist-videos"   video de presentación
//   - "specialist-documents" cédula/identificación (bucket privado)
//   - "blog-images"         imágenes de artículos del blog
//   - "site-assets"         íconos de catálogo, imágenes del home/sitio
//
// `folder` es el primer segmento de la ruta que las policies de RLS de cada
// bucket usan para decidir permisos (ver Fase 3 del plan de migración):
// specialist-documents espera `{specialist_id}/...`, specialist-photos y
// specialist-videos esperan `{owner_user_id}/...`. Si se omite, se sube a la
// raíz del bucket (correcto para blog-images/site-assets, que solo dependen
// de `is_admin()` y no de una carpeta).
export async function uploadFile(file, bucket = 'specialist-photos', folder = '') {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${folder ? `${folder}/` : ''}${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  if (bucket === 'specialist-documents') {
    // Bucket privado: no hay URL pública -- se entrega una firmada de larga
    // duración (1 año), suficiente para el ciclo de vida de una revisión de
    // documento. Quien necesite verla después de eso puede pedir una nueva
    // con getSignedUrl().
    const { data, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr) throw signErr;
    return { file_url: data.signedUrl };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

export async function getSignedUrl(bucket, path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
