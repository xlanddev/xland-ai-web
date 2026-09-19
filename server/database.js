const fs = require("fs");
const path = require("path");

const dataDir =
    path.join(
        __dirname,
        "..",
        "data"
    );

const chatsFile =
    path.join(
        dataDir,
        "chats.json"
    );

// ======================================
// ENSURE DATABASE
// ======================================

function ensureDatabase() {

    if (
        !fs.existsSync(
            dataDir
        )
    ) {

        fs.mkdirSync(
            dataDir,
            {
                recursive: true
            }
        );

    }

    if (
        !fs.existsSync(
            chatsFile
        )
    ) {

        fs.writeFileSync(
            chatsFile,
            "[]",
            "utf8"
        );

    }

}

// ======================================
// GET CHATS
// ======================================

function getChats() {

    ensureDatabase();

    try {

        const data =
            fs.readFileSync(
                chatsFile,
                "utf8"
            );

        const parsed =
            JSON.parse(
                data
            );

        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Database read error:",
            error
        );

        return [];

    }

}

// ======================================
// SAVE CHATS
// ======================================

function saveChats(
    chats
) {

    ensureDatabase();

    const tempFile =
        `${chatsFile}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(
            chats,
            null,
            2
        ),
        "utf8"
    );

    fs.renameSync(
        tempFile,
        chatsFile
    );

}

// ======================================
// CREATE CHAT
// ======================================

function createChat(
    title = "New Chat"
) {

    const chats =
        getChats();

    const now =
        new Date().toISOString();

    const chat = {

        id:
            `${Date.now()}-${Math.random()
                .toString(36)
                .substring(
                    2,
                    9
                )}`,

        title,

        model:
            process.env.GEMINI_MODEL ||
            "gemini-3.6-flash",

        createdAt:
            now,

        updatedAt:
            now,

        messages: []

    };

    chats.unshift(
        chat
    );

    saveChats(
        chats
    );

    return chat;

}

// ======================================
// GET SINGLE CHAT
// ======================================

function getChat(
    id
) {

    const chats =
        getChats();

    return chats.find(
        chat =>
            chat.id === id
    );

}

// ======================================
// UPDATE CHAT
// ======================================

function updateChat(
    chat
) {

    const chats =
        getChats();

    const index =
        chats.findIndex(
            item =>
                item.id ===
                chat.id
        );

    if (
        index === -1
    ) {

        return false;

    }

    chat.updatedAt =
        new Date().toISOString();

    chats[index] =
        chat;

    saveChats(
        chats
    );

    return true;

}

// ======================================
// RENAME CHAT
// ======================================

function renameChat(
    id,
    title
) {

    const chat =
        getChat(
            id
        );

    if (!chat) {
        return null;
    }

    const cleanTitle =
        String(
            title || ""
        )
        .trim()
        .slice(
            0,
            100
        );

    if (!cleanTitle) {
        return null;
    }

    chat.title =
        cleanTitle;

    updateChat(
        chat
    );

    return chat;

}

// ======================================
// DELETE CHAT
// ======================================

function deleteChat(
    id
) {

    const chats =
        getChats();

    const filtered =
        chats.filter(
            chat =>
                chat.id !== id
        );

    if (
        filtered.length ===
        chats.length
    ) {

        return false;

    }

    saveChats(
        filtered
    );

    return true;

}

// ======================================
// EXPORT
// ======================================

module.exports = {
    getChats,
    saveChats,
    createChat,
    getChat,
    updateChat,
    renameChat,
    deleteChat
};