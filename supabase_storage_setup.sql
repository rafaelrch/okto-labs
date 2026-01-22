-- =====================================================
-- CONFIGURAÇÃO DO SUPABASE STORAGE
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- para configurar o bucket e as permissões de storage
-- =====================================================

-- 1. Criar o bucket 'approvals' (se não existir)
-- IMPORTANTE: Permitir TODOS os tipos de arquivo (null = sem restrição)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'approvals',
  'approvals',
  true,  -- público para leitura
  104857600,  -- 100MB limite
  NULL  -- Aceitar TODOS os tipos de arquivo
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = NULL;

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- 3. Criar política para LEITURA pública (qualquer pessoa pode ver os arquivos)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'approvals');

-- 4. Criar política para UPLOAD (usuários autenticados)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'approvals');

-- 5. Criar política para ATUALIZAÇÃO (usuários autenticados)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'approvals');

-- 6. Criar política para EXCLUSÃO (usuários autenticados)
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'approvals');

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Verificar se o bucket foi criado
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'approvals';

-- Verificar políticas criadas
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
