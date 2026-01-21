-- Add 'audio' to message type enum
ALTER TABLE messages 
MODIFY COLUMN type ENUM('text', 'image', 'video', 'file', 'audio') DEFAULT 'text';
