const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const base = path.basename(originalName, ext);

    const safeBase = base
        .normalize('NFKD')                          // decompose accented chars
        .replace(/[^\w\s-]/g, '')                   // drop everything except word chars, spaces, dashes
        .trim()
        .replace(/[\s_-]+/g, '_')                   // collapse whitespace/dashes/underscores to single _
        .slice(0, 60);

    return (safeBase || 'file') + ext;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeName = sanitizeFilename(file.originalname);
        cb(null, uniqueSuffix + '-' + safeName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only images and videos are allowed.'));
};

// Limit file size to 30MB
const MAX_FILE_SIZE = 30 * 1024 * 1024; 

exports.upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
});

exports.guestUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
});