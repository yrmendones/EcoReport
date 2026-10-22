const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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

async function processUploadedFile(file, req) {
    let finalFilename = file.filename;
    let finalMimetype = file.mimetype;
    let finalPath = file.path;

    const isVideo = file.mimetype.startsWith('video/');

    if (isVideo) {
        try {
            console.log(`🎬 Transcoding video: ${file.filename} ...`);
            const convertedPath = await transcodeToMp4(file.path);

            // Delete the original to save disk space
            try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }

            finalPath = convertedPath;
            finalFilename = path.basename(convertedPath);
            finalMimetype = 'video/mp4';
            console.log(`✅ Transcode done: ${finalFilename}`);
        } catch (err) {
            console.error(`⚠️ Transcode failed for ${file.filename}:`, err.message);
        }
    }

    return {
        filename: finalFilename,
        url: `${req.protocol}://${req.get('host')}/uploads/${finalFilename}`,
        size: fs.existsSync(finalPath) ? fs.statSync(finalPath).size : 0,
        mimetype: finalMimetype,
    };
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
            const processed = await processUploadedFile(file, req);
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
            const processed = await processUploadedFile(file, req);
            fileUrls.push(processed);
        }

        res.status(201).json({ message: 'Files uploaded successfully!', files: fileUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload files.' });
    }
};