-- Check what's in your messages table
SELECT id, conversation_id, type, 
       LEFT(content, 50) as content_preview,
       file_url,
       created_at
FROM messages 
WHERE type IN ('image', 'video', 'file', 'audio')
ORDER BY id DESC 
LIMIT 20;
