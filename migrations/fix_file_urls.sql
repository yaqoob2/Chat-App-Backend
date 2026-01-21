-- Migration: Move file URLs from content to file_url for existing messages
-- This fixes old messages that were created before the file_url field was properly used

UPDATE messages 
SET file_url = content,
    content = NULL
WHERE type IN ('image', 'video', 'file', 'audio')
  AND file_url IS NULL
  AND content IS NOT NULL
  AND content LIKE '/uploads/%';

-- Verify the update
SELECT 
    type,
    COUNT(*) as count,
    SUM(CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END) as with_file_url,
    SUM(CASE WHEN content IS NOT NULL THEN 1 ELSE 0 END) as with_content
FROM messages
WHERE type IN ('image', 'video', 'file', 'audio')
GROUP BY type;
