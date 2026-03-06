-- Configuração de Buckets de Storage Seguros
-- Este script cria os buckets necessários e define as políticas de segurança (RLS)

-- 1. Criar buckets (se não existirem)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('vehicle_images', 'vehicle_images', true, 5242880, '{image/png,image/jpeg,image/webp,image/jpg}'),
  ('profile_images', 'profile_images', true, 2097152, '{image/png,image/jpeg,image/webp,image/jpg}'),
  ('chat_media', 'chat_media', true, 5242880, '{image/png,image/jpeg,image/webp,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas para 'vehicle_images'
-- Permitir que qualquer pessoa (mesmo não logada) visualize as fotos dos veículos
CREATE POLICY "Visualização Pública de Veículos"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle_images');

-- Permitir que usuários autenticados façam upload de fotos
CREATE POLICY "Usuários autenticados podem postar fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle_images');

-- Permitir que o dono da foto a exclua
CREATE POLICY "Proprietários podem excluir suas fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle_images' AND auth.uid() = owner);

-- 3. Políticas para 'profile_images'
-- Visualização pública para perfis/lojas
CREATE POLICY "Visualização Pública de Perfis"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_images');

-- Upload e atualização restritos ao próprio usuário
CREATE POLICY "Usuários gerenciam sua própria foto de perfil"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'profile_images' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'profile_images' AND auth.uid() = owner);

-- 4. Políticas para 'chat_media'
-- Permitir que usuários autenticados vejam mídias de chat
CREATE POLICY "Visualização de Mídia de Chat"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_media');

-- Permitir que usuários autenticados enviem arquivos no chat
CREATE POLICY "Envio de Mídia de Chat"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_media');
