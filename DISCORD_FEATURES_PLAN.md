# Discord-Like Features Implementation Plan

## Current State
- ✅ Direct messaging (DMs)
- ✅ Group chat
- ✅ Community posts with comments
- ✅ Online status indicators
- ✅ Real-time message updates
- ✅ Member roles (owner, admin, moderator, member)
- ✅ Join requests for private groups/communities
- ✅ Message reporting

## Features to Add

### 1. Message Reactions (Emoji Reactions) 🎯 HIGH PRIORITY
**What:** Click to add emoji reactions to messages (like Discord)
**Where:** Messages, GroupDetail, CommunityDetail
**Database:**
```sql
CREATE TABLE message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE group_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
```

**UI:**
- Small emoji picker below each message
- Show reaction counts
- Highlight if you reacted
- Click to add/remove reaction

---

### 2. Reply to Messages (Threading) 🎯 HIGH PRIORITY
**What:** Reply to specific messages, showing quoted message
**Where:** All chat systems
**Database:**
```sql
ALTER TABLE direct_messages ADD COLUMN reply_to_id uuid REFERENCES direct_messages(id);
ALTER TABLE group_messages ADD COLUMN reply_to_id uuid REFERENCES group_messages(id);
```

**UI:**
- "Reply" button on message hover
- Shows quoted message above your reply
- Click quoted message to scroll to original

---

### 3. Message Editing 🎯 MEDIUM PRIORITY
**What:** Edit your own messages within 15 minutes
**Where:** All chat systems
**Database:**
```sql
ALTER TABLE direct_messages ADD COLUMN edited_at timestamptz;
ALTER TABLE group_messages ADD COLUMN edited_at timestamptz;
```

**UI:**
- "Edit" button on own messages
- Shows "(edited)" indicator
- Edit modal or inline editing

---

### 4. Typing Indicators 🎯 MEDIUM PRIORITY
**What:** Show "User is typing..." indicator
**Where:** Messages, GroupDetail
**Implementation:**
- Use Supabase Presence API
- Show typing indicator when user is typing
- Hide after 3 seconds of inactivity

**UI:**
- Small text below chat: "John is typing..."
- Animated dots

---

### 5. Rich Text Formatting 🎯 LOW PRIORITY
**What:** Bold, italic, code blocks, mentions
**Format:**
- `**bold**` → **bold**
- `*italic*` → *italic*
- `` `code` `` → `code`
- `@username` → mention with highlight

**Implementation:**
- Parse message content on display
- Highlight mentions
- Simple markdown-like syntax

---

### 6. File/Image Sharing 🎯 HIGH PRIORITY
**What:** Upload and share images/files in chat
**Where:** All chat systems
**Database:**
```sql
ALTER TABLE direct_messages ADD COLUMN attachment_url text;
ALTER TABLE direct_messages ADD COLUMN attachment_type text;
ALTER TABLE group_messages ADD COLUMN attachment_url text;
ALTER TABLE group_messages ADD COLUMN attachment_type text;
```

**Storage:**
- Use Supabase Storage bucket: `chat-attachments`
- Support: images (jpg, png, gif), files (pdf, doc, etc.)
- Max size: 10MB

**UI:**
- Paperclip icon to attach
- Image preview in chat
- Download button for files

---

### 7. Voice Channels (UI Only) 🎯 LOW PRIORITY
**What:** UI for voice channels (actual voice via external service)
**Implementation:**
- Add "Voice Channels" section in groups
- Link to external voice service (Discord, Zoom, etc.)
- Or integrate with WebRTC library

**Note:** Full voice implementation is complex. Start with UI that links to external services.

---

### 8. Pinned Messages 🎯 MEDIUM PRIORITY
**What:** Pin important messages to top of chat
**Where:** GroupDetail, CommunityDetail
**Database:**
```sql
ALTER TABLE group_messages ADD COLUMN is_pinned boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN is_pinned boolean DEFAULT false; -- already exists
```

**UI:**
- "Pin" button for owner/admin
- Pinned messages section at top
- Max 5 pinned messages per group

---

### 9. Message Search 🎯 LOW PRIORITY
**What:** Search messages in chat
**Implementation:**
- Search input in chat header
- Filter messages by content
- Highlight search results

---

### 10. User Mentions 🎯 MEDIUM PRIORITY
**What:** @mention users in messages
**Implementation:**
- Type `@` to show member list
- Select user to mention
- Mentioned user gets notification

**Database:**
```sql
CREATE TABLE message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid,
  mentioned_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
```

---

### 11. Message History/Pagination 🎯 MEDIUM PRIORITY
**What:** Load older messages on scroll
**Implementation:**
- Currently loads last 100 messages
- Add "Load more" button or infinite scroll
- Fetch messages in batches of 50

---

### 12. Read Receipts (Group) 🎯 LOW PRIORITY
**What:** Show who read messages in groups
**Database:**
```sql
CREATE TABLE group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);
```

---

## Implementation Priority

### Phase 1 (Essential) - Do First
1. ✅ Message reactions
2. ✅ Reply to messages
3. ✅ File/image sharing
4. ✅ Message editing

### Phase 2 (Enhanced UX)
5. Typing indicators
6. User mentions
7. Pinned messages UI improvements
8. Message history pagination

### Phase 3 (Nice to Have)
9. Rich text formatting
10. Message search
11. Voice channels UI
12. Read receipts for groups

---

## Quick Wins (Can Do Now)

### 1. Add Emoji Reactions
- Simple emoji picker (😀 👍 ❤️ 🎉 🔥)
- Store in `message_reactions` table
- Show count next to message
- ~2 hours work

### 2. Reply Functionality
- Add `reply_to_id` column
- Show quoted message
- ~1 hour work

### 3. Edit Messages
- Add edit button for own messages
- Show "(edited)" indicator
- ~1 hour work

### 4. Image Upload
- Add file input
- Upload to Supabase Storage
- Show image preview
- ~2 hours work

---

## Database Migration Script

```sql
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
```

---

## Storage Bucket Setup

```sql
-- Create chat-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- Policies
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Chat attachments are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Next Steps

1. Run database migration script
2. Set up storage bucket
3. Implement Phase 1 features
4. Test thoroughly
5. Deploy

Would you like me to implement any of these features now?
