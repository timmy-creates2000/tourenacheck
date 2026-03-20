-- Discord-Like Features Migration
-- Run this in Supabase SQL Editor

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS group_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Reply functionality
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES direct_messages(id) ON DELETE SET NULL;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES group_messages(id) ON DELETE SET NULL;

-- Message editing
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- File attachments
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_type text;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_message ON group_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_reply ON direct_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply ON group_messages(reply_to_id);

-- Storage bucket setup (run these separately in Supabase Dashboard > Storage)
-- 1. Create bucket named 'chat-attachments' with public access
-- 2. Add these policies:

-- Policy: Users can upload chat attachments
-- CREATE POLICY "Users can upload chat attachments"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Chat attachments are publicly readable
-- CREATE POLICY "Chat attachments are publicly readable"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'chat-attachments');

-- Policy: Users can delete their own attachments
-- CREATE POLICY "Users can delete their own attachments"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
