let currentChat = null;
let selectedFile = null;
let uploadedFile = null;
let isGenerating = false;


// ======================================
// ELEMENTS
// ======================================

const messages =
    document.getElementById("messages");

const chatList =
    document.getElementById("chatList");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const newChatButton =
    document.getElementById("newChatButton");

const fileButton =
    document.getElementById("fileButton");

const fileInput =
    document.getElementById("fileInput");

const filePreview =
    document.getElementById("filePreview");

const themeButton =
    document.getElementById("themeButton");

const settingsButton =
    document.getElementById("settingsButton");

const settingsModal =
    document.getElementById("settingsModal");

const closeSettings =
    document.getElementById("closeSettings");

const modalThemeButton =
    document.getElementById("modalThemeButton");

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");


// ======================================
// SETTINGS STATE
// ======================================

let settings = {
    markdown: true,
    compactMode: false
};


// ======================================
// SAFE ELEMENT CHECK
// ======================================

function elementExists(element) {

    return (
        element !== null &&
        element !== undefined
    );

}


// ======================================
// LOAD SETTINGS
// ======================================

function loadSettings() {

    try {

        const saved =
            localStorage.getItem(
                "xland-settings"
            );

        if (saved) {

            const parsed =
                JSON.parse(saved);

            settings = {
                ...settings,
                ...parsed
            };

        }

    } catch (error) {

        console.error(
            "Settings load error:",
            error
        );

    }

}


// ======================================
// SAVE SETTINGS
// ======================================

function saveSettings() {

    localStorage.setItem(
        "xland-settings",
        JSON.stringify(settings)
    );

}


// ======================================
// LOAD CHATS
// ======================================

async function loadChats() {

    try {

        const response =
            await fetch(
                "/api/chats"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const chats =
            await response.json();


        renderChatList(
            chats
        );


        return chats;

    } catch (error) {

        console.error(
            "Load chats error:",
            error
        );

        return [];

    }

}


// ======================================
// RENDER CHAT LIST
// ======================================

function renderChatList(chats) {

    if (!elementExists(chatList)) {
        return;
    }


    chatList.innerHTML = "";


    const sorted =
        [...chats].sort(
            (a, b) =>
                new Date(
                    b.updatedAt ||
                    b.createdAt ||
                    0
                ) -
                new Date(
                    a.updatedAt ||
                    a.createdAt ||
                    0
                )
        );


    if (sorted.length === 0) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "empty-history";

        empty.innerHTML = `
            <div class="empty-history-icon">
                ✦
            </div>

            <div>
                No chats yet
            </div>

            <span>
                Start a new conversation
            </span>
        `;

        chatList.appendChild(
            empty
        );

        return;
    }


    sorted.forEach(
        chat => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "chat-item";


            if (
                currentChat &&
                currentChat.id ===
                    chat.id
            ) {

                item.classList.add(
                    "active"
                );

            }


            const title =
                chat.title ||
                "New Chat";


            // ==================================
            // CHAT CONTENT
            // ==================================

            const content =
                document.createElement(
                    "div"
                );

            content.className =
                "chat-item-content";


            const icon =
                document.createElement(
                    "span"
                );

            icon.className =
                "chat-item-icon";

            icon.textContent =
                "◦";


            const titleElement =
                document.createElement(
                    "span"
                );

            titleElement.className =
                "chat-item-title";

            titleElement.textContent =
                title;

            titleElement.title =
                title;


            content.appendChild(
                icon
            );

            content.appendChild(
                titleElement
            );


            // ==================================
            // DELETE BUTTON
            // ==================================

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.type =
                "button";

            deleteButton.className =
                "chat-delete-button";

            deleteButton.innerHTML =
                "🗑";

            deleteButton.title =
                "Delete chat";


            deleteButton.addEventListener(
                "click",
                async event => {

                    event.preventDefault();
                    event.stopPropagation();

                    await deleteChat(
                        chat.id,
                        title
                    );

                }
            );


            item.appendChild(
                content
            );

            item.appendChild(
                deleteButton
            );


            item.addEventListener(
                "click",
                () => {

                    openChat(
                        chat.id
                    );

                }
            );


            chatList.appendChild(
                item
            );

        }
    );

}


// ======================================
// CREATE NEW CHAT
// ======================================

async function createNewChat() {

    if (isGenerating) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/chats",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        currentChat =
            await response.json();


        await clearSelectedFile();


        renderMessages();


        await loadChats();


        closeMobileSidebar();


        if (
            elementExists(
                messageInput
            )
        ) {

            messageInput.focus();

        }

    } catch (error) {

        console.error(
            "Create chat error:",
            error
        );


        alert(
            "Could not create a new chat."
        );

    }

}


// ======================================
// OPEN CHAT
// ======================================

async function openChat(id) {

    if (isGenerating) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/chats/${encodeURIComponent(
                    id
                )}`
            );


        if (!response.ok) {

            throw new Error(
                "Chat not found"
            );

        }


        currentChat =
            await response.json();


        await clearSelectedFile();


        renderMessages();


        await loadChats();


        closeMobileSidebar();

    } catch (error) {

        console.error(
            "Open chat error:",
            error
        );


        alert(
            "Could not open this chat."
        );

    }

}


// ======================================
// RENDER MESSAGES
// ======================================

function renderMessages() {

    if (!elementExists(messages)) {
        return;
    }


    messages.innerHTML = "";


    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        ) ||
        currentChat.messages.length === 0
    ) {

        showWelcome();

        return;

    }


    currentChat.messages.forEach(
        message => {

            addMessage(
                message.role,
                message.content,
                message.attachments
            );

        }
    );


    scrollBottom();

}


// ======================================
// WELCOME
// ======================================

function showWelcome() {

    if (!elementExists(messages)) {
        return;
    }


    messages.innerHTML = `

        <div
            class="welcome"
            id="welcome"
        >

            <div class="welcome-orbit">

                <div class="welcome-icon">
                    X
                </div>

            </div>

            <div class="welcome-badge">
                XLAND AI WEB
            </div>

            <h1>
                Welcome to Xland AI
            </h1>

            <p>
                Your intelligent AI assistant on the web.
            </p>

            <div class="suggestions">

                <button
                    class="suggestion"
                    data-prompt="Explain quantum computing simply."
                >
                    <span>◈</span>
                    Explain something
                </button>

                <button
                    class="suggestion"
                    data-prompt="Write a Python program for me."
                >
                    <span>&lt;/&gt;</span>
                    Write code
                </button>

                <button
                    class="suggestion"
                    data-prompt="Give me some creative ideas for a game."
                >
                    <span>✦</span>
                    Brainstorm
                </button>

            </div>

        </div>

    `;


    attachSuggestionEvents();

}


// ======================================
// ADD MESSAGE
// ======================================

function addMessage(
    role,
    text,
    attachments = []
) {

    if (!elementExists(messages)) {
        return null;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message";


    // ==================================
    // USER
    // ==================================

    if (role === "user") {

        wrapper.classList.add(
            "user-message"
        );


        if (
            Array.isArray(
                attachments
            ) &&
            attachments.length > 0
        ) {

            const attachmentsContainer =
                document.createElement(
                    "div"
                );

            attachmentsContainer.className =
                "message-attachments";


            attachments.forEach(
                attachment => {

                    const attachmentBox =
                        document.createElement(
                            "div"
                        );


                    attachmentBox.className =
                        "message-attachment";


                    const fileName =
                        attachment.originalName ||
                        "Attached file";


                    const extension =
                        getFileExtension(
                            fileName
                        );


                    const icon =
                        getFileIcon(
                            attachment.type ||
                            attachment.geminiMimeType,
                            extension
                        );


                    attachmentBox.innerHTML = `

                        <div class="message-attachment-icon">
                            ${icon}
                        </div>

                        <div class="message-attachment-info">

                            <strong>
                                ${escapeHtml(
                                    fileName
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    attachment.type ||
                                    attachment.geminiMimeType ||
                                    "File"
                                )}
                                ·
                                ${formatFileSize(
                                    Number(
                                        attachment.size ||
                                        0
                                    )
                                )}
                            </span>

                        </div>

                        <div class="message-attachment-check">
                            ✓
                        </div>

                    `;


                    attachmentsContainer.appendChild(
                        attachmentBox
                    );

                }
            );


            wrapper.appendChild(
                attachmentsContainer
            );

        }


        if (
            text &&
            text.trim()
        ) {

            const bubble =
                document.createElement(
                    "div"
                );


            bubble.className =
                "user-bubble";


            bubble.textContent =
                text;


            wrapper.appendChild(
                bubble
            );

        }

    }

    // ==================================
    // AI
    // ==================================

    else {

        wrapper.classList.add(
            "ai-message"
        );


        wrapper.innerHTML =
            renderMarkdown(
                text || ""
            );


        addCopyButtons(
            wrapper
        );

    }


    messages.appendChild(
        wrapper
    );


    return wrapper;

}


// ======================================
// GET FILE EXTENSION
// ======================================

function getFileExtension(
    fileName
) {

    if (!fileName) {
        return "";
    }


    const parts =
        fileName
            .split(".")
            .pop();


    return parts
        ? parts.toLowerCase()
        : "";

}


// ======================================
// FILE ICON
// ======================================

function getFileIcon(
    mimeType,
    extension
) {

    if (
        mimeType &&
        mimeType.startsWith(
            "image/"
        )
    ) {
        return "🖼";
    }


    if (
        mimeType &&
        mimeType.startsWith(
            "audio/"
        )
    ) {
        return "🎵";
    }


    if (
        mimeType &&
        mimeType.startsWith(
            "video/"
        )
    ) {
        return "🎬";
    }


    if (
        extension === "pdf"
    ) {
        return "📕";
    }


    if (
        [
            "html",
            "htm",
            "css",
            "js",
            "ts",
            "py",
            "cpp",
            "c",
            "java",
            "cs"
        ].includes(
            extension
        )
    ) {
        return "💻";
    }


    if (
        [
            "doc",
            "docx"
        ].includes(
            extension
        )
    ) {
        return "📘";
    }


    if (
        [
            "xls",
            "xlsx"
        ].includes(
            extension
        )
    ) {
        return "📊";
    }


    if (
        [
            "ppt",
            "pptx"
        ].includes(
            extension
        )
    ) {
        return "📽";
    }


    return "📎";

}


// ======================================
// MARKDOWN
// ======================================

function renderMarkdown(text) {

    if (!settings.markdown) {

        return escapeHtml(
            text || ""
        ).replace(
            /\n/g,
            "<br>"
        );

    }


    if (
        typeof marked ===
        "undefined"
    ) {

        return escapeHtml(
            text || ""
        ).replace(
            /\n/g,
            "<br>"
        );

    }


    try {

        return marked.parse(
            text || "",
            {
                breaks: true,
                gfm: true
            }
        );

    } catch (error) {

        console.error(
            "Markdown error:",
            error
        );


        return escapeHtml(
            text || ""
        ).replace(
            /\n/g,
            "<br>"
        );

    }

}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text || "";


    return div.innerHTML;

}


// ======================================
// COPY BUTTONS
// ======================================

function addCopyButtons(
    container
) {

    if (!container) {
        return;
    }


    const blocks =
        container.querySelectorAll(
            "pre"
        );


    blocks.forEach(
        pre => {

            if (
                pre.querySelector(
                    ".copy-button"
                )
            ) {
                return;
            }


            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "copy-button";


            button.type =
                "button";


            button.textContent =
                "Copy";


            button.addEventListener(
                "click",
                async () => {

                    const code =
                        pre.querySelector(
                            "code"
                        );


                    if (!code) {
                        return;
                    }


                    try {

                        await navigator
                            .clipboard
                            .writeText(
                                code.innerText
                            );


                        button.textContent =
                            "Copied!";


                        setTimeout(
                            () => {

                                button.textContent =
                                    "Copy";

                            },
                            1500
                        );

                    } catch (error) {

                        console.error(
                            error
                        );


                        button.textContent =
                            "Failed";

                    }

                }
            );


            pre.appendChild(
                button
            );

        }
    );

}


// ======================================
// SEND MESSAGE
// ======================================

async function sendMessage() {

    if (isGenerating) {
        return;
    }


    if (
        !elementExists(
            messageInput
        )
    ) {
        return;
    }


    const text =
        messageInput.value.trim();


    if (
        !text &&
        !uploadedFile
    ) {
        return;
    }


    if (!currentChat) {

        await createNewChat();

    }


    if (!currentChat) {
        return;
    }


    isGenerating =
        true;


    if (
        elementExists(
            sendButton
        )
    ) {

        sendButton.disabled =
            true;

    }


    const fileForMessage =
        uploadedFile
            ? {
                ...uploadedFile
            }
            : null;


    messageInput.value =
        "";


    autoResize();


    const welcome =
        messages.querySelector(
            ".welcome"
        );


    if (welcome) {
        welcome.remove();
    }


    addMessage(
        "user",
        text,
        fileForMessage
            ? [fileForMessage]
            : []
    );


    const aiMessage =
        document.createElement(
            "div"
        );


    aiMessage.className =
        "message ai-message";


    messages.appendChild(
        aiMessage
    );


    scrollBottom();


    let fullText =
        "";


    try {

        const response =
            await fetch(
                "/api/chat/stream",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            chatId:
                                currentChat.id,

                            message:
                                text,

                            file:
                                fileForMessage

                        })

                }
            );


        if (!response.ok) {

            let errorMessage =
                `Server error (${response.status})`;


            try {

                const errorData =
                    await response.json();


                if (
                    errorData &&
                    errorData.error
                ) {

                    errorMessage =
                        errorData.error;

                }

            } catch {
                // Ignore
            }


            throw new Error(
                errorMessage
            );

        }


        if (!response.body) {

            throw new Error(
                "Streaming is not supported by this browser."
            );

        }


        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder(
                "utf-8"
            );


        let buffer =
            "";


        while (true) {

            const {
                value,
                done
            } =
                await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const events =
                buffer.split(
                    "\n\n"
                );


            buffer =
                events.pop() ||
                "";


            for (
                const event
                of events
            ) {

                const lines =
                    event.split(
                        "\n"
                    );


                for (
                    const line
                    of lines
                ) {

                    if (
                        !line.startsWith(
                            "data:"
                        )
                    ) {
                        continue;
                    }


                    const jsonText =
                        line
                            .substring(
                                5
                            )
                            .trim();


                    if (!jsonText) {
                        continue;
                    }


                    let data;


                    try {

                        data =
                            JSON.parse(
                                jsonText
                            );

                    } catch (error) {

                        console.error(
                            "SSE JSON error:",
                            error
                        );

                        continue;

                    }


                    if (
                        data.type ===
                        "text"
                    ) {

                        fullText +=
                            data.text ||
                            "";


                        aiMessage.innerHTML =
                            renderMarkdown(
                                fullText
                            );


                        addCopyButtons(
                            aiMessage
                        );


                        scrollBottom();

                    }


                    if (
                        data.type ===
                        "error"
                    ) {

                        throw new Error(
                            data.error ||
                            "AI generation failed."
                        );

                    }

                }

            }

        }


        await clearSelectedFile();


        await loadChats();


        const updated =
            await fetch(
                `/api/chats/${encodeURIComponent(
                    currentChat.id
                )}`
            );


        if (updated.ok) {

            currentChat =
                await updated.json();

        }


    } catch (error) {

        console.error(
            "Send message error:",
            error
        );


        aiMessage.innerHTML = `

            <div class="error-message">

                <span class="error-icon">
                    !
                </span>

                <span>
                    ${escapeHtml(
                        error.message ||
                        "Xland AI could not generate a response."
                    )}
                </span>

            </div>

        `;

    } finally {

        isGenerating =
            false;


        if (
            elementExists(
                sendButton
            )
        ) {

            sendButton.disabled =
                false;

        }


        if (
            elementExists(
                messageInput
            )
        ) {

            messageInput.focus();

        }

    }

}


// ======================================
// FILE BUTTON
// ======================================

function openFilePicker() {

    if (
        !elementExists(
            fileInput
        )
    ) {

        console.error(
            "fileInput not found."
        );

        return;

    }


    fileInput.click();

}


// ======================================
// FILE SELECTED
// ======================================

async function handleFileSelected(
    event
) {

    const file =
        event.target.files &&
        event.target.files[0];


    if (!file) {
        return;
    }


    if (uploadedFile) {

        await clearSelectedFile();

    }


    selectedFile =
        file;


    showFilePreview(
        file,
        "uploading"
    );


    try {

        await uploadFile(
            file
        );


        updateFilePreviewReady(
            file
        );

    } catch (error) {

        console.error(
            "File upload error:",
            error
        );


        alert(
            error.message ||
            "File upload failed."
        );


        await clearSelectedFile();

    }

}


// ======================================
// UPLOAD FILE
// ======================================

async function uploadFile(
    file
) {

    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    const response =
        await fetch(
            "/api/upload",
            {

                method:
                    "POST",

                body:
                    formData

            }
        );


    let data =
        null;


    try {

        data =
            await response.json();

    } catch {
        // Ignore
    }


    if (!response.ok) {

        throw new Error(
            data?.error ||
            `Upload failed (${response.status})`
        );

    }


    if (
        !data ||
        !data.file ||
        !data.file.geminiUri
    ) {

        throw new Error(
            "Gemini file upload did not return a valid file URI."
        );

    }


    uploadedFile = {

        originalName:
            data.file.originalName,

        filename:
            data.file.filename,

        size:
            data.file.size,

        type:
            data.file.type,

        geminiName:
            data.file.geminiName,

        geminiUri:
            data.file.geminiUri,

        geminiMimeType:
            data.file.geminiMimeType,

        geminiState:
            data.file.geminiState

    };


    console.log(
        "✅ File uploaded to Gemini:",
        uploadedFile
    );


    if (
        filePreview &&
        data.file
    ) {

        filePreview.dataset.filename =
            data.file.filename;

        filePreview.dataset.originalName =
            data.file.originalName;

    }


    return data;

}


// ======================================
// FILE PREVIEW
// ======================================

function showFilePreview(
    file,
    state = "ready"
) {

    if (
        !elementExists(
            filePreview
        )
    ) {
        return;
    }


    const icon =
        getFileIcon(
            file.type,
            getFileExtension(
                file.name
            )
        );


    const status =
        state === "uploading"
            ? `
                <span class="file-upload-status uploading">
                    Uploading to Gemini...
                </span>
              `
            : `
                <span class="file-upload-status ready">
                    ✓ Ready for Gemini
                </span>
              `;


    filePreview.innerHTML = `

        <div class="file-preview-item">

            <div class="file-preview-icon">
                ${icon}
            </div>

            <div class="file-preview-info">

                <strong>
                    ${escapeHtml(
                        file.name
                    )}
                </strong>

                <span>
                    ${formatFileSize(
                        file.size
                    )}
                    ·
                    ${escapeHtml(
                        file.type ||
                        "Unknown type"
                    )}
                </span>

                ${status}

            </div>

            <button
                type="button"
                class="remove-file-button"
                title="Remove file"
            >
                ×
            </button>

        </div>

    `;


    filePreview.classList.add(
        "visible"
    );


    const removeButton =
        filePreview.querySelector(
            ".remove-file-button"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            clearSelectedFile
        );

    }

}


// ======================================
// UPDATE FILE PREVIEW
// ======================================

function updateFilePreviewReady(
    file
) {

    showFilePreview(
        file,
        "ready"
    );


    if (
        filePreview &&
        uploadedFile
    ) {

        filePreview.dataset.filename =
            uploadedFile.filename;

        filePreview.dataset.originalName =
            uploadedFile.originalName;

    }

}


// ======================================
// CLEAR SELECTED FILE
// ======================================

async function clearSelectedFile() {

    const filename =
        filePreview?.dataset?.filename;


    if (filename) {

        try {

            await fetch(
                `/api/upload/${encodeURIComponent(
                    filename
                )}`,
                {
                    method:
                        "DELETE"
                }
            );

        } catch (error) {

            console.error(
                "Delete uploaded file error:",
                error
            );

        }

    }


    selectedFile =
        null;


    uploadedFile =
        null;


    if (
        elementExists(
            fileInput
        )
    ) {

        fileInput.value =
            "";

    }


    if (
        elementExists(
            filePreview
        )
    ) {

        filePreview.innerHTML =
            "";


        filePreview.classList.remove(
            "visible"
        );


        delete filePreview.dataset.filename;

        delete filePreview.dataset.originalName;

    }

}


// ======================================
// FORMAT FILE SIZE
// ======================================

function formatFileSize(
    bytes
) {

    if (
        !Number.isFinite(bytes) ||
        bytes <= 0
    ) {

        return "0 B";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const safeIndex =
        Math.min(
            index,
            units.length - 1
        );


    return (
        bytes /
        Math.pow(
            1024,
            safeIndex
        )
    ).toFixed(
        safeIndex === 0
            ? 0
            : 1
    ) +
    " " +
    units[safeIndex];

}


// ======================================
// SUGGESTIONS
// ======================================

function attachSuggestionEvents() {

    const buttons =
        document.querySelectorAll(
            ".suggestion"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const prompt =
                        button.dataset.prompt ||
                        "";


                    messageInput.value =
                        prompt;


                    autoResize();


                    messageInput.focus();

                }
            );

        }
    );

}


// ======================================
// AUTO RESIZE
// ======================================

function autoResize() {

    if (
        !elementExists(
            messageInput
        )
    ) {
        return;
    }


    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            220
        ) +
        "px";

}


// ======================================
// SCROLL BOTTOM
// ======================================

function scrollBottom() {

    if (
        !elementExists(
            messages
        )
    ) {
        return;
    }


    messages.scrollTop =
        messages.scrollHeight;

}


// ======================================
// THEME
// ======================================

function toggleTheme() {

    const current =
        document.body.dataset.theme ||
        "dark";


    const next =
        current === "dark"
            ? "light"
            : "dark";


    document.body.dataset.theme =
        next;


    localStorage.setItem(
        "xland-theme",
        next
    );


    updateSettingsUI();

}


// ======================================
// LOAD THEME
// ======================================

function loadTheme() {

    const saved =
        localStorage.getItem(
            "xland-theme"
        );


    document.body.dataset.theme =
        saved ||
        "dark";

}


// ======================================
// SETTINGS MODAL
// ======================================

function ensureSettingsModal() {

    let modal =
        document.getElementById(
            "xlandSettingsModal"
        );


    if (modal) {
        return modal;
    }


    modal =
        document.createElement(
            "div"
        );


    modal.id =
        "xlandSettingsModal";


    modal.className =
        "settings-overlay";


    modal.innerHTML = `

        <div class="settings-panel">

            <div class="settings-header">

                <div>

                    <div class="settings-kicker">
                        XLAND AI
                    </div>

                    <h2>
                        Settings
                    </h2>

                    <p>
                        Customize your Xland AI experience.
                    </p>

                </div>

                <button
                    type="button"
                    class="settings-close"
                    id="xlandSettingsClose"
                >
                    ×
                </button>

            </div>


            <div class="settings-section">

                <div class="settings-section-title">
                    Appearance
                </div>


                <div class="modern-setting">

                    <div class="modern-setting-icon">
                        ◐
                    </div>

                    <div class="modern-setting-content">

                        <strong>
                            Theme
                        </strong>

                        <span id="settingsThemeDescription">
                            Dark mode
                        </span>

                    </div>

                    <button
                        type="button"
                        class="settings-control"
                        id="xlandThemeControl"
                    >
                        Dark
                    </button>

                </div>

            </div>


            <div class="settings-section">

                <div class="settings-section-title">
                    Chat
                </div>


                <div class="modern-setting">

                    <div class="modern-setting-icon">
                        #
                    </div>

                    <div class="modern-setting-content">

                        <strong>
                            Markdown
                        </strong>

                        <span>
                            Render AI responses with Markdown.
                        </span>

                    </div>

                    <button
                        type="button"
                        class="toggle-switch"
                        id="markdownToggle"
                        aria-label="Toggle Markdown"
                    >
                        <span></span>
                    </button>

                </div>


                <div class="modern-setting">

                    <div class="modern-setting-icon">
                        ≡
                    </div>

                    <div class="modern-setting-content">

                        <strong>
                            Compact messages
                        </strong>

                        <span>
                            Reduce spacing between messages.
                        </span>

                    </div>

                    <button
                        type="button"
                        class="toggle-switch"
                        id="compactToggle"
                        aria-label="Toggle compact messages"
                    >
                        <span></span>
                    </button>

                </div>

            </div>


            <div class="settings-about">

                <div class="settings-about-logo">
                    X
                </div>

                <div>

                    <strong>
                        Xland AI Web
                    </strong>

                    <span>
                        Version 1.0
                    </span>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        modal.querySelector(
            "#xlandSettingsClose"
        );


    closeButton.addEventListener(
        "click",
        closeSettingsModal
    );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeSettingsModal();

            }

        }
    );


    const themeControl =
        modal.querySelector(
            "#xlandThemeControl"
        );


    themeControl.addEventListener(
        "click",
        toggleTheme
    );


    const markdownToggle =
        modal.querySelector(
            "#markdownToggle"
        );


    markdownToggle.addEventListener(
        "click",
        () => {

            settings.markdown =
                !settings.markdown;

            saveSettings();

            updateSettingsUI();

            renderMessages();

        }
    );


    const compactToggle =
        modal.querySelector(
            "#compactToggle"
        );


    compactToggle.addEventListener(
        "click",
        () => {

            settings.compactMode =
                !settings.compactMode;

            saveSettings();

            updateSettingsUI();

        }
    );


    updateSettingsUI();


    return modal;

}


// ======================================
// UPDATE SETTINGS UI
// ======================================

function updateSettingsUI() {

    const modal =
        document.getElementById(
            "xlandSettingsModal"
        );


    if (!modal) {
        return;
    }


    const theme =
        document.body.dataset.theme ||
        "dark";


    const themeControl =
        modal.querySelector(
            "#xlandThemeControl"
        );


    const themeDescription =
        modal.querySelector(
            "#settingsThemeDescription"
        );


    if (themeControl) {

        themeControl.textContent =
            theme === "dark"
                ? "Dark"
                : "Light";

    }


    if (themeDescription) {

        themeDescription.textContent =
            theme === "dark"
                ? "Dark mode"
                : "Light mode";

    }


    const markdownToggle =
        modal.querySelector(
            "#markdownToggle"
        );


    if (markdownToggle) {

        markdownToggle.classList.toggle(
            "active",
            settings.markdown
        );

    }


    const compactToggle =
        modal.querySelector(
            "#compactToggle"
        );


    if (compactToggle) {

        compactToggle.classList.toggle(
            "active",
            settings.compactMode
        );

    }


    document.body.classList.toggle(
        "compact-mode",
        settings.compactMode
    );

}


// ======================================
// OPEN SETTINGS
// ======================================

function openSettings() {

    const modal =
        ensureSettingsModal();


    if (!modal) {
        return;
    }


    modal.classList.add(
        "open"
    );


    updateSettingsUI();

}


// ======================================
// CLOSE SETTINGS
// ======================================

function closeSettingsModal() {

    const modal =
        document.getElementById(
            "xlandSettingsModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );

}


// ======================================
// DELETE CHAT
// ======================================

async function deleteChat(
    chatId,
    title = "this chat"
) {

    if (isGenerating) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${title}"?\n\nThis chat and its message history will be removed.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/chats/${encodeURIComponent(
                    chatId
                )}`,
                {
                    method:
                        "DELETE"
                }
            );


        if (!response.ok) {

            let errorText =
                "Could not delete chat.";


            try {

                const data =
                    await response.json();

                errorText =
                    data.error ||
                    errorText;

            } catch {
                // Ignore
            }


            throw new Error(
                errorText
            );

        }


        if (
            currentChat &&
            currentChat.id ===
                chatId
        ) {

            await clearSelectedFile();

            currentChat =
                null;

            renderMessages();

        }


        await loadChats();

    } catch (error) {

        console.error(
            "Delete chat error:",
            error
        );


        alert(
            error.message ||
            "Could not delete chat."
        );

    }

}


// ======================================
// DELETE CURRENT CHAT
// ======================================

async function deleteCurrentChat() {

    if (
        !currentChat ||
        isGenerating
    ) {
        return;
    }


    await deleteChat(
        currentChat.id,
        currentChat.title ||
        "this chat"
    );

}


// ======================================
// MOBILE SIDEBAR
// ======================================

function openMobileSidebar() {

    if (sidebar) {

        sidebar.classList.add(
            "open"
        );

    }


    if (overlay) {

        overlay.classList.add(
            "open"
        );

    }

}


function closeMobileSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "open"
        );

    }

}


// ======================================
// KEYBOARD
// ======================================

function handleInputKeydown(
    event
) {

    if (
        event.key ===
            "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();

        return;

    }


    if (
        event.key ===
        "Escape"
    ) {

        closeSettingsModal();

    }

}


// ======================================
// EVENT LISTENERS
// ======================================

function setupEvents() {

    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            createNewChat
        );

    }


    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );

    }


    if (fileButton) {

        fileButton.addEventListener(
            "click",
            openFilePicker
        );

    }


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            handleFileSelected
        );

    }


    if (themeButton) {

        themeButton.addEventListener(
            "click",
            toggleTheme
        );

    }


    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            openSettings
        );

    }


    if (closeSettings) {

        closeSettings.addEventListener(
            "click",
            closeSettingsModal
        );

    }


    if (modalThemeButton) {

        modalThemeButton.addEventListener(
            "click",
            toggleTheme
        );

    }


    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            openMobileSidebar
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    if (messageInput) {

        messageInput.addEventListener(
            "input",
            autoResize
        );


        messageInput.addEventListener(
            "keydown",
            handleInputKeydown
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeSettingsModal();
                closeMobileSidebar();

            }

        }
    );

}


// ======================================
// INITIALIZE
// ======================================

async function initialize() {

    loadTheme();

    loadSettings();

    setupEvents();

    autoResize();

    await loadChats();

    renderMessages();

    if (messageInput) {

        messageInput.focus();

    }

}


// ======================================
// START
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    initialize
);