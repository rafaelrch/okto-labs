import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'approvals';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/mpeg',
  'video/x-msvideo',
  'video/x-m4v',
  'application/pdf',
];

/**
 * Upload de arquivo para o Supabase Storage
 * @param file Arquivo a ser enviado
 * @param folder Pasta onde o arquivo será armazenado (ex: 'approval-id')
 * @returns URL pública do arquivo ou null em caso de erro
 */
export async function uploadFile(file: File, folder: string): Promise<string | null> {
  try {
    // Log detalhado do arquivo
    console.log('[Storage] Iniciando upload:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    // Verificar tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      console.error(`[Storage] Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)} MB (máximo: 100MB)`);
      throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo permitido: 100MB`);
    }

    // Verificar tipo do arquivo (aceitar qualquer imagem/vídeo se MIME não estiver na lista)
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isVideo && !isPdf) {
      console.error(`[Storage] Tipo de arquivo não permitido: ${file.type}`);
      throw new Error(`Tipo de arquivo não permitido: ${file.type}. Use imagens, vídeos ou PDFs.`);
    }

    // Gerar nome único para o arquivo (sanitizar nome)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const sanitizedName = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
    const fileName = `${folder}/${sanitizedName}.${fileExt}`;

    console.log('[Storage] Fazendo upload para:', fileName);

    // Upload do arquivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Permitir sobrescrever se existir
        contentType: file.type, // Especificar o content-type
      });

    if (error) {
      console.error('[Storage] Erro no upload:', {
        message: error.message,
        name: error.name,
        error: error,
      });
      throw new Error(`Erro no upload: ${error.message}`);
    }

    console.log('[Storage] Upload bem sucedido:', data.path);

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('[Storage] URL pública:', urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error('[Storage] Erro ao fazer upload:', error);
    // Re-throw para que o chamador possa tratar
    throw error;
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
