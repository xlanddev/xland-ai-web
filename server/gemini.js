const fs = require("fs");

const {
    GoogleGenAI,
    createPartFromUri
} = require("@google/genai");

// ======================================
// API KEY
// ======================================

if (
    !process.env.GEMINI_API_KEY
) {

    console.error(
        "❌ GEMINI_API_KEY is missing from .env"
    );

}

// ======================================
// GOOGLE AI
// ======================================

const ai =
    new GoogleGenAI({
        apiKey:
            process.env.GEMINI_API_KEY
    });

// ======================================
// MODEL
// ======================================

const DEFAULT_MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-3.6-flash";

// ======================================
// ALLOWED MODELS
// ======================================

const ALLOWED_MODELS =
    new Set([
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite"
    ]);

// ======================================
// SYSTEM INSTRUCTION
// ======================================

const SYSTEM_INSTRUCTION = `
You are Xland AI Web.

You are a helpful AI assistant created for the Xland ecosystem.

You communicate in Persian and English.

Rules:

- If the user writes Persian, answer in Persian.
- If the user writes English, answer in English.
- You can explain and write code.
- Use Markdown when useful.
- Put programming code inside Markdown code blocks.
- Be clear and useful.
- Do not claim to control the user's computer.
- This web version does not have Windows, mouse, keyboard,
  application-control, or local PC automation access.
- When a file is provided, actually inspect and use the file
  when answering the user's question.
`;

// ======================================
// MODEL VALIDATION
// ======================================

function getSafeModel(
    model
) {

    if (
        typeof model ===
            "string" &&
        ALLOWED_MODELS.has(
            model
        )
    ) {

        return model;

    }

    return DEFAULT_MODEL;

}

// ======================================
// BUILD CONTENTS
// ======================================

function buildContents(
    messages
) {

    return messages.map(
        message => {

            const role =
                message.role ===
                    "assistant" ||
                message.role ===
                    "model"
                    ? "model"
                    : "user";

            const parts = [];

            // ------------------------------
            // FILE PARTS
            // ------------------------------

            if (
                Array.isArray(
                    message.parts
                )
            ) {

                for (
                    const part
                    of message.parts
                ) {

                    if (
                        part.type ===
                            "file" &&
                        part.uri
                    ) {

                        parts.push(
                            createPartFromUri(
                                part.uri,
                                part.mimeType ||
                                    "application/octet-stream"
                            )
                        );

                    }

                }

            }

            // ------------------------------
            // TEXT
            // ------------------------------

            if (
                message.content
            ) {

                parts.push({
                    text:
                        String(
                            message.content
                        )
                });

            }

            return {
                role,
                parts
            };

        }
    );

}

// ======================================
// UPLOAD FILE TO GEMINI
// ======================================

async function uploadFileToGemini(
    filePath,
    mimeType
) {

    if (!filePath) {

        throw new Error(
            "File path is missing."
        );

    }

    if (
        !fs.existsSync(
            filePath
        )
    ) {

        throw new Error(
            "Local file does not exist."
        );

    }

    const uploaded =
        await ai.files.upload({
            file: filePath,

            config: {
                mimeType:
                    mimeType ||
                    "application/octet-stream"
            }
        });

    return uploaded;

}

// ======================================
// GENERATE STREAM
// ======================================

async function generateStream(
    messages,
    model
) {

    try {

        const safeModel =
            getSafeModel(
                model
            );

        const contents =
            buildContents(
                messages
            );

        console.log(
            `🤖 Xland AI → ${safeModel}`
        );

        const stream =
            await ai.models.generateContentStream({

                model:
                    safeModel,

                contents,

                config: {

                    systemInstruction:
                        SYSTEM_INSTRUCTION

                }

            });

        return stream;

    } catch (error) {

        console.error("");

        console.error(
            "================================"
        );

        console.error(
            "❌ GEMINI STREAM ERROR"
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

        console.error("");

        throw error;

    }

}

// ======================================
// NORMAL RESPONSE
// ======================================

async function generateResponse(
    messages,
    model
) {

    try {

        const safeModel =
            getSafeModel(
                model
            );

        const contents =
            buildContents(
                messages
            );

        const response =
            await ai.models.generateContent({

                model:
                    safeModel,

                contents,

                config: {

                    systemInstruction:
                        SYSTEM_INSTRUCTION

                }

            });

        return (
            response.text ||
            ""
        );

    } catch (error) {

        console.error(
            "❌ GEMINI RESPONSE ERROR"
        );

        console.error(
            error
        );

        throw error;

    }

}

// ======================================
// EXPORT
// ======================================

module.exports = {

    ai,

    DEFAULT_MODEL,

    ALLOWED_MODELS,

    uploadFileToGemini,

    generateStream,

    generateResponse

};