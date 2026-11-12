const multer = require('multer');
const path = require('path');

// In-memory storage files are passed as `file.buffer` to the controller, which uploads them to Cloudinary.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Accept any file whose mimetype starts with image/ or video/,
    // OR whose extension is a known media format. This handles HEIC,
    // HEIF, WebP, QuickTime (video/quicktime for .mov), and future
    // formats without needing updates.
    const mimeOk = /^(image|video)\//i.test(file.mimetype || "");
    const extOk = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|svg|mp4|mov|avi|webm|mkv|3gp|m4v)$/i.test(
        path.extname(file.originalname || "")
    );

    if (mimeOk || extOk) {
        console.log(
            `[upload filter] ACCEPTED — name: "${file.originalname}", mime: "${file.mimetype}"`
        );
        return cb(null, true);
    }

    console.warn(
        `[upload filter] REJECTED — name: "${file.originalname}", mime: "${file.mimetype}"`
    );
    cb(new Error('Only images and videos are allowed.'));
};

// ─── File size limits ───
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;   // 100 MB
const MAX_IMAGE_SIZE = 30 * 1024 * 1024;    // 30 MB

const MAX_FILE_SIZE = MAX_VIDEO_SIZE;

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

exports.MAX_VIDEO_SIZE = MAX_VIDEO_SIZE;
exports.MAX_IMAGE_SIZE = MAX_IMAGE_SIZE;