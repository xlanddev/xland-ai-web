require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const {
    generateStream,
    uploadFileToGemini,
    ALLOWED_MODELS,
    DEFAULT_MODEL
} = require("./gemini");

const {
    getChats,
    createChat,
    getChat,
    updateChat,
    renameChat,
    deleteChat
} = require("./database");

const {
    upload,
    uploadDir,
    getLocalFilePath,
    deleteLocalFile
} = require("./files");

const app =
    express();

const PORT =
    process.env.PORT ||
    3000;

// ======================================
// SECURITY
// ======================================

app.disable(
    "x-powered-by"
);

// ======================================
// MIDDLEWARE
// ======================================

app.use(
    cors()
);

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

// ======================================
// STATIC FRONTEND
// ======================================

app.use(
    express.static(
        path.join(
            __dirname,
            "..",
            "public"
        )
    )
);

// ======================================
// RATE LIMIT
// ======================================

const rateMap =
    new Map();

function rateLimit(
    windowMs,
    maxRequests
) {

    return (
        req,
        res,
        next
    ) => {

        const ip =
            req.ip ||
            req.socket
                .remoteAddress ||
            "unknown";

        const now =
            Date.now();

        let record =
            rateMap.get(
                ip
            );

        if (
            !record ||
            now >
                record.resetAt
        ) {

            record = {
                count: 0,
                resetAt:
                    now +
                    windowMs
            };

        }

        record.count++;

        rateMap.set(
            ip,
            record
        );

        if (
            record.count >
            maxRequests
        ) {

            return res
                .status(429)
                .json({
                    error:
                        "Too many requests. Please try again later."
                });

        }

        next();

    };

}

// ======================================
// HEALTH
// ======================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status:
                "online",

            name:
                "Xland AI Web",

            version:
                "1.0.0",

            model:
                DEFAULT_MODEL

        });

    }
);

// ======================================
// MODELS
// ======================================

app.get(
    "/api/models",
    (req, res) => {

        res.json({

            models:
                [...ALLOWED_MODELS],

            default:
                DEFAULT_MODEL

        });

    }
);

// ======================================
// GET ALL CHATS
// ======================================

app.get(
    "/api/chats",
    (req, res) => {

        try {

            const chats =
                getChats();

            res.json(
                chats
            );

        } catch (
            error
        ) {

            console.error(
                "Get chats error:",
                error
            );

            res.status(
                500
            ).json({

                error:
                    "Could not load chats."

            });

        }

    }
);

// ======================================
// CREATE CHAT
// ======================================

app.post(
    "/api/chats",
    rateLimit(
        60_000,
        20
    ),
    (req, res) => {

        try {

            const title =
                typeof req.body
                    ?.title ===
                "string"
                    ? req.body.title
                        .trim()
                        .slice(
                            0,
                            100
                        )
                    : "New Chat";

            const chat =
                createChat(
                    title ||
                        "New Chat"
                );

            res.status(
                201
            ).json(
                chat
            );

        } catch (
            error
        ) {

            console.error(
                "Create chat error:",
                error
            );

            res.status(
                500
            ).json({

                error:
                    "Could not create chat."

            });

        }

    }
);

// ======================================
// GET SINGLE CHAT
// ======================================

app.get(
    "/api/chats/:id",
    (req, res) => {

        try {

            const chat =
                getChat(
                    req.params.id
                );

            if (!chat) {

                return res
                    .status(
                        404
                    )
                    .json({

                        error:
                            "Chat not found."

                    });

            }

            res.json(
                chat
            );

        } catch (
            error
        ) {

            console.error(
                "Get chat error:",
                error
            );

            res.status(
                500
            ).json({

                error:
                    "Could not load chat."

            });

        }

    }
);

// ======================================
// RENAME / UPDATE CHAT
// ======================================

app.patch(
    "/api/chats/:id",
    rateLimit(
        60_000,
        60
    ),
    (req, res) => {

        try {

            const chat =
                getChat(
                    req.params.id
                );

            if (!chat) {

                return res
                    .status(
                        404
                    )
                    .json({

                        error:
                            "Chat not found."

                    });

            }

            // ------------------------------
            // RENAME
            // ------------------------------

            if (
                typeof req.body
                    ?.title ===
                "string"
            ) {

                const renamed =
                    renameChat(
                        req.params.id,
                        req.body.title
                    );

                if (!renamed) {

                    return res
                        .status(
                            400
                        )
                        .json({

                            error:
                                "Invalid title."

                        });

                }

                return res.json(
                    renamed
                );

            }

            // ------------------------------
            // CHANGE MODEL
            // ------------------------------

            if (
                typeof req.body
                    ?.model ===
                "string"
            ) {

                if (
                    !ALLOWED_MODELS.has(
                        req.body.model
                    )
                ) {

                    return res
                        .status(
                            400
                        )
                        .json({

                            error:
                                "Model is not allowed."

                        });

                }

                chat.model =
                    req.body.model;

                updateChat(
                    chat
                );

                return res.json(
                    chat
                );

            }

            res.json(
                chat
            );

        } catch (
            error
        ) {

            console.error(
                "Update chat error:",
                error
            );

            res.status(
                500
            ).json({

                error:
                    "Could not update chat."

            });

        }

    }
);

// ======================================
// DELETE CHAT
// ======================================

app.delete(
    "/api/chats/:id",
    rateLimit(
        60_000,
        30
    ),
    (req, res) => {

        try {

            const chat =
                getChat(
                    req.params.id
                );

            if (!chat) {

                return res
                    .status(
                        404
                    )
                    .json({

                        error:
                            "Chat not found."

                    });

            }

            // Delete local files
            // belonging to this chat.

            if (
                Array.isArray(
                    chat.messages
                )
            ) {

                for (
                    const message
                    of chat.messages
                ) {

                    if (
                        !Array.isArray(
                            message.parts
                        )
                    ) {

                        continue;

                    }

                    for (
                        const part
                        of message.parts
                    ) {

                        if (
                            part.type ===
                                "file" &&
                            part.localName
                        ) {

                            try {

                                deleteLocalFile(
                                    part.localName
                                );

                            } catch {}

                        }

                    }

                }

            }

            deleteChat(
                req.params.id
            );

            res.json({

                success:
                    true

            });

        } catch (
            error
        ) {

            console.error(
                "Delete chat error:",
                error
            );

            res.status(
                500
            ).json({

                error:
                    "Could not delete chat."

            });

        }

    }
);

// ======================================
// FILE UPLOAD
// ======================================

app.post(
    "/api/upload",
    rateLimit(
        60_000,
        20
    ),
    upload.single(
        "file"
    ),
    async (
        req,
        res
    ) => {

        if (!req.file) {

            return res
                .status(
                    400
                )
                .json({

                    error:
                        "No file uploaded."

                });

        }

        try {

            const filePath =
                getLocalFilePath(
                    req.file.filename
                );

            console.log(
                `📎 Uploading → ${req.file.originalname}`
            );

            const geminiFile =
                await uploadFileToGemini(
                    filePath,
                    req.file.mimetype
                );

            console.log(
                `📎 Gemini file → ${geminiFile.name}`
            );

            res.status(
                201
            ).json({

                success:
                    true,

                file: {

                    name:
                        req.file.originalname,

                    localName:
                        req.file.filename,

                    size:
                        req.file.size,

                    mimeType:
                        req.file.mimetype,

                    geminiName:
                        geminiFile.name,

                    geminiUri:
                        geminiFile.uri,

                    geminiMimeType:
                        geminiFile.mimeType ||
                        req.file.mimetype

                }

            });

        } catch (
            error
        ) {

            console.error(
                "Upload error:",
                error
            );

            try {

                deleteLocalFile(
                    req.file.filename
                );

            } catch {}

            res.status(
                500
            ).json({

                error:
                    "File upload to Gemini failed."

            });

        }

    }
);

// ======================================
// DELETE LOCAL FILE
// ======================================

app.delete(
    "/api/upload/:filename",
    rateLimit(
        60_000,
        30
    ),
    (req, res) => {

        try {

            const filename =
                path.basename(
                    req.params
                        .filename
                );

            const deleted =
                deleteLocalFile(
                    filename
                );

            if (!deleted) {

                return res
                    .status(
                        404
                    )
                    .json({

                        error:
                            "File not found."

                    });

            }

            res.json({

                success:
                    true

            });

        } catch (
            error
        ) {

            console.error(
                "Delete upload error:",
                error
            );

            res.status(
                500
            ).json({

                error:
                    "Could not delete file."

            });

        }

    }
);

// ======================================
// STREAM CHAT
// ======================================

app.post(
    "/api/chat/stream",
    rateLimit(
        60_000,
        40
    ),
    async (
        req,
        res
    ) => {

        try {

            const chatId =
                typeof req.body
                    ?.chatId ===
                "string"
                    ? req.body.chatId
                        .trim()
                    : "";

            const message =
                typeof req.body
                    ?.message ===
                "string"
                    ? req.body.message
                        .trim()
                        .slice(
                            0,
                            10000
                        )
                    : "";

            const requestedModel =
                typeof req.body
                    ?.model ===
                "string"
                    ? req.body.model
                        .trim()
                    : "";

            const file =
                req.body?.file ||
                null;

            // ------------------------------
            // VALIDATE CHAT
            // ------------------------------

            if (!chatId) {

                return res
                    .status(
                        400
                    )
                    .json({

                        error:
                            "Chat ID is required."

                    });

            }

            // ------------------------------
            // VALIDATE MESSAGE / FILE
            // ------------------------------

            if (
                !message &&
                !file
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        error:
                            "Message or file is required."

                    });

            }

            // ------------------------------
            // GET CHAT
            // ------------------------------

            const chat =
                getChat(
                    chatId
                );

            if (!chat) {

                return res
                    .status(
                        404
                    )
                    .json({

                        error:
                            "Chat not found."

                    });

            }

            // ------------------------------
            // MODEL
            // ------------------------------

            if (
                requestedModel
            ) {

                if (
                    !ALLOWED_MODELS.has(
                        requestedModel
                    )
                ) {

                    return res
                        .status(
                            400
                        )
                        .json({

                            error:
                                "Model is not allowed."

                        });

                }

                chat.model =
                    requestedModel;

            }

            // ------------------------------
            // USER MESSAGE PARTS
            // ------------------------------

            const parts = [];

            if (file) {

                if (
                    typeof file.geminiUri !==
                    "string"
                ) {

                    return res
                        .status(
                            400
                        )
                        .json({

                            error:
                                "Invalid Gemini file URI."

                        });

                }

                parts.push({

                    type:
                        "file",

                    uri:
                        file.geminiUri,

                    mimeType:
                        file.geminiMimeType ||
                        file.mimeType ||
                        "application/octet-stream",

                    name:
                        file.name ||
                        "uploaded-file",

                    localName:
                        file.localName ||
                        null

                });

            }

            // ------------------------------
            // ADD USER MESSAGE
            // ------------------------------

            chat.messages.push({

                role:
                    "user",

                content:
                    message,

                parts,

                timestamp:
                    new Date()
                        .toISOString()

            });

            // ------------------------------
            // AUTO TITLE
            // ------------------------------

            if (
                chat.title ===
                "New Chat"
            ) {

                let title =
                    message ||
                    file?.name ||
                    "Uploaded File";

                if (
                    title.length >
                    45
                ) {

                    title =
                        title.substring(
                            0,
                            45
                        ) +
                        "...";

                }

                chat.title =
                    title;

            }

            updateChat(
                chat
            );

            // ==================================
            // SSE
            // ==================================

            res.setHeader(
                "Content-Type",
                "text/event-stream"
            );

            res.setHeader(
                "Cache-Control",
                "no-cache, no-transform"
            );

            res.setHeader(
                "Connection",
                "keep-alive"
            );

            res.setHeader(
                "X-Accel-Buffering",
                "no"
            );

            if (
                typeof res.flushHeaders ===
                "function"
            ) {

                res.flushHeaders();

            }

            // ------------------------------
            // EVENT HELPER
            // ------------------------------

            const sendEvent =
                data => {

                    res.write(
                        `data: ${JSON.stringify(
                            data
                        )}\n\n`
                    );

                };

            sendEvent({

                type:
                    "start"

            });

            // ==================================
            // GEMINI
            // ==================================

            const stream =
                await generateStream(
                    chat.messages,
                    chat.model
                );

            let fullResponse =
                "";

            for await (
                const chunk
                of stream
            ) {

                const text =
                    chunk.text ||
                    "";

                if (!text) {
                    continue;
                }

                fullResponse +=
                    text;

                sendEvent({

                    type:
                        "text",

                    text:
                        text

                });

                if (
                    typeof res.flush ===
                    "function"
                ) {

                    res.flush();

                }

            }

            // ==================================
            // SAVE MODEL RESPONSE
            // ==================================

            if (
                fullResponse.trim()
            ) {

                chat.messages.push({

                    role:
                        "model",

                    content:
                        fullResponse,

                    parts: [],

                    timestamp:
                        new Date()
                            .toISOString()

                });

            }

            updateChat(
                chat
            );

            sendEvent({

                type:
                    "done"

            });

            res.end();

        } catch (
            error
        ) {

            console.error("");

            console.error(
                "================================"
            );

            console.error(
                "❌ CHAT ERROR"
            );

            console.error(
                "================================"
            );

            console.error(
                error
            );

            console.error(
                "================================"
            );

            try {

                if (
                    !res.headersSent
                ) {

                    return res
                        .status(
                            500
                        )
                        .json({

                            error:
                                "Xland AI could not generate a response."

                        });

                }

                res.write(
                    `data: ${JSON.stringify({
                        type:
                            "error",

                        error:
                            "Xland AI could not generate a response."
                    })}\n\n`
                );

                res.end();

            } catch (
                closeError
            ) {

                console.error(
                    "Response close error:",
                    closeError
                );

                try {
                    res.end();
                } catch {}

            }

        }

    }
);

// ======================================
// MULTER / SERVER ERROR
// ======================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error?.code ===
            "LIMIT_FILE_SIZE"
        ) {

            return res
                .status(
                    413
                )
                .json({

                    error:
                        "File is too large. Maximum size is 50MB."

                });

        }

        if (
            error?.message &&
            error.message.startsWith(
                "File type not allowed"
            )
        ) {

            return res
                .status(
                    415
                )
                .json({

                    error:
                        error.message

                });

        }

        console.error(
            "Server error:",
            error
        );

        res.status(
            500
        ).json({

            error:
                "Internal server error."

        });

    }
);

// ======================================
// FRONTEND FALLBACK
// ======================================

app.use(
    (
        req,
        res
    ) => {

        res.sendFile(
            path.join(
                __dirname,
                "..",
                "public",
                "index.html"
            )
        );

    }
);

// ======================================
// START
// ======================================

// ======================================
// START
// ======================================

const HOST =
    process.env.HOST ||
    "0.0.0.0";

app.listen(
    PORT,
    HOST,
    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "        XLAND AI WEB v1.0"
        );

        console.log(
            "================================"
        );

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log(
            `Network: http://0.0.0.0:${PORT}`
        );

        console.log(
            "Status: ONLINE"
        );

        console.log(
            "================================"
        );

        console.log("");

        console.log(
            `🤖 Xland AI → ${DEFAULT_MODEL}`
        );

        console.log("");

    }
);