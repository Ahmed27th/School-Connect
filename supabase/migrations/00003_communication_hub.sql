-- ============================================================================
-- COMMUNICATION HUB - Enhance messaging with file attachments
-- ============================================================================

-- 1. Add attachment support to messages table
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS attachment_url  text,
    ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'document', 'video', 'audio'));

-- 2. Add an index on the new columns for efficient filtering
CREATE INDEX IF NOT EXISTS messages_attachment_type_idx ON messages (attachment_type) WHERE attachment_type IS NOT NULL;

-- 3. Create storage bucket for chat attachments (run via Supabase Dashboard or CLI)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('chat-attachments', 'chat-attachments', false, 10485760)
-- ON CONFLICT (id) DO NOTHING;

-- Note: Storage bucket and policies should be created via the Supabase Dashboard:
--   Bucket name: chat-attachments
--   Public: No
--   Max file size: 10MB (10485760 bytes)
--   Allowed MIME types: image/*, application/pdf, video/*, audio/*

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
