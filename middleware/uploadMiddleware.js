const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const mime = require('mime-types');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        console.log('Processing file upload:', file.originalname, file.mimetype);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = mime.extension(file.mimetype) || 'bin';
        console.log('Determined extension:', extension);
        cb(null, 'file-' + uniqueSuffix + '.' + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        // Accept images, videos, and audio
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/') ||
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(null, true); // Allow all for now to avoid blocking valid files with weird mimetypes
        }
    }
});

module.exports = upload;
