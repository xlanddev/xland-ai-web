const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(
    __dirname,
    "..",
    "uploads"
);

// ======================================
// CREATE UPLOAD DIRECTORY
// ======================================

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

// ======================================
// LIMITS
// ======================================

const MAX_FILE_SIZE =
    50 * 1024 * 1024;

// ======================================
// ALLOWED FILE TYPES
// ======================================

const ALLOWED_MIME_TYPES = new Set([

    // ==================================
    // TEXT
    // ==================================

    "text/plain",
    "text/markdown",
    "text/csv",

    // ==================================
    // WEB
    // ==================================

    "text/html",
    "application/xhtml+xml",
    "text/css",

    // ==================================
    // PROGRAMMING / CODE
    // ==================================

    "text/javascript",
    "application/javascript",

    "text/x-javascript",

    "text/x-python",
    "application/x-python-code",

    "text/x-typescript",
    "application/x-typescript",

    "text/x-c",
    "text/x-c++",

    "text/x-java",

    "text/x-csharp",

    "text/x-go",

    "text/x-rust",

    // ==================================
    // DATA / CONFIG
    // ==================================

    "application/json",

    "application/xml",
    "text/xml",

    "application/yaml",
    "text/yaml",

    "application/toml",

    // ==================================
    // DOCUMENTS
    // ==================================

    "application/pdf",

    "application/rtf",
    "text/rtf",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // ==================================
    // SPREADSHEETS
    // ==================================

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // ==================================
    // PRESENTATIONS
    // ==================================

    "application/vnd.ms-powerpoint",

    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // ==================================
    // IMAGES
    // ==================================

    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",

    "image/bmp",
    "image/heic",
    "image/heif",
    "image/avif",

    // ==================================
    // AUDIO
    // ==================================

    "audio/mpeg",
    "audio/mp3",

    "audio/wav",
    "audio/x-wav",

    "audio/ogg",
    "audio/opus",

    "audio/mp4",
    "audio/aac",
    "audio/flac",

    // ==================================
    // VIDEO
    // ==================================

    "video/mp4",
    "video/webm",
    "video/mpeg",

    "video/quicktime",
    "video/x-flv",
    "video/x-ms-wmv",

    "video/3gpp",
    "video/avi"
]);

// ======================================
// STORAGE
// ======================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                uploadDir
            );

        },

        filename: (
            req,
            file,
            cb
        ) => {

            const ext =
                path.extname(
                    file.originalname
                );

            const baseName =
                path.basename(
                    file.originalname,
                    ext
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                )
                .slice(
                    0,
                    80
                );

            const unique =
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(
                        2,
                        10
                    );

            cb(
                null,
                `${baseName}-${unique}${ext}`
            );

        }

    });

// ======================================
// MULTER
// ======================================

const upload =
    multer({

        storage,

        limits: {
            fileSize:
                MAX_FILE_SIZE
        },

        fileFilter: (
            req,
            file,
            cb
        ) => {

            if (
                !ALLOWED_MIME_TYPES.has(
                    file.mimetype
                )
            ) {

                return cb(
                    new Error(
                        `File type not allowed: ${file.mimetype}`
                    )
                );

            }

            cb(
                null,
                true
            );

        }

    });

// ======================================
// DELETE LOCAL FILE
// ======================================

function deleteLocalFile(
    filename
) {

    if (!filename) {
        return false;
    }

    const safeName =
        path.basename(
            filename
        );

    const filePath =
        path.join(
            uploadDir,
            safeName
        );

    if (
        !fs.existsSync(
            filePath
        )
    ) {
        return false;
    }

    try {

        fs.unlinkSync(
            filePath
        );

        return true;

    } catch (error) {

        console.error(
            "❌ File delete error:",
            error
        );

        return false;
    }
}

// ======================================
// GET LOCAL FILE PATH
// ======================================

function getLocalFilePath(
    filename
) {

    if (!filename) {
        return null;
    }

    const safeName =
        path.basename(
            filename
        );

    return path.join(
        uploadDir,
        safeName
    );
}

// ======================================
// CHECK FILE TYPE
// ======================================

function isAllowedMimeType(
    mimeType
) {

    if (!mimeType) {
        return false;
    }

    return ALLOWED_MIME_TYPES.has(
        mimeType.toLowerCase()
    );
}

// ======================================
// EXPORT
// ======================================

module.exports = {

    upload,

    uploadDir,

    deleteLocalFile,

    getLocalFilePath,

    isAllowedMimeType,

    MAX_FILE_SIZE,

    ALLOWED_MIME_TYPES

};