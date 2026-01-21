import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'approvals';

/**
 * Upload de arquivo para o Supabase Storage
 * @param file Arquivo a ser enviado
 * @param folder Pasta onde o arquivo será armazenado (ex: 'approval-id')
 * @returns URL pública do arquivo ou null em caso de erro
 */
export async function uploadFile(file: File, folder: string): Promise<string | null> {
  try {
    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload do arquivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Erro no upload:', error);
      return null;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return null;
  }
}

/**
 * Upload de múltiplos arquivos
 * @param files Array de arquivos
 * @param folder Pasta onde os arquivos serão armazenados
 * @returns Array de URLs públicas dos arquivos
 */
export async function uploadMultipleFiles(files: File[], folder: string): Promise<string[]> {
  const uploadPromises = files.map(file => uploadFile(file, folder));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

/**
 * Deletar arquivo do Supabase Storage
 * @param fileUrl URL pública do arquivo
 * @returns true se deletado com sucesso
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Extrair o path do arquivo da URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/storage/v1/object/public/');
    if (pathParts.length < 2) return false;
    
    const fullPath = pathParts[1];
    const [bucket, ...pathSegments] = fullPath.split('/');
    const filePath = pathSegments.join('/');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar arquivo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return false;
  }
}

/**
 * Verifica se uma URL é uma URL do Supabase Storage
 */
export function isStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Verifica se uma string é base64
 */
export function isBase64(str: string): boolean {
  return str.startsWith('data:');
}
