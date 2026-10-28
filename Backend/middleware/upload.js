const multer = require('multer');
const path = require('path');

// In-memory storage files are passed as `file.buffer` to the controller, which uploads them to Cloudinary.
const storage = multer.memoryStorage();

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