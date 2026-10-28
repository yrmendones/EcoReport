const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function transcodeToMp4(inputPath) {
    return new Promise((resolve, reject) => {
        const parsed = path.parse(inputPath);
        const outputPath = path.join(parsed.dir, `${parsed.name}-h264.mp4`);

        // libx264 + aac = plays everywhere; +faststart = streams before full download
        const cmd = `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`;

        exec(cmd, { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error(`ffmpeg failed: ${err.message}`));
            }
            if (!fs.existsSync(outputPath)) {
                return reject(new Error('ffmpeg produced no output file.'));
            }
            resolve(outputPath);
        });
    });
}

async function processUploadedFile(file) {
    const isVideo = file.mimetype.startsWith('video/');

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: isVideo ? 'video' : 'image',
                folder: 'ecoreport_uploads',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    filename: result.public_id,
                    url: result.secure_url,
                    size: result.bytes,
                    mimetype: file.mimetype,
                });
            }
        );

        // Multer memoryStorage gives us a buffer
        const bufferStream = Readable.from(file.buffer);
        bufferStream.pipe(uploadStream);
    });
}

// ============================================================
// AUTHENTICATED UPLOAD (residents)
// ============================================================
exports.uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        const fileUrls = [];
        for (const file of req.files) {
            const processed = await processUploadedFile(file);
            fileUrls.push(processed);
        }

        res.status(201).json({ message: 'Files uploaded successfully!', files: fileUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload files.' });
    }
};

// ============================================================
// GUEST UPLOAD
// ============================================================
exports.guestUploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        const fileUrls = [];
        for (const file of req.files) {
            const processed = await processUploadedFile(file);
            fileUrls.push(processed);
        }

        res.status(201).json({ message: 'Files uploaded successfully!', files: fileUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload files.' });
    }
};