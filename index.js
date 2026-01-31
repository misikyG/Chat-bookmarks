/**
 * Chat Bookmarks Extension for SillyTavern
 * 在聊天訊息上標記書籤，可以預覽和跳轉到書籤訊息
 * 支援跨聊天視窗瀏覽同角色的所有書籤
 */

import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, characters, this_chid, chat, chat_metadata, getRequestHeaders, saveChatConditional, eventSource, event_types } from "../../../../script.js";
import { selected_group, groups, openGroupChat } from "../../../group-chats.js";
import { POPUP_TYPE, Popup } from "../../../popup.js";
import { delay, flashHighlight, waitUntilCondition } from "../../../utils.js";
import { debounce_timeout } from "../../../constants.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { ARGUMENT_TYPE, SlashCommandArgument } from "../../../slash-commands/SlashCommandArgument.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { loadLocale, t } from "./i18n.js";

const extensionName = "Chat-bookmarks";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// SVG 圖樣定義
const BOOKMARK_ICONS = {
    star: {
        nameKey: 'iconName_star',
        solid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329l104.2-103.1c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>',
        regular: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M287.9 0c9.2 0 17.6 5.2 21.6 13.5l68.6 141.3 153.2 22.6c9 1.3 16.5 7.6 19.3 16.3s.5 18.1-6 24.3L433.6 328.4l26.2 155.6c1.5 9-2.2 18.1-9.7 23.5s-17.3 6-25.3 1.7l-137-73.2L151 509.1c-8.1 4.3-17.9 3.7-25.3-1.7s-11.2-14.5-9.7-23.5l26.2-155.6L31.1 217.9c-6.6-6.2-8.9-15.6-6-24.3s10.3-15 19.3-16.3l153.2-22.6L266.3 13.5C270.4 5.2 278.7 0 287.9 0zm0 79L235.4 187.2c-3.5 7.1-10.2 12.1-18.1 13.3L99 217.9l85.9 85.1c5.5 5.5 8 13.3 6.6 21l-20.3 119.7 107.1-57.2c7.1-3.8 15.6-3.8 22.7 0l107.1 57.2-20.3-119.7c-1.4-7.7 1.1-15.5 6.6-21l85.9-85.1-118.3-17.4c-7.8-1.2-14.6-6.1-18.1-13.3L287.9 79z"/></svg>'
    },
    heart: {
        nameKey: 'iconName_heart',
        solid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/></svg>',
        regular: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M225.8 468.2l-2.5-2.3L48.1 303.2C17.4 274.7 0 234.7 0 192.8v-3.3c0-70.4 50-130.8 119.2-144C158.6 37.9 198.9 47 231 69.6c9 6.4 17.4 13.8 25 22.3c4.2-4.8 8.7-9.2 13.5-13.3c3.7-3.2 7.5-6.2 11.5-9c32.1-22.6 72.4-31.7 111.8-23.3C462 57.6 512 118 512 188.5v3.3c0 41.9-17.4 81.9-48.1 110.4L288.7 465.9l-2.5 2.3c-8.2 7.6-19 11.9-30.2 11.9s-22-4.2-30.2-11.9zM239.1 145c-.4-.3-.7-.7-1-1.1l-17.8-20c-23.5-26.3-56.9-41-91.5-41c-40.6 0-77.7 24.1-94.3 61.3c-7.6 17.1-11.5 35.6-11.5 54.6v3.3c0 28.5 11.9 55.8 32.8 75.2L256 468.2l200.3-186.2c20.9-19.5 32.8-46.7 32.8-75.2v-3.3c0-19-3.9-37.5-11.5-54.6c-16.6-37.2-53.7-61.3-94.3-61.3c-34.6 0-68 14.7-91.5 41l-17.8 20c-.3 .4-.7 .7-1 1.1c-4.5 4.5-10.6 7-16.9 7s-12.4-2.5-16.9-7z"/></svg>'
    },
    bookmark: {
        nameKey: 'iconName_bookmark',
        solid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"/></svg>',
        regular: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M0 48C0 21.5 21.5 0 48 0l0 48 0 393.4 130.1-92.9c8.3-6 19.6-6 27.9 0L336 441.4 336 48 48 48 48 0 336 0c26.5 0 48 21.5 48 48l0 439.7c0 13.4-10.9 24.3-24.3 24.3c-5 0-9.9-1.5-14-4.4L192 400 38.3 507.6c-4.1 2.9-9 4.4-14 4.4C10.9 512 0 501.1 0 487.7L0 48z"/></svg>'
    },
    flag: {
        nameKey: 'iconName_flag',
        solid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M64 32C64 14.3 49.7 0 32 0S0 14.3 0 32L0 64 0 368 0 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-128 64.3-16.1c41.1-10.3 84.6-5.5 122.5 13.4c44.2 22.1 95.5 24.8 141.7 7.4l34.7-13c12.5-4.7 20.8-16.6 20.8-30l0-247.7c0-23-24.2-38-44.8-27.7l-9.6 4.8c-46.3 23.2-100.8 23.2-147.1 0c-35.1-17.6-75.4-22-113.5-12.5L64 48l0-16z"/></svg>',
        regular: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24L0 64 0 350.5 0 400l0 88c0 13.3 10.7 24 24 24s24-10.7 24-24l0-100 80.3-20.1c41.1-10.3 84.6-5.5 122.5 13.4c44.2 22.1 95.5 24.8 141.7 7.4l34.7-13c12.5-4.7 20.8-16.6 20.8-30l0-279.7c0-23-24.2-38-44.8-27.7l-9.6 4.8c-46.3 23.2-100.8 23.2-147.1 0c-35.1-17.6-75.4-22-113.5-12.5L48 52l0-28zm0 77.5l96.6-24.2c27-6.7 55.5-3.6 80.4 8.8c54.9 27.4 118.7 29.7 175 6.8l0 241.8-24.4 9.1c-33.7 12.6-71.2 10.7-103.4-5.4c-48.2-24.1-103.3-30.1-155.6-17.1L48 338.5l0-237z"/></svg>'
    }
};

/**
 * 取得圖示名稱 (使用 I18N)
 */
function getIconName(iconKey) {
    const icon = BOOKMARK_ICONS[iconKey];
    return icon ? t(icon.nameKey) : iconKey;
}

// 預設設定
const defaultSettings = {
    enabled: true,
    showNotifications: true,
    previewRange: 10,
    accentColor: '#ffe084',
    bookmarkIcon: 'star',
    selectedChatsByCharacter: {},
    previewLineClamp: 15,
    sortOrder: 'messageAsc',
    customTags: [],
    activeTagFilters: [],
    separateTagsByCharacter: true,
    searchQuery: '',
};

// 當前預覽狀態
let currentPreviewState = {
    chatFileName: '',
    messageId: 0,
    startOffset: 0,
    endOffset: 0,
    chatData: null,
};

// ========== 工具函式 ==========

/**
 * HTML 跳脫
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 取得設定值
 */
function getSetting(key) {
    return extension_settings[extensionName]?.[key] ?? defaultSettings[key];
}

/**
 * 設定值
 */
function setSetting(key, value) {
    extension_settings[extensionName][key] = value;
    saveSettingsDebounced();
}

/**
 * 取得當前設定的書籤圖示 SVG
 */
function getBookmarkIconSvg(filled = false) {
    const iconType = getSetting('bookmarkIcon');
    const icon = BOOKMARK_ICONS[iconType] || BOOKMARK_ICONS.star;
    return filled ? icon.solid : icon.regular;
}

/**
 * 套用 CSS 變數
 */
function applyCssVariables() {
    const accentColor = getSetting('accentColor');
    const lineClamp = getSetting('previewLineClamp');
    
    document.documentElement.style.setProperty('--bookmark-accent-color', accentColor);
    document.documentElement.style.setProperty('--bookmark-preview-line-clamp', String(lineClamp));
    
    // 同時更新已存在的書籤項目文字的行數限制
    document.querySelectorAll('.bookmark-item-text').forEach(el => {
        el.style.setProperty('-webkit-line-clamp', String(lineClamp));
        el.style.setProperty('line-clamp', String(lineClamp));
    });
}

// ========== 聊天資料存取 ==========

/**
 * 取得當前聊天檔案名稱
 */
function getCurrentChatFileName() {
    if (selected_group) {
        const group = groups.find(g => g.id === selected_group);
        return group?.chat_id || '';
    }
    return this_chid !== undefined ? characters[this_chid]?.chat || '' : '';
}

/**
 * 取得當前角色唯一識別碼
 */
function getCurrentCharacterKey() {
    if (selected_group) return `group_${selected_group}`;
    if (this_chid !== undefined && characters[this_chid]) return `char_${characters[this_chid].avatar}`;
    return '';
}

/**
 * 取得/設定當前角色的已選擇聊天清單
 */
function getSelectedChatsForCurrentCharacter() {
    const key = getCurrentCharacterKey();
    return key ? (getSetting('selectedChatsByCharacter')[key] || []) : [];
}

function setSelectedChatsForCurrentCharacter(chats) {
    const key = getCurrentCharacterKey();
    if (!key) return;
    const allSelected = getSetting('selectedChatsByCharacter') || {};
    allSelected[key] = chats;
    setSetting('selectedChatsByCharacter', allSelected);
}

/**
 * 統一的聊天資料讀取 API
 */
async function fetchChatData(chatFileName) {
    if (this_chid === undefined && !selected_group) return null;
    
    try {
        const options = {
            method: 'POST',
            headers: getRequestHeaders(),
        };
        
        if (selected_group) {
            options.body = JSON.stringify({ id: chatFileName });
            const response = await fetch('/api/chats/group/get', options);
            return response.ok ? await response.json() : null;
        } else {
            const character = characters[this_chid];
            options.body = JSON.stringify({
                ch_name: character.name,
                file_name: chatFileName.replace('.jsonl', ''),
                avatar_url: character.avatar
            });
            const response = await fetch('/api/chats/get', options);
            return response.ok ? await response.json() : null;
        }
    } catch (error) {
        console.error('Error fetching chat data:', error);
        return null;
    }
}

/**
 * 統一的聊天資料儲存 API
 */
async function saveChatData(chatFileName, chatData) {
    try {
        const options = {
            method: 'POST',
            headers: getRequestHeaders(),
        };
        
        if (selected_group) {
            options.body = JSON.stringify({ id: chatFileName, chat: chatData });
            const response = await fetch('/api/chats/group/save', options);
            return response.ok;
        } else {
            const character = characters[this_chid];
            options.body = JSON.stringify({
                ch_name: character.name,
                file_name: chatFileName.replace('.jsonl', ''),
                chat: chatData,
                avatar_url: character.avatar,
            });
            const response = await fetch('/api/chats/save', options);
            return response.ok;
        }
    } catch (error) {
        console.error('Error saving chat data:', error);
        return false;
    }
}

// ========== 書籤核心功能 ==========

/**
 * 取得當前聊天的書籤
 * 只返回明確屬於當前聊天的書籤（originChatFileName 與當前聊天檔案名稱相同）
 * 
 * 注意：此函式假設 cleanupInheritedBookmarks() 已在聊天載入時執行，
 * 因此所有有效書籤都應該已經有正確的 originChatFileName。
 * 對於分支聊天，只會返回在該分支中創建的書籤。
 */
function getCurrentChatBookmarks() {
    if (!chat_metadata) return [];
    if (!chat_metadata.chat_bookmarks) {
        chat_metadata.chat_bookmarks = [];
    }
    
    const currentChatFileName = getCurrentChatFileName();
    if (!currentChatFileName) return [];
    
    // 過濾出屬於當前聊天的書籤
    // 書籤有效條件：
    // 1. 對於有 main_chat 的分支聊天：必須 originChatFileName === currentChatFileName
    // 2. 對於主聊天：書籤沒有 originChatFileName（舊版書籤，向下相容）或 originChatFileName === currentChatFileName
    if (chat_metadata.main_chat) {
        // 分支聊天：嚴格匹配
        return chat_metadata.chat_bookmarks.filter(bookmark => 
            bookmark.originChatFileName === currentChatFileName
        );
    } else {
        // 主聊天：允許舊版書籤
        return chat_metadata.chat_bookmarks.filter(bookmark => 
            !bookmark.originChatFileName || bookmark.originChatFileName === currentChatFileName
        );
    }
}

/**
 * 取得當前聊天的原始書籤陣列（不過濾）
 * 用於內部操作，如清理繼承的書籤
 */
function getCurrentChatBookmarksRaw() {
    if (!chat_metadata) return [];
    return chat_metadata.chat_bookmarks || (chat_metadata.chat_bookmarks = []);
}

/**
 * 清理從其他聊天繼承來的書籤
 * 當偵測到聊天是從分支創建的，會自動清理不屬於此聊天的書籤
 * 
 * 分支創建邏輯說明：
 * 當 SillyTavern 創建分支時，會複製 chat_metadata（包含 chat_bookmarks），
 * 並設置 chat_metadata.main_chat 指向原始聊天。
 * 因此我們可以通過 main_chat 的存在來判斷這是否為分支聊天。
 */
async function cleanupInheritedBookmarks() {
    if (!chat_metadata || !chat_metadata.chat_bookmarks) return;
    
    const currentChatFileName = getCurrentChatFileName();
    if (!currentChatFileName) return;
    
    const rawBookmarks = chat_metadata.chat_bookmarks;
    let needsSave = false;
    
    // 情況1：這是一個分支聊天（有 main_chat），需要清理所有來自父聊天的書籤
    // 分支聊天不應該繼承任何書籤，因為分支後的訊息 ID 相同但內容可能完全不同
    if (chat_metadata.main_chat) {
        // 找出需要清理的書籤：
        // - 來自其他聊天的書籤（originChatFileName 不同）
        // - 或者是沒有 originChatFileName 的舊版書籤（這些是從父聊天複製過來的）
        const bookmarksToRemove = rawBookmarks.filter(b => {
            // 如果有 originChatFileName 且是當前聊天的，保留
            if (b.originChatFileName === currentChatFileName) return false;
            // 其他情況都清理（包括沒有 originChatFileName 或 originChatFileName 不同的）
            return true;
        });
        
        if (bookmarksToRemove.length > 0) {
            console.log(`Chat Bookmarks: 分支聊天偵測到 ${bookmarksToRemove.length} 個繼承的書籤，正在清理...`);
            chat_metadata.chat_bookmarks = rawBookmarks.filter(b => 
                b.originChatFileName === currentChatFileName
            );
            needsSave = true;
        }
    } 
    // 情況2：這是主聊天，為舊版書籤補上 originChatFileName
    else {
        const oldBookmarks = rawBookmarks.filter(b => !b.originChatFileName);
        if (oldBookmarks.length > 0) {
            console.log(`Chat Bookmarks: 為 ${oldBookmarks.length} 個舊版書籤補上 originChatFileName`);
            oldBookmarks.forEach(b => {
                b.originChatFileName = currentChatFileName;
            });
            needsSave = true;
        }
        
        // 也清理任何不屬於當前聊天的書籤（可能是異常情況）
        const inheritedBookmarks = rawBookmarks.filter(b => 
            b.originChatFileName && b.originChatFileName !== currentChatFileName
        );
        if (inheritedBookmarks.length > 0) {
            console.log(`Chat Bookmarks: 清理 ${inheritedBookmarks.length} 個不屬於此聊天的書籤`);
            chat_metadata.chat_bookmarks = rawBookmarks.filter(b => 
                !b.originChatFileName || b.originChatFileName === currentChatFileName
            );
            needsSave = true;
        }
    }
    
    if (needsSave) {
        await saveChatConditional();
        console.log(`Chat Bookmarks: 書籤清理完成`);
    }
}

/**
 * 建立書籤資料物件 (共用邏輯)
 * @param {object} message - 訊息物件
 * @param {number} messageId - 訊息 ID
 * @param {string} originChatFileName - 創建書籤時的聊天檔案名稱（用於識別書籤來源）
 */
function createBookmarkData(message, messageId, originChatFileName = null) {
    return {
        messageId,
        text: (message.mes || '').substring(0, 1500),
        timestamp: Date.now(),
        sender: message.name || (message.is_user ? 'You' : 'Character'),
        isUser: message.is_user || false,
        customName: '', // 書籤自訂名稱
        originChatFileName: originChatFileName || getCurrentChatFileName(), // 書籤創建時的聊天檔案名稱
    };
}

/**
 * 更新書籤的自訂名稱
 */
async function updateBookmarkName(messageId, newName, chatFileName = null) {
    const currentChatName = getCurrentChatFileName();
    
    if (!chatFileName || chatFileName === currentChatName) {
        // 使用過濾後的書籤來找到正確的書籤（物件引用仍然有效）
        const bookmarks = getCurrentChatBookmarks();
        const bookmark = bookmarks.find(b => b.messageId === messageId);
        if (bookmark) {
            bookmark.customName = newName;
            await saveChatConditional();
        }
    } else {
        const chatData = await fetchChatData(chatFileName);
        if (!chatData || !Array.isArray(chatData) || chatData.length === 0) return;
        
        const metadata = chatData[0].chat_metadata || {};
        const bookmarks = metadata.chat_bookmarks || [];
        const bookmark = bookmarks.find(b => b.messageId === messageId);
        if (bookmark) {
            bookmark.customName = newName;
            chatData[0].chat_metadata = metadata;
            await saveChatData(chatFileName, chatData);
        }
    }
}

/**
 * 根據搜索關鍵字過濾書籤
 */
function filterBookmarksBySearch(bookmarks, query) {
    if (!query || query.trim() === '') return bookmarks;
    
    const lowerQuery = query.toLowerCase().trim();
    return bookmarks.filter(b => {
        if (b.customName && b.customName.toLowerCase().includes(lowerQuery)) return true;
        if (b.text && b.text.toLowerCase().includes(lowerQuery)) return true;
        if (b.sender && b.sender.toLowerCase().includes(lowerQuery)) return true;
        return false;
    });
}

/**
 * 檢查訊息是否已被書籤
 */
function isMessageBookmarked(messageId) {
    return getCurrentChatBookmarks().some(b => b.messageId === messageId);
}

/**
 * 新增書籤
 */
async function addBookmark(messageId) {
    if (messageId < 0 || messageId >= chat.length) {
        toastr.warning(t('toast_invalidMessageId'), t('toast_bookmark'));
        return false;
    }

    if (isMessageBookmarked(messageId)) {
        toastr.info(t('toast_alreadyBookmarked'), t('toast_bookmark'));
        return false;
    }

    // 直接操作原始書籤陣列，而非過濾後的陣列
    const rawBookmarks = getCurrentChatBookmarksRaw();
    rawBookmarks.push(createBookmarkData(chat[messageId], messageId));

    updateBookmarkIcon(messageId, true);
    await saveChatConditional();

    if (getSetting('showNotifications')) {
        toastr.success(t('toast_bookmarkAdded'), t('toast_bookmark'));
    }
    return true;
}

/**
 * 移除書籤
 */
async function removeBookmark(messageId) {
    // 使用原始書籤陣列來移除
    const rawBookmarks = getCurrentChatBookmarksRaw();
    const currentChatFileName = getCurrentChatFileName();
    
    // 找到屬於當前聊天的書籤
    // 對於分支聊天，必須嚴格匹配 originChatFileName
    // 對於主聊天，允許舊版書籤（沒有 originChatFileName）
    let index;
    if (chat_metadata.main_chat) {
        // 分支聊天：嚴格匹配
        index = rawBookmarks.findIndex(b => 
            b.messageId === messageId && 
            b.originChatFileName === currentChatFileName
        );
    } else {
        // 主聊天：允許舊版書籤
        index = rawBookmarks.findIndex(b => 
            b.messageId === messageId && 
            (!b.originChatFileName || b.originChatFileName === currentChatFileName)
        );
    }

    if (index === -1) {
        toastr.warning(t('toast_bookmarkNotFound'), t('toast_bookmark'));
        return;
    }

    rawBookmarks.splice(index, 1);
    updateBookmarkIcon(messageId, false);
    await saveChatConditional();

    if (getSetting('showNotifications')) {
        toastr.info(t('toast_bookmarkRemoved'), t('toast_bookmark'));
    }
}

/**
 * 為其他聊天檔案添加書籤
 */
async function addBookmarkToExternalChat(chatFileName, messageId) {
    const chatData = await fetchChatData(chatFileName);
    if (!chatData) { toastr.error(t('toast_unableToLoadChat'), t('toast_bookmark')); return false; }
    
    const messages = Array.isArray(chatData) ? chatData.slice(1) : [];
    if (messageId >= messages.length) { toastr.warning(t('toast_messageOutOfRange'), t('toast_bookmark')); return false; }

    const metadata = chatData[0].chat_metadata || {};
    const bookmarks = metadata.chat_bookmarks || [];
    
    if (bookmarks.some(b => b.messageId === messageId)) { 
        toastr.info(t('toast_alreadyBookmarked'), t('toast_bookmark')); 
        return false; 
    }

    // 傳入 chatFileName 作為書籤的來源聊天檔案名稱
    bookmarks.push(createBookmarkData(messages[messageId], messageId, chatFileName));
    metadata.chat_bookmarks = bookmarks;
    chatData[0].chat_metadata = metadata;

    const success = await saveChatData(chatFileName, chatData);
    if (success && getSetting('showNotifications')) {
        toastr.success(t('toast_bookmarkAdded'), t('toast_bookmark'));
    }
    return success;
}

/**
 * 從其他聊天檔案中移除書籤
 */
async function removeBookmarkFromChat(chatFileName, messageId) {
    const chatData = await fetchChatData(chatFileName);
    if (!chatData || !Array.isArray(chatData) || chatData.length === 0) {
        toastr.error(t('toast_unableToLoadChat'), t('toast_bookmark'));
        return false;
    }

    const metadata = chatData[0].chat_metadata || {};
    const bookmarks = metadata.chat_bookmarks || [];
    const index = bookmarks.findIndex(b => b.messageId === messageId);

    if (index === -1) {
        toastr.warning(t('toast_bookmarkNotFound'), t('toast_bookmark'));
        return false;
    }

    bookmarks.splice(index, 1);
    metadata.chat_bookmarks = bookmarks;
    chatData[0].chat_metadata = metadata;

    const success = await saveChatData(chatFileName, chatData);
    if (success && getSetting('showNotifications')) {
        toastr.info(t('toast_bookmarkRemoved'), t('toast_bookmark'));
    }
    return success;
}

/**
 * 排序書籤
 * @param {Array} bookmarks
 * @param {string} sortOrder
 */
function sortBookmarks(bookmarks, sortOrder) {
    if (!bookmarks || bookmarks.length === 0) return bookmarks;
    
    const sorted = [...bookmarks];
    switch (sortOrder) {
        case 'messageAsc':
            sorted.sort((a, b) => a.messageId - b.messageId);
            break;
        case 'messageDesc':

            sorted.sort((a, b) => b.messageId - a.messageId);
            break;
        case 'bookmarkNew':

            sorted.sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'bookmarkOld':

            sorted.sort((a, b) => a.timestamp - b.timestamp);
            break;
        default:
            sorted.sort((a, b) => a.messageId - b.messageId);
    }
    return sorted;
}

// ========== Tag 功能 ==========

/**
 * 取得所有自訂標籤
 */
function getCustomTags() {
    return getSetting('customTags') || [];
}

/**
 * 儲存自訂標籤
 */
function saveCustomTags(tags) {
    setSetting('customTags', tags);
}

/**
 * 新增自訂標籤
 * @param {string} name
 * @param {string} color
 * @param {string} scope
 */
function addCustomTag(name, color = '#ffe084', scope = 'global') {
    const tags = getCustomTags();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newTag = { id, name, color, scope };
    
    // 如果是角色專屬標籤，記錄當前角色的 key
    if (scope === 'character') {
        newTag.characterKey = getCurrentCharacterKey();
    }
    
    tags.push(newTag);
    saveCustomTags(tags);
    return newTag;
}

/**
 * 更新標籤的 scope 屬性
 */
function updateTagScope(tagId, newScope) {
    const tags = getCustomTags();
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
        tag.scope = newScope;
        if (newScope === 'character') {
            tag.characterKey = getCurrentCharacterKey();
        } else {
            delete tag.characterKey;
        }
        saveCustomTags(tags);
    }
}

/**
 * 取得對當前角色可見的標籤
 */
function getVisibleTags() {
    const tags = getCustomTags();
    const currentCharKey = getCurrentCharacterKey();
    
    return tags.filter(tag => {
        if (!tag.scope || tag.scope === 'global') return true;
        if (tag.scope === 'character' && tag.characterKey === currentCharKey) return true;
        return false;
    });
}

/**
 * 取得標籤的範圍標記文字
 */
function getTagScopeLabel(tag) {
    if (!tag.scope || tag.scope === 'global') {
        return t('tag_scopeGlobal');
    }
    return t('tag_scopeCharacter');
}

/**
 * 刪除自訂標籤 (同時移除所有書籤上的此標籤)
 */
async function deleteCustomTag(tagId) {

    const tags = getCustomTags();
    const index = tags.findIndex(t => t.id === tagId);
    if (index > -1) {
        tags.splice(index, 1);
        saveCustomTags(tags);
    }
    
    const activeFilters = getSetting('activeTagFilters') || [];
    const filterIndex = activeFilters.indexOf(tagId);
    if (filterIndex > -1) {
        activeFilters.splice(filterIndex, 1);
        setSetting('activeTagFilters', activeFilters);
    }
    
    // 使用原始書籤陣列來移除所有書籤上的此標籤
    const rawBookmarks = getCurrentChatBookmarksRaw();
    rawBookmarks.forEach(b => {
        if (b.tags && Array.isArray(b.tags)) {
            const tagIndex = b.tags.indexOf(tagId);
            if (tagIndex > -1) {
                b.tags.splice(tagIndex, 1);
            }
        }
    });
    await saveChatConditional();
}

/**
 * 為書籤添加標籤
 */
async function addTagToBookmark(messageId, tagId, chatFileName = null) {
    const currentChatName = getCurrentChatFileName();
    
    if (!chatFileName || chatFileName === currentChatName) {
        const bookmarks = getCurrentChatBookmarks();
        const bookmark = bookmarks.find(b => b.messageId === messageId);
        if (bookmark) {
            if (!bookmark.tags) bookmark.tags = [];
            if (!bookmark.tags.includes(tagId)) {
                bookmark.tags.push(tagId);
                await saveChatConditional();
            }
        }
    } else {
        const chatData = await fetchChatData(chatFileName);
        if (!chatData || !Array.isArray(chatData) || chatData.length === 0) return;
        
        const metadata = chatData[0].chat_metadata || {};
        const bookmarks = metadata.chat_bookmarks || [];
        const bookmark = bookmarks.find(b => b.messageId === messageId);
        if (bookmark) {
            if (!bookmark.tags) bookmark.tags = [];
            if (!bookmark.tags.includes(tagId)) {
                bookmark.tags.push(tagId);
                chatData[0].chat_metadata = metadata;
                await saveChatData(chatFileName, chatData);
            }
        }
    }
}

/**
 * 從書籤移除標籤
 */
async function removeTagFromBookmark(messageId, tagId, chatFileName = null) {
    const currentChatName = getCurrentChatFileName();
    
    if (!chatFileName || chatFileName === currentChatName) {
        const bookmarks = getCurrentChatBookmarks();
        const bookmark = bookmarks.find(b => b.messageId === messageId);
        if (bookmark && bookmark.tags) {
            const index = bookmark.tags.indexOf(tagId);
            if (index > -1) {
                bookmark.tags.splice(index, 1);
                await saveChatConditional();
            }
        }
    } else {
        const chatData = await fetchChatData(chatFileName);
        if (!chatData || !Array.isArray(chatData) || chatData.length === 0) return;
        
        const metadata = chatData[0].chat_metadata || {};
        const bookmarks = metadata.chat_bookmarks || [];
        const bookmark = bookmarks.find(b => b.messageId === messageId);
        if (bookmark && bookmark.tags) {
            const index = bookmark.tags.indexOf(tagId);
            if (index > -1) {
                bookmark.tags.splice(index, 1);
                chatData[0].chat_metadata = metadata;
                await saveChatData(chatFileName, chatData);
            }
        }
    }
}

/**
 * 根據標籤篩選書籤 (支援多選)
 */
function filterBookmarksByTag(bookmarks, tagFilters) {
    if (!tagFilters || tagFilters.length === 0) return bookmarks;
    return bookmarks.filter(b => b.tags && b.tags.some(t => tagFilters.includes(t)));
}

/**
 * 取得書籤的標籤 HTML
 */
function getBookmarkTagsHtml(bookmark, chatFileName) {
    if (!bookmark.tags || bookmark.tags.length === 0) return '';
    
    const customTags = getCustomTags();
    const tagsHtml = bookmark.tags
        .map(tagId => {
            const tag = customTags.find(t => t.id === tagId);
            if (!tag) return '';
            return `
                <span class="bookmark-tag" data-tagid="${tag.id}" data-chat="${escapeHtml(chatFileName)}" data-msgid="${bookmark.messageId}" style="--tag-color: ${tag.color};">
                    <span class="tag-name">${escapeHtml(tag.name)}</span>
                    <span class="tag-remove" title="${t('btn_removeTag')}"><i class="fa-solid fa-xmark"></i></span>
                </span>
            `;
        })
        .filter(html => html)
        .join('');
    
    return tagsHtml ? `<div class="bookmark-tags-container">${tagsHtml}</div>` : '';
}

/**
 * 切換書籤狀態
 */
async function toggleBookmark(messageId) {
    if (isMessageBookmarked(messageId)) {
        await removeBookmark(messageId);
    } else {
        await addBookmark(messageId);
    }
}

/**
 * 取得特定聊天的書籤
 */
async function getChatBookmarks(chatFileName) {
    const chatData = await fetchChatData(chatFileName);
    if (!chatData || !Array.isArray(chatData) || chatData.length === 0) return [];
    
    const bookmarks = chatData[0]?.chat_metadata?.chat_bookmarks || [];
    return bookmarks.map(b => ({ ...b, chatFileName }));
}

// ========== UI 更新 ==========

/**
 * 更新訊息上的書籤圖示
 */
function updateBookmarkIcon(messageId, isBookmarked) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) return;

    const starIcon = messageElement.find('.chat-bookmark-star');
    starIcon.toggleClass('bookmarked', isBookmarked);
}

/**
 * 為訊息添加書籤按鈕
 */
function addBookmarkButtonToMessage(messageElement) {
    const mesId = parseInt($(messageElement).attr('mesid'));
    if (isNaN(mesId) || $(messageElement).find('.chat-bookmark-star').length > 0) return;

    const isBookmarked = isMessageBookmarked(mesId);
    const iconType = getSetting('bookmarkIcon');
    const icon = BOOKMARK_ICONS[iconType] || BOOKMARK_ICONS.star;
    const bookmarkButton = $(`
        <div class="mes_button chat-bookmark-star ${isBookmarked ? 'bookmarked' : ''}" title="${t('btn_clickToToggle')}">
            <span class="bookmark-icon-svg bookmark-icon-regular">${icon.regular}</span>
            <span class="bookmark-icon-svg bookmark-icon-solid">${icon.solid}</span>
        </div>
    `);

    $(messageElement).find('.extraMesButtons').prepend(bookmarkButton);
}

/**
 * 為所有訊息添加書籤按鈕
 */
function addBookmarkButtonsToAllMessages() {
    $('#chat .mes').each(function() {
        addBookmarkButtonToMessage(this);
    });
}

/**
 * 更新所有書籤按鈕圖示
 * @param {boolean} updateSvg
 */
function updateAllBookmarkIcons(updateSvg = false) {
    const iconType = getSetting('bookmarkIcon');
    const icon = BOOKMARK_ICONS[iconType] || BOOKMARK_ICONS.star;
    
    $('#chat .mes').each(function() {
        const mesId = parseInt($(this).attr('mesid'));
        if (!isNaN(mesId)) {
            const isBookmarked = isMessageBookmarked(mesId);
            const starIcon = $(this).find('.chat-bookmark-star');
            starIcon.toggleClass('bookmarked', isBookmarked);
            
            if (updateSvg) {
                starIcon.find('.bookmark-icon-regular').html(icon.regular);
                starIcon.find('.bookmark-icon-solid').html(icon.solid);
            }
        }
    });
}

/**
 * 更新擴展選單圖示
 */
function updateExtensionMenuIcon() {
    $('#chat-bookmarks-menu-btn .bookmark-menu-icon').html(getBookmarkIconSvg(true));
}

/**
 * 更新面板中所有書籤相關圖示
 */
function updatePanelIcons(dlg) {
    const solidIcon = getBookmarkIconSvg(true);
    const regularIcon = getBookmarkIconSvg(false);
    dlg.find('.header-icon, .bookmark-quick-icon, .bookmark-delete-icon').html(solidIcon);
    dlg.find('.bookmark-empty-icon').html(regularIcon);
}

// ========== 導航與跳轉 ==========

/**
 * 載入更多訊息直到目標訊息出現
 */
async function loadMessagesUntilTarget(targetMessageId, maxAttempts = 50) {
    const { showMoreMessages } = await import("../../../../script.js");
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const messageElement = $(`#chat .mes[mesid="${targetMessageId}"]`);
        if (messageElement.length) {
            return true;
        }
        
        const showMoreButton = $('#show_more_messages');
        if (!showMoreButton.length) {

            return false;
        }
        
        await showMoreMessages();
        await delay(100);
    }
    
    return false;
}

/**
 * 滾動到指定訊息
 */
async function scrollToMessage(messageId) {
    let messageElement = $(`#chat .mes[mesid="${messageId}"]`);
    
    if (!messageElement.length) {
        toastr.info(t('toast_loadingMoreMessages'), t('toast_bookmark'), { timeOut: 2000 });
        const loaded = await loadMessagesUntilTarget(messageId);
        if (!loaded) {
            toastr.warning(t('toast_messageNotFound'), t('toast_bookmark'));
            return;
        }
        messageElement = $(`#chat .mes[mesid="${messageId}"]`);
    }
    
    if (!messageElement.length) {
        toastr.warning(t('toast_messageNotFoundSimple'), t('toast_bookmark'));
        return;
    }
    
    messageElement[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    flashHighlight(messageElement);
}

/**
 * 載入聊天並跳轉到書籤
 */
async function loadChatAndJump(chatFileName, messageId) {
    const currentChatName = getCurrentChatFileName();

    const warningToast = toastr.warning(t('toast_jumpWarning'), t('toast_jumpTitle'), {
        timeOut: 0, extendedTimeOut: 0, tapToDismiss: false, closeButton: false, progressBar: false
    });

    if (chatFileName === currentChatName) {
        try {
            await scrollToMessage(messageId);
            toastr.clear(warningToast);
            toastr.success(t('toast_jumpComplete'), t('toast_bookmark'));
        } catch (error) {
            toastr.clear(warningToast);
            toastr.error(t('toast_jumpFailed') + error.message, t('toast_bookmark'));
        }
        return;
    }

    try {
        await saveChatConditional();

        if (selected_group) {
            await openGroupChat(selected_group, chatFileName);
        } else {
            const { openCharacterChat } = await import("../../../../script.js");
            await openCharacterChat(chatFileName.replace('.jsonl', ''));
        }

        await delay(500);
        await waitUntilCondition(() => chat.length > 0, debounce_timeout.extended, 100);

        await scrollToMessage(messageId);
        toastr.clear(warningToast);
        toastr.success(t('toast_jumpComplete'), t('toast_bookmark'));
    } catch (error) {
        console.error('Error loading chat:', error);
        toastr.clear(warningToast);
        toastr.error(t('toast_jumpFailed') + error.message, t('toast_bookmark'));
    }
}

// ========== 預覽功能 ==========

/**
 * 格式化訊息文字 - 支援 Markdown 格式和引號樣式
 * 所有生成的 HTML 都用 protect() 保護以確保正確顯示
 */
function formatMessageText(text) {
    if (!text) return '';
    
    const protectedBlocks = [];
    let blockIndex = 0;
    
    const protect = (content) => {
        const placeholder = `\uE000${blockIndex++}\uE001`;
        protectedBlocks.push({ placeholder, content });
        return placeholder;
    };
    
    let formatted = text;
    
    formatted = formatted.replace(/<details[^>]*>[\s\S]*?<\/details>/gi, (match) => {
        return protect(`<div class="preview-details-wrapper">${match}</div>`);
    });
    
    formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const escapedCode = escapeHtml(code.trim());
        return protect(`<div class="preview-code-block"><code>${escapedCode}</code></div>`);
    });
    
    formatted = formatted.replace(/`([^`\n]+)`/g, (match, code) => {
        const escapedCode = escapeHtml(code);
        return protect(`<span class="preview-inline-code">${escapedCode}</span>`);
    });
    
    formatted = escapeHtml(formatted);
    
    formatted = formatted.replace(/\n/g, '<br>');
    
    formatted = formatted.replace(/(?:^|<br>)([-*]{3,})(?=<br>|$)/g, (match, line) => {
        return protect(`<hr class="preview-hr">`);
    });
    
    formatted = formatted.replace(/(?:^|(<br>))(#{1,6})\s+(.+?)(?=<br>|$)/g, (match, br, hashes, content) => {
        const level = hashes.length;
        const prefix = br || '';
        return prefix + protect(`<div class="preview-heading preview-h${level}">${content}</div>`);
    });
    
    formatted = formatted.replace(/(?:^|(<br>))&gt;\s?(.+?)(?=<br>|$)/g, (match, br, content) => {
        const prefix = br || '';
        return prefix + protect(`<div class="preview-blockquote">${content}</div>`);
    });
    
    formatted = formatted.replace(/(?:^|(<br>))[-*]\s+(.+?)(?=<br>|$)/g, (match, br, content) => {
        const prefix = br || '';
        return prefix + protect(`<div class="preview-list-item">• ${content}</div>`);
    });
    
    formatted = formatted.replace(/(?:^|(<br>))(\d+)\.\s+(.+?)(?=<br>|$)/g, (match, br, num, content) => {
        const prefix = br || '';
        return prefix + protect(`<div class="preview-list-item preview-list-ordered">${num}. ${content}</div>`);
    });
    
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
        return protect(`<strong>${content}</strong>`);
    });
    
    formatted = formatted.replace(/__([^_]+)__/g, (match, content) => {
        return protect(`<u class="underline-text">${content}</u>`);
    });
    
    formatted = formatted.replace(/\*([^*\n]+)\*/g, (match, content) => {
        return protect(`<em class="action-text">${content}</em>`);
    });
    
    formatted = formatted.replace(/「([^」]+)」/g, (match, content) => {
        return protect(`<span class="dialogue-text">「${content}」</span>`);
    });

    formatted = formatted.replace(/『([^』]+)』/g, (match, content) => {
        return protect(`<span class="dialogue-text">『${content}』</span>`);
    });

    formatted = formatted.replace(/《([^》]+)》/g, (match, content) => {
        return protect(`<span class="dialogue-text">《${content}》</span>`);
    });

    formatted = formatted.replace(/«([^»]+)»/g, (match, content) => {
        return protect(`<span class="dialogue-text">«${content}»</span>`);
    });

    formatted = formatted.replace(/"([^"]+)"/g, (match, content) => {
        return protect(`<span class="dialogue-text">"${content}"</span>`);
    });
 
    formatted = formatted.replace(/&quot;([^&]+?)&quot;/g, (match, content) => {
        return protect(`<span class="dialogue-text">"${content}"</span>`);
    });
    
    formatted = formatted.replace(/  /g, '&nbsp; ');
    
    protectedBlocks.forEach(({ placeholder, content }) => {
        formatted = formatted.replace(placeholder, content);
    });
    
    return formatted;
}

/**
 * 取得訊息預覽
 */
function getMessagePreview(messageId, startOffset, endOffset, messages = null) {
    const msgArray = messages || chat;
    const startId = Math.max(0, messageId - startOffset);
    const endId = Math.min(msgArray.length - 1, messageId + endOffset);

    const preview = [];
    for (let i = startId; i <= endId; i++) {
        const msg = msgArray[i];
        if (!msg) continue;
        preview.push({
            id: i,
            name: msg.name || (msg.is_user ? 'You' : 'Character'),
            text: msg.mes,
            isUser: msg.is_user || false,
            isTarget: i === messageId,
        });
    }

    return {
        messages: preview,
        canLoadMore: { up: startId > 0, down: endId < msgArray.length - 1 },
        bounds: { start: startId, end: endId }
    };
}

/**
 * 建立預覽訊息 HTML
 */
function buildPreviewMessagesHtml(messages) {
    return messages.map(msg => `
        <div class="bookmark-preview-message ${msg.isTarget ? 'target-message' : ''} ${msg.isUser ? 'user-message' : 'char-message'}" data-msgid="${msg.id}">
            <div class="preview-message-header">
                <span class="preview-sender ${msg.isUser ? 'user-sender' : 'char-sender'}">${escapeHtml(msg.name)}</span>
                <span class="preview-msg-id">#${msg.id}</span>
            </div>
            <div class="preview-text">${formatMessageText(msg.text)}</div>
        </div>
    `).join('');
}

/**
 * 顯示書籤預覽彈窗
 */
async function showBookmarkPreview(messageId, chatFileName) {
    const currentChatName = getCurrentChatFileName();
    const range = getSetting('previewRange');
    let previewData, chatMessages = null;

    currentPreviewState = { chatFileName, messageId, startOffset: 0, endOffset: range, chatData: null };

    if (chatFileName === currentChatName) {
        previewData = getMessagePreview(messageId, 0, range);
        chatMessages = chat;
    } else {
        const chatData = await fetchChatData(chatFileName);
        if (chatData) {
            chatMessages = Array.isArray(chatData) ? chatData.slice(1) : [];
            currentPreviewState.chatData = chatMessages;
            previewData = getMessagePreview(messageId, 0, range, chatMessages);
        }
    }

    if (!previewData || previewData.messages.length === 0) {
        toastr.warning(t('toast_unableToPreview'), t('toast_bookmark'));
        return;
    }

    const popupContent = `
        <div class="bookmark-preview-container">
            <div class="bookmark-preview-header">
                <span class="preview-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="20" height="20"><path fill="currentColor" d="M249.6 471.5c10.8 3.8 22.4-4.1 22.4-15.5V78.6c0-4.2-1.6-8.4-5-11C247.4 52 215.2 32 176 32C114.4 32 68.2 67 48 80.6V432c18.2-12.4 56.6-32 128-32 26.7 0 48.6 4.3 66.6 12.1c4 1.7 6.4 5.9 7 10.4zm27.4 0c.6-4.5 3-8.7 7-10.4c18-7.8 39.9-12.1 66.6-12.1c71.4 0 109.8 19.6 128 32V80.6c-20.2-13.6-66.4-48.6-128-48.6-39.2 0-71.4 20-91 35.6c-3.4 2.6-5 6.8-5 11v377.4c0 11.4 11.6 19.3 22.4 15.5z"/></svg>
                    ${t('panel_messagePreview')}
                </span>
                <span class="preview-chat-name">${escapeHtml(chatFileName.replace('.jsonl', ''))}</span>
            </div>
            <div class="bookmark-preview-load-more load-more-up ${previewData.canLoadMore.up ? '' : 'hidden'}" data-direction="up">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16"><path fill="currentColor" d="M201.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 205.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"/></svg>
            </div>
            <div class="bookmark-preview-messages" data-total="${chatMessages ? chatMessages.length : chat.length}">
                ${buildPreviewMessagesHtml(previewData.messages)}
            </div>
            <div class="bookmark-preview-load-more load-more-down ${previewData.canLoadMore.down ? '' : 'hidden'}" data-direction="down">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16"><path fill="currentColor" d="M201.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 306.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>
            </div>
            <div class="bookmark-preview-actions">
                <button class="menu_button bookmark-jump-btn" data-chat="${chatFileName}" data-msgid="${messageId}">
                    <i class="fa-solid fa-arrow-right"></i> ${t('panel_jumpToMessage')}
                </button>
            </div>
        </div>
    `;

    const popup = new Popup(popupContent, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: t('btn_close') });
    const dlg = $(popup.dlg);

    dlg.find('.bookmark-jump-btn').on('click', async function() {
        popup.complete(0);
        await loadChatAndJump($(this).data('chat'), $(this).data('msgid'));
    });

    dlg.find('.bookmark-preview-load-more').on('click', async function() {
        const direction = $(this).data('direction');
        const messagesContainer = dlg.find('.bookmark-preview-messages');
        const msgArray = currentPreviewState.chatData || chat;
        const containerElement = messagesContainer[0];

        let scrollRefMsgId = null;
        let scrollRefOffset = 0;
        
        if (direction === 'up') {

            const allMsgs = messagesContainer.find('.bookmark-preview-message');
            for (let i = 0; i < allMsgs.length; i++) {
                const msg = allMsgs[i];
                const rect = msg.getBoundingClientRect();
                const containerRect = containerElement.getBoundingClientRect();
                if (rect.top >= containerRect.top && rect.top < containerRect.bottom) {
                    scrollRefMsgId = $(msg).data('msgid');
                    scrollRefOffset = rect.top - containerRect.top;
                    break;
                }
            }
            currentPreviewState.startOffset += 5;
            
            const newPreviewData = getMessagePreview(currentPreviewState.messageId, currentPreviewState.startOffset, currentPreviewState.endOffset, msgArray);
            messagesContainer.html(buildPreviewMessagesHtml(newPreviewData.messages));
            dlg.find('.load-more-up').toggleClass('hidden', !newPreviewData.canLoadMore.up);
            dlg.find('.load-more-down').toggleClass('hidden', !newPreviewData.canLoadMore.down);

            if (scrollRefMsgId !== null) {
                const refMsg = messagesContainer.find(`[data-msgid="${scrollRefMsgId}"]`);
                if (refMsg.length) {
                    const newTop = refMsg[0].offsetTop - scrollRefOffset;
                    containerElement.scrollTop = newTop;
                }
            }
        } else {

            const scrollTop = containerElement.scrollTop;
            currentPreviewState.endOffset += 5;
            
            const newPreviewData = getMessagePreview(currentPreviewState.messageId, currentPreviewState.startOffset, currentPreviewState.endOffset, msgArray);
            messagesContainer.html(buildPreviewMessagesHtml(newPreviewData.messages));
            dlg.find('.load-more-up').toggleClass('hidden', !newPreviewData.canLoadMore.up);
            dlg.find('.load-more-down').toggleClass('hidden', !newPreviewData.canLoadMore.down);
            
            containerElement.scrollTop = scrollTop;
        }
    });

    await popup.show();
    
    setTimeout(() => {
        const messagesContainer = dlg.find('.bookmark-preview-messages')[0];
        if (messagesContainer) messagesContainer.scrollTop = 0;
    }, 100);
    
    currentPreviewState = { chatFileName: '', messageId: 0, startOffset: 0, endOffset: 0, chatData: null };
}

/**
 * 顯示快速預覽 (簡潔版)
 */
async function showQuickPreview(messageId, chatFileName) {
    const currentChatName = getCurrentChatFileName();
    let message = null;
    let sender = '';
    let isUser = false;
    
    const loadingToast = toastr.info(t('toast_previewLoading', messageId), t('toast_bookmark'), {
        timeOut: 0, extendedTimeOut: 0, tapToDismiss: false, closeButton: false, progressBar: true
    });
    
    try {
        if (chatFileName === currentChatName) {
            if (messageId >= chat.length) {
                toastr.clear(loadingToast);
                toastr.warning(t('toast_messageOutOfRange'), t('toast_bookmark'));
                return;
            }
            message = chat[messageId];
            sender = message.name || (message.is_user ? 'You' : 'Character');
            isUser = message.is_user || false;
        } else {
            const chatData = await fetchChatData(chatFileName);
            if (!chatData || !Array.isArray(chatData)) {
                toastr.clear(loadingToast);
                toastr.error(t('toast_unableToLoadChat'), t('toast_bookmark'));
                return;
            }
            const messages = chatData.slice(1);
            if (messageId >= messages.length) {
                toastr.clear(loadingToast);
                toastr.warning(t('toast_messageOutOfRange'), t('toast_bookmark'));
                return;
            }
            message = messages[messageId];
            sender = message.name || (message.is_user ? 'You' : 'Character');
            isUser = message.is_user || false;
        }
        
        const formattedText = formatMessageText(message.mes || '');
    
        const previewContent = `
            <div class="quick-preview-container">
                <div class="quick-preview-header">
                    <span class="quick-preview-sender ${isUser ? 'user-sender' : 'char-sender'}">${escapeHtml(sender)}</span>
                    <span class="quick-preview-meta">#${messageId}</span>
                </div>
                <div class="quick-preview-text">${formattedText}</div>
            </div>
        `;
        
        toastr.clear(loadingToast);
        
        const popup = new Popup(previewContent, POPUP_TYPE.TEXT, '', { wide: true, okButton: t('btn_close') });
        await popup.show();
    } catch (error) {
        toastr.clear(loadingToast);
        toastr.error(t('toast_previewLoadFailed') + error.message, t('toast_bookmark'));
        console.error('Quick preview error:', error);
    }
}

// ========== 書籤面板 ==========

/**
 * 建立書籤項目 HTML
 */
function createBookmarkItemHtml(bookmark) {
    const senderIcon = bookmark.isUser ? 'fa-user' : 'fa-robot';
    const chatDisplayName = bookmark.chatFileName?.replace('.jsonl', '') || '';
    const lineClamp = getSetting('previewLineClamp');
    const tagsHtml = getBookmarkTagsHtml(bookmark, bookmark.chatFileName);
    const visibleTags = getVisibleTags();

    const existingTags = bookmark.tags || [];
    const availableTags = visibleTags.filter(tg => !existingTags.includes(tg.id));
    const addTagOptionsHtml = availableTags.length > 0 
        ? availableTags.map(tg => `<div class="add-tag-option" data-tagid="${tg.id}" style="--tag-color: ${tg.color};"><span class="tag-dot"></span>${escapeHtml(tg.name)}</div>`).join('')
        : `<div class="add-tag-empty">${t('panel_tagNoAvailable')}</div>`;

    const customName = bookmark.customName || '';
    const customNameHtml = `
        <span class="bookmark-custom-name-wrapper">
            <span class="bookmark-custom-name" data-chat="${escapeHtml(bookmark.chatFileName)}" data-msgid="${bookmark.messageId}">${customName ? escapeHtml(customName) : `<span class="custom-name-placeholder">${t('btn_customName')}</span>`}</span>
            <button class="bookmark-edit-name-btn" title="${t('btn_editName')}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em"><path fill="currentColor" d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1 0 32c0 8.8 7.2 16 16 16l32 0zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/></svg>
            </button>
            <input type="text" class="bookmark-name-input" value="${escapeHtml(customName)}" placeholder="${t('placeholder_customName')}" maxlength="50">
            <button class="bookmark-confirm-name-btn" title="${t('btn_confirm')}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path fill="currentColor" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>
            </button>
        </span>
    `;

    return `
        <div class="bookmark-item" data-chat="${escapeHtml(bookmark.chatFileName)}" data-msgid="${bookmark.messageId}">
            <div class="bookmark-item-icon"><i class="fa-solid ${senderIcon}"></i></div>
            <div class="bookmark-item-content">
                <div class="bookmark-item-header">
                    <span class="bookmark-item-sender">${escapeHtml(bookmark.sender)}</span>
                    ${customNameHtml}
                    <span class="bookmark-item-chat-name" title="${escapeHtml(chatDisplayName)}">
                        <i class="fa-regular fa-comment-dots"></i> ${escapeHtml(chatDisplayName)}
                    </span>
                </div>
                <div class="bookmark-item-text" style="-webkit-line-clamp: ${lineClamp}; line-clamp: ${lineClamp};">${escapeHtml(bookmark.text)}</div>
                <div class="bookmark-item-meta">#${bookmark.messageId} · ${new Date(bookmark.timestamp).toLocaleString()}</div>
            </div>
            <div class="bookmark-item-right">
                <div class="bookmark-item-actions">
                    <button class="menu_button bookmark-jump" title="${t('btn_jumpToMessage')}"><i class="fa-solid fa-arrow-right"></i></button>
                    <button class="menu_button bookmark-delete" title="${t('btn_removeBookmark')}">
                        <span class="bookmark-delete-icon">${getBookmarkIconSvg(true)}</span>
                    </button>
                </div>
                <div class="bookmark-item-tags-area">
                    ${tagsHtml}
                    <div class="bookmark-add-tag-wrapper">
                        <button class="bookmark-add-tag-btn" title="${t('btn_addTag')}"><i class="fa-solid fa-plus"></i></button>
                        <div class="bookmark-add-tag-dropdown">
                            ${addTagOptionsHtml}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 建立 Tab 書籤內容 HTML
 */
function createTabBookmarksHtml(bookmarks, chatFileName, searchQuery = '') {

    let filteredBookmarks = filterBookmarksBySearch(bookmarks, searchQuery);
    
    const activeTagFilters = getSetting('activeTagFilters') || [];
    filteredBookmarks = filterBookmarksByTag(filteredBookmarks, activeTagFilters);
    
    if (!filteredBookmarks || filteredBookmarks.length === 0) {
        let filterMessage;
        if (searchQuery && searchQuery.trim() !== '') {
            filterMessage = `<p>${t('empty_noSearchResults')}</p><p class="bookmark-hint">${t('empty_noSearchResultsHint')}</p>`;
        } else if (activeTagFilters.length > 0) {
            filterMessage = `<p>${t('empty_noMatchingBookmarks')}</p><p class="bookmark-hint">${t('empty_noMatchingBookmarksHint')}</p>`;
        } else {
            filterMessage = `<p>${t('empty_noBookmarks')}</p><p class="bookmark-hint">${t('empty_noBookmarksHint')}</p>`;
        }
        return `
            <div class="bookmark-empty">
                <span class="bookmark-empty-icon">${getBookmarkIconSvg(false)}</span>
                ${filterMessage}
            </div>
        `;
    }
    const sortOrder = getSetting('sortOrder');
    const sortedBookmarks = sortBookmarks(filteredBookmarks, sortOrder);
    return `<div class="bookmark-list">${sortedBookmarks.map(b => createBookmarkItemHtml({ ...b, chatFileName })).join('')}</div>`;
}

/**
 * 載入 Tab 內容
 */
async function loadTabContent(dlg, chatFileName, currentChatName, popup, searchQuery = '') {
    const contentContainer = dlg.find('.bookmarks-content');
    contentContainer.html(`<div class="bookmark-empty"><p>${t('empty_loading')}</p></div>`);

    let bookmarks;
    if (chatFileName === currentChatName) {
        bookmarks = getCurrentChatBookmarks().map(b => ({ ...b, chatFileName: currentChatName, isCurrent: true }));
    } else {
        bookmarks = await getChatBookmarks(chatFileName);
    }

    contentContainer.html(createTabBookmarksHtml(bookmarks, chatFileName, searchQuery)).attr('data-current-chat', chatFileName);
    bindBookmarkItemEvents(dlg, currentChatName, popup);
}

/**
 * 綁定書籤項目事件
 */
function bindBookmarkItemEvents(dlg, currentChatName, popup) {
    dlg.find('.bookmark-item').off('click').on('click', async function(e) {
        if ($(e.target).closest('.bookmark-item-tags-area').length) return;
        if ($(e.target).closest('.bookmark-custom-name-wrapper').length) return;
        await showBookmarkPreview($(this).data('msgid'), $(this).data('chat'));
    });

    dlg.find('.bookmark-jump').off('click').on('click', async function(e) {
        e.stopPropagation();
        const item = $(this).closest('.bookmark-item');
        popup.complete(0);
        await loadChatAndJump(item.data('chat'), item.data('msgid'));
    });

    dlg.find('.bookmark-delete').off('click').on('click', async function(e) {
        e.stopPropagation();
        const item = $(this).closest('.bookmark-item');
        const chatFileName = item.data('chat');
        const messageId = item.data('msgid');
        const isCurrentChat = chatFileName === currentChatName;

        if (!isCurrentChat) {
            const confirmed = await Popup.show.confirm(t('panel_confirmRemoveTitle'), t('panel_confirmRemoveMessage', chatFileName.replace('.jsonl', '')));
            if (!confirmed) return;
        }

        const success = isCurrentChat ? (await removeBookmark(messageId), true) : await removeBookmarkFromChat(chatFileName, messageId);
        if (success) item.fadeOut(200, function() { $(this).remove(); });
    });
    
    dlg.find('.bookmark-edit-name-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const wrapper = $(this).closest('.bookmark-custom-name-wrapper');
        wrapper.addClass('editing');
        wrapper.find('.bookmark-name-input').focus().select();
    });
    
    dlg.find('.bookmark-confirm-name-btn').off('click').on('click', async function(e) {
        e.stopPropagation();
        const wrapper = $(this).closest('.bookmark-custom-name-wrapper');
        const nameDisplay = wrapper.find('.bookmark-custom-name');
        const nameInput = wrapper.find('.bookmark-name-input');
        const newName = nameInput.val().trim();
        const chatFileName = nameDisplay.data('chat');
        const messageId = nameDisplay.data('msgid');
        
        await updateBookmarkName(messageId, newName, chatFileName);

        if (newName) {
            nameDisplay.html(escapeHtml(newName));
        } else {
            nameDisplay.html(`<span class="custom-name-placeholder">${t('btn_customName')}</span>`);
        }
        
        wrapper.removeClass('editing');
    });
    
    dlg.find('.bookmark-name-input').off('keydown click').on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $(this).closest('.bookmark-custom-name-wrapper').find('.bookmark-confirm-name-btn').click();
        } else if (e.key === 'Escape') {
            const wrapper = $(this).closest('.bookmark-custom-name-wrapper');
            wrapper.removeClass('editing');
        }
    }).on('click', function(e) {
        e.stopPropagation();
    });
    
    dlg.find('.bookmark-add-tag-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const wrapper = $(this).closest('.bookmark-add-tag-wrapper');
        const dropdown = wrapper.find('.bookmark-add-tag-dropdown');
        
        dlg.find('.bookmark-add-tag-dropdown').not(dropdown).removeClass('show');
        
        dropdown.toggleClass('show');
    });
    
    dlg.find('.add-tag-option').off('click').on('click', async function(e) {
        e.stopPropagation();
        const tagId = $(this).data('tagid');
        const item = $(this).closest('.bookmark-item');
        const chatFileName = item.data('chat');
        const messageId = item.data('msgid');
        
        await addTagToBookmark(messageId, tagId, chatFileName);
        
        $(this).closest('.bookmark-add-tag-dropdown').removeClass('show');
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        const searchQuery = dlg.find('.bookmark-search-input').val() || '';
        await loadTabContent(dlg, activeChat, currentChatName, popup, searchQuery);
    });
    
    dlg.find('.tag-remove').off('click').on('click', async function(e) {
        e.stopPropagation();
        const tagSpan = $(this).closest('.bookmark-tag');
        const tagId = tagSpan.data('tagid');
        const chatFileName = tagSpan.data('chat');
        const messageId = tagSpan.data('msgid');
        
        await removeTagFromBookmark(messageId, tagId, chatFileName);
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        const searchQuery = dlg.find('.bookmark-search-input').val() || '';
        await loadTabContent(dlg, activeChat, currentChatName, popup, searchQuery);
    });
    
    $(document).off('click.bookmarkTagDropdown').on('click.bookmarkTagDropdown', function() {
        dlg.find('.bookmark-add-tag-dropdown').removeClass('show');
    });
}

/**
 * 顯示新增聊天 Tab 彈窗
 */
async function showAddChatTabPopup(parentDlg, allChats, currentChatName, parentPopup) {
    const selectedChats = getSelectedChatsForCurrentCharacter();
    
    const loadingPopup = new Popup(`<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> ${t('toast_checkingBookmarks')}<br><small style="color: var(--SmartThemeQuoteColor); margin-top: 8px; display: block;">${t('toast_checkingBookmarksHint')}</small></div>`, POPUP_TYPE.TEXT, '', { okButton: null });
    loadingPopup.show();

    let chatListHtml = `
        <div class="add-chat-tab-item current-chat-hint" title="${t('panel_currentChat')}">
            <i class="fa-solid fa-comment chat-icon"></i>
            <span class="chat-name">${escapeHtml(currentChatName.replace('.jsonl', ''))}</span>
            <span class="current-chat-label">${t('addChat_currentChat')}</span>
        </div>
    `;

    // 收集所有聊天及其書籤數量，以便排序
    const chatDataList = [];
    for (const chatInfo of allChats) {
        if (chatInfo.file_name === currentChatName) continue;
        const bookmarks = await getChatBookmarks(chatInfo.file_name);
        chatDataList.push({
            file_name: chatInfo.file_name,
            bookmarkCount: bookmarks.length
        });
    }

    // 排序：有書籤的排在前面，按書籤數量降序；無書籤的排在後面
    chatDataList.sort((a, b) => {
        if (a.bookmarkCount > 0 && b.bookmarkCount === 0) return -1;
        if (a.bookmarkCount === 0 && b.bookmarkCount > 0) return 1;
        return b.bookmarkCount - a.bookmarkCount;
    });

    // 生成聊天列表 HTML
    for (const chatData of chatDataList) {
        const isAlreadyAdded = selectedChats.includes(chatData.file_name);
        const hasBookmarks = chatData.bookmarkCount > 0;
        chatListHtml += `
            <div class="add-chat-tab-item ${isAlreadyAdded ? 'already-added' : ''} ${hasBookmarks ? 'has-bookmarks' : 'no-bookmarks'}" data-chat="${escapeHtml(chatData.file_name)}">
                <i class="fa-regular fa-comment-dots chat-icon"></i>
                <span class="chat-name">${escapeHtml(chatData.file_name.replace('.jsonl', ''))}</span>
                ${hasBookmarks ? `<span class="chat-bookmark-count">${t('addChat_bookmarkCount', chatData.bookmarkCount)}</span>` : `<span class="chat-no-bookmark">${t('addChat_noBookmarks')}</span>`}
                ${isAlreadyAdded ? '<i class="fa-solid fa-check chat-added-icon"></i>' : ''}
            </div>
        `;
    }

    loadingPopup.complete(0);
    // 如果沒有任何其他聊天視窗，顯示空狀態
    if (chatDataList.length === 0) chatListHtml = `<div class="no-available-chats"><i class="fa-regular fa-comment-dots"></i><p>${t('empty_noOtherChats')}</p></div>`;

    const popup = new Popup(`
        <div class="add-chat-tab-popup">
            <h4><i class="fa-solid fa-plus"></i> ${t('addChat_title')}</h4>
            <div class="add-chat-tab-list">${chatListHtml}</div>
        </div>
    `, POPUP_TYPE.TEXT, '', { okButton: t('btn_close') });

    const dlg = $(popup.dlg);
    dlg.find('.add-chat-tab-item:not(.already-added):not(.current-chat-hint)').on('click', async function() {
        const chatFileName = $(this).data('chat');
        const displayName = chatFileName.replace('.jsonl', '');

        const selectedChats = getSelectedChatsForCurrentCharacter();
        if (!selectedChats.includes(chatFileName)) {
            selectedChats.push(chatFileName);
            setSelectedChatsForCurrentCharacter(selectedChats);
        }

        parentDlg.find('.bookmarks-tabs-scrollable').append(`
            <div class="bookmark-tab" data-chat="${escapeHtml(chatFileName)}" title="${escapeHtml(chatFileName)}">
                <i class="fa-regular fa-file"></i>
                <span class="tab-name">${escapeHtml(displayName)}</span>
                <span class="tab-close" title="${t('btn_closeTab')}"><i class="fa-solid fa-xmark"></i></span>
            </div>
        `);

        $(this).addClass('already-added').append('<i class="fa-solid fa-check chat-added-icon"></i>').off('click');
        toastr.success(t('toast_tabAdded', displayName), t('toast_bookmark'));
    });

    await popup.show();
}

/**
 * 取得角色的所有聊天檔案
 */
async function getCharacterChats() {
    if (this_chid === undefined) return [];
    const character = characters[this_chid];
    if (!character) return [];

    try {
        const response = await fetch('/api/characters/chats', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ avatar_url: character.avatar, simple: false }),
        });
        if (response.ok) {
            const data = await response.json();
            return Object.values(data).map(chat => ({ file_name: chat.file_name }));
        }
    } catch (error) {
        console.error('Error fetching character chats:', error);
    }
    return [];
}

/**
 * 顯示書籤管理面板
 */
async function showBookmarksPanel() {
    const allChats = await getCharacterChats();
    const currentChatName = getCurrentChatFileName();
    const characterName = this_chid !== undefined ? characters[this_chid].name : t('panel_group');
    const settings = extension_settings[extensionName];
    const openedTabs = getSelectedChatsForCurrentCharacter();
    const currentBookmarks = getCurrentChatBookmarks().map(b => ({ ...b, chatFileName: currentChatName, isCurrent: true }));
    const customTags = getCustomTags();
    const activeTagFilters = getSetting('activeTagFilters') || [];

    const iconOptions = Object.entries(BOOKMARK_ICONS).map(([key, icon]) =>
        `<option value="${key}" ${settings.bookmarkIcon === key ? 'selected' : ''}>${getIconName(key)}</option>`
    ).join('');

    const tagSelectOptionsHtml = customTags.length > 0
        ? customTags.map(tag => {
            const scopeLabel = getTagScopeLabel(tag);
            return `<option value="${tag.id}" data-color="${tag.color}" data-scope="${tag.scope || 'global'}">${escapeHtml(tag.name)} (${scopeLabel})</option>`;
        }).join('')
        : `<option value="" disabled>${t('panel_tagNone')}</option>`;

    const visibleTagsForFilter = getVisibleTags();
    const tagFilterHtml = visibleTagsForFilter.map(tag => {
        const scopeLabel = getTagScopeLabel(tag);
        return `
            <span class="tag-filter-item ${activeTagFilters.includes(tag.id) ? 'active' : ''}" data-tagid="${tag.id}" style="--tag-color: ${tag.color};">
                ${escapeHtml(tag.name)}<span class="tag-scope-badge">(${scopeLabel})</span>
            </span>
        `;
    }).join('');

    let tabsHtml = `
        <div class="bookmark-tab active current-chat-tab" data-chat="${escapeHtml(currentChatName)}" title="${escapeHtml(currentChatName)}">
            <i class="fa-solid fa-comment"></i><span class="tab-name">${t('panel_currentChat')}</span>
        </div>
    `;
    for (const chatName of openedTabs) {
        if (chatName === currentChatName) continue;
        tabsHtml += `
            <div class="bookmark-tab" data-chat="${escapeHtml(chatName)}" title="${escapeHtml(chatName)}">
                <i class="fa-regular fa-file"></i>
                <span class="tab-name">${escapeHtml(chatName.replace('.jsonl', ''))}</span>
                <span class="tab-close" title="${t('btn_closeTab')}"><i class="fa-solid fa-xmark"></i></span>
            </div>
        `;
    }

    const panelContent = `
        <div class="bookmarks-panel">
            <div class="bookmarks-panel-header">
                <h3><span class="header-icon">${getBookmarkIconSvg(true)}</span> ${t('panel_bookmarksOf', escapeHtml(characterName))}</h3>
                <div class="bookmarks-header-buttons">
                    <button class="menu_button bookmarks-quick-action-btn" title="${t('btn_quickAction')}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path fill="currentColor" d="M181.3 32.4c17.4 2.9 29.2 19.4 26.3 36.8L197.8 128l95.1 0 11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3s29.2 19.4 26.3 36.8L357.8 128l58.2 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-68.9 0L323.8 320l60.2 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-70.9 0-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.8-58.7-95.1 0-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8L90.2 384 32 384c-17.7 0-32-14.3-32-32s14.3-32 32-32l68.9 0 23.3-128L64 192c-17.7 0-32-14.3-32-32s14.3-32 32-32l70.9 0 11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3zM187.1 192L163.8 320l95.1 0 23.3-128-95.1 0z"/></svg>
                    </button>
                    <button class="menu_button bookmarks-tags-btn" title="${t('btn_tagManagement')}"><i class="fa-solid fa-tags"></i></button>
                    <button class="menu_button bookmarks-search-btn" title="${t('btn_search')}"><i class="fa-solid fa-magnifying-glass"></i></button>
                    <button class="menu_button bookmarks-settings-btn" title="${t('btn_settings')}"><i class="fa-solid fa-gear"></i></button>
                </div>
            </div>
            
            <div class="bookmarks-quick-action" style="display: none;">
                <div class="quick-action-title"><i class="fa-solid fa-bolt"></i> ${t('panel_quickActionTitle')}</div>
                <div class="quick-action-row">
                    <label><i class="fa-solid fa-hashtag"></i><span>${t('panel_messageNumber')}</span></label>
                    <input type="number" id="bookmark-quick-msgid" placeholder="${t('panel_enterMessageNumber')}" min="0">
                    <div class="quick-action-buttons">
                        <button class="menu_button bookmark-quick-preview-btn" title="${t('btn_preview')}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="1em" height="1em"><path fill="currentColor" d="M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"/></svg>
                            <span>${t('btn_preview')}</span>
                        </button>
                        <button class="menu_button bookmark-quick-jump-btn" title="${t('btn_jump')}"><i class="fa-solid fa-arrow-right"></i> <span>${t('btn_jump')}</span></button>
                        <button class="menu_button bookmark-quick-bookmark-btn" title="${t('btn_bookmarkVerb')}"><span class="bookmark-quick-icon">${getBookmarkIconSvg(true)}</span> <span>${t('btn_bookmarkVerb')}</span></button>
                    </div>
                </div>
            </div>
            
            <div class="bookmarks-tags-panel" style="display: none;">
                <div class="tags-panel-row">
                    <div class="tags-panel-section tags-section-add">
                        <div class="tags-panel-title">${t('panel_tagAdd')}</div>
                        <div class="tag-add-form">
                            <input type="text" class="tag-name-input" placeholder="${t('panel_tagEnterNew')}" maxlength="20">
                            <label class="color-picker-round">
                                <input type="color" class="tag-new-color" value="#ffe084" title="${t('panel_tagSelectColor')}">
                            </label>
                            <select class="tag-scope-select" title="${t('panel_tagScope')}">
                                <option value="global">${t('tag_scopeGlobal')}</option>
                                <option value="character">${t('tag_scopeCharacter')}</option>
                            </select>
                            <button class="menu_button tag-add-btn" title="${t('panel_tagAdd')}">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="tags-panel-section tags-section-manage">
                        <div class="tags-panel-title">${t('panel_tagManage')}</div>
                        <div class="tag-manage-form">
                            <select class="tag-manage-select">
                                ${tagSelectOptionsHtml}
                            </select>
                            <label class="color-picker-round">
                                <input type="color" class="tag-manage-color" value="${customTags.length > 0 ? customTags[0].color : '#ffe084'}" title="${t('panel_tagChangeColor')}">
                            </label>
                            <select class="tag-manage-scope-select" title="${t('panel_tagChangeScope')}">
                                <option value="global">${t('tag_scopeGlobal')}</option>
                                <option value="character">${t('tag_scopeCharacter')}</option>
                            </select>
                            <button class="menu_button tag-delete-btn" title="${t('panel_tagDelete')}">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path fill="currentColor" d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="tags-scope-hint">${t('panel_tagScopeHint')}</div>
                <div class="tags-panel-section tags-section-filter">
                    <div class="tags-panel-title"><i class="fa-solid fa-filter"></i> ${t('panel_tagFilter')} <span class="filter-hint">${t('panel_tagFilterHint')}</span></div>
                    <div class="tag-filter-container">
                        <span class="tag-filter-item tag-filter-all ${activeTagFilters.length === 0 ? 'active' : ''}" data-tagid="">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path fill="currentColor" d="M0 72C0 49.9 17.9 32 40 32H88c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V72zM0 232c0-22.1 17.9-40 40-40H88c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V232zM128 392v48c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V392c0-22.1 17.9-40 40-40H88c22.1 0 40 17.9 40 40zM168 72c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H208c-22.1 0-40-17.9-40-40V72zM296 232v48c0 22.1-17.9 40-40 40H208c-22.1 0-40-17.9-40-40V232c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40zM168 392c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H208c-22.1 0-40-17.9-40-40V392zM360 72c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H400c-22.1 0-40-17.9-40-40V72zM448 232v48c0 22.1-17.9 40-40 40H360c-22.1 0-40-17.9-40-40V232c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40zM360 392c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H400c-22.1 0-40-17.9-40-40V392z"/></svg>
                            ${t('panel_tagAll')}
                        </span>
                        ${tagFilterHtml}
                    </div>
                </div>
            </div>
            
            <div class="bookmarks-search-panel" style="display: none;">
                <div class="search-panel-header">
                    <div class="search-panel-title"><i class="fa-solid fa-magnifying-glass"></i> ${t('panel_searchTitle')}</div>
                    <button class="bookmark-search-clear-btn" title="${t('btn_clearSearch')}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="1em" height="1em"><path fill="currentColor" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
                    </button>
                </div>
                <input type="text" class="bookmark-search-input" placeholder="${t('placeholder_search')}" maxlength="100">
            </div>
            
            <div class="bookmarks-settings-panel" style="display: none;">
                <div class="settings-panel-title"><i class="fa-solid fa-gear"></i> ${t('panel_settingsTitle')}</div>
                <div class="settings-row">
                    <label><span>${t('panel_accentColor')}</span><label class="color-picker-round"><input type="color" id="bookmark-accent-color" value="${settings.accentColor || '#ffe084'}"></label></label>
                    <label><span>${t('panel_previewRange')}</span><input type="number" id="bookmark-preview-range" value="${settings.previewRange || 10}" min="1" max="50"> ${t('panel_previewRangeAfter')}</label>
                    <label><span>${t('panel_lineClamp')}</span><input type="number" id="bookmark-preview-line-clamp" value="${settings.previewLineClamp || 15}" min="1" max="100"> ${t('panel_lineClampUnit')}</label>
                    <label><span>${t('panel_bookmarkIcon')}</span><select id="bookmark-icon-type">${iconOptions}</select></label>
                </div>
                <div class="settings-row settings-row-second">
                    <label><span>${t('panel_sort')}</span></label>
                    <div class="bookmark-sort-buttons">
                        <button class="menu_button bookmark-sort-btn ${settings.sortOrder === 'messageAsc' ? 'active' : ''}" data-sort="messageAsc" title="${t('panel_sortMessageAsc')}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="1em" height="1em"><path fill="currentColor" d="M151.6 42.4C145.5 35.8 137 32 128 32s-17.5 3.8-23.6 10.4l-88 96c-11.9 13-11.1 33.3 2 45.2s33.3 11.1 45.2-2L96 146.3V448c0 17.7 14.3 32 32 32s32-14.3 32-32V146.3l32.4 35.4c11.9 13 32.2 13.9 45.2 2s13.9-32.2 2-45.2l-88-96zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32H544c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"/></svg>
                        </button>
                        <button class="menu_button bookmark-sort-btn ${settings.sortOrder === 'messageDesc' ? 'active' : ''}" data-sort="messageDesc" title="${t('panel_sortMessageDesc')}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="1em" height="1em"><path fill="currentColor" d="M151.6 469.6C145.5 476.2 137 480 128 480s-17.5-3.8-23.6-10.4l-88-96c-11.9-13-11.1-33.3 2-45.2s33.3-11.1 45.2 2L96 365.7V64c0-17.7 14.3-32 32-32s32 14.3 32 32V365.7l32.4-35.4c11.9-13 32.2-13.9 45.2-2s13.9 32.2 2 45.2l-88 96zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zm0 128c-17.7 0-32 14.3-32 32s14.3 32 32 32H544c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"/></svg>
                        </button>
                        <button class="menu_button bookmark-sort-btn ${settings.sortOrder === 'bookmarkNew' ? 'active' : ''}" data-sort="bookmarkNew" title="${t('panel_sortBookmarkNew')}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em"><path fill="currentColor" d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="0.6em" height="0.6em" style="margin-left:-2px"><path fill="currentColor" d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>
                        </button>
                        <button class="menu_button bookmark-sort-btn ${settings.sortOrder === 'bookmarkOld' ? 'active' : ''}" data-sort="bookmarkOld" title="${t('panel_sortBookmarkOld')}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em"><path fill="currentColor" d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="0.6em" height="0.6em" style="margin-left:-2px"><path fill="currentColor" d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2l105.4 105.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/></svg>
                        </button>
                    </div>
                    <button class="menu_button bookmark-reset-defaults-btn" title="${t('panel_resetDefaults')}"><i class="fa-solid fa-rotate-left"></i> ${t('btn_reset')}</button>
                </div>
            </div>
            
            <div class="bookmarks-tabs-container">
                <div class="bookmarks-tabs">
                    <div class="bookmarks-tabs-scrollable">
                        ${tabsHtml}
                    </div>
                    <button class="bookmark-tab-add" title="${t('btn_addOtherChats')}"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="bookmarks-tab-content">
                    <div class="bookmarks-content" data-current-chat="${escapeHtml(currentChatName)}">
                        ${createTabBookmarksHtml(currentBookmarks, currentChatName)}
                    </div>
                </div>
            </div>
        </div>
    `;

    const popup = new Popup(panelContent, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: t('btn_close') });
    const dlg = $(popup.dlg);

    const tabsScrollable = dlg.find('.bookmarks-tabs-scrollable')[0];
    if (tabsScrollable) {
        tabsScrollable.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    const updateTagsPanel = async () => {
        const tags = getCustomTags();
        const currentFilters = getSetting('activeTagFilters') || [];
        
        const tagSelectOptionsHtml = tags.length > 0
            ? tags.map(tag => `<option value="${tag.id}" data-color="${tag.color}">${escapeHtml(tag.name)}</option>`).join('')
            : `<option value="" disabled>${t('panel_tagNone')}</option>`;
        const selectEl = dlg.find('.tag-manage-select');
        const currentSelectedId = selectEl.val();
        selectEl.html(tagSelectOptionsHtml);
        
        if (currentSelectedId && tags.some(t => t.id === currentSelectedId)) {
            selectEl.val(currentSelectedId);
        }

        const selectedTag = tags.find(t => t.id === selectEl.val());
        if (selectedTag) {
            dlg.find('.tag-manage-color').val(selectedTag.color);
            dlg.find('.tag-manage-scope-select').val(selectedTag.scope || 'global');
        }
        
        const visibleTagsForUpdate = getVisibleTags();
        const tagFilterHtml = visibleTagsForUpdate.map(tag => {
            const scopeLabel = getTagScopeLabel(tag);
            return `
                <span class="tag-filter-item ${currentFilters.includes(tag.id) ? 'active' : ''}" data-tagid="${tag.id}" style="--tag-color: ${tag.color};">
                    ${escapeHtml(tag.name)}<span class="tag-scope-badge">(${scopeLabel})</span>
                </span>
            `;
        }).join('');
        dlg.find('.tag-filter-container').html(`
            <span class="tag-filter-item tag-filter-all ${currentFilters.length === 0 ? 'active' : ''}" data-tagid="">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em"><path fill="currentColor" d="M0 72C0 49.9 17.9 32 40 32H88c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V72zM0 232c0-22.1 17.9-40 40-40H88c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V232zM128 392v48c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V392c0-22.1 17.9-40 40-40H88c22.1 0 40 17.9 40 40zM168 72c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H208c-22.1 0-40-17.9-40-40V72zM296 232v48c0 22.1-17.9 40-40 40H208c-22.1 0-40-17.9-40-40V232c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40zM168 392c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H208c-22.1 0-40-17.9-40-40V392zM360 72c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H400c-22.1 0-40-17.9-40-40V72zM448 232v48c0 22.1-17.9 40-40 40H360c-22.1 0-40-17.9-40-40V232c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40zM360 392c0-22.1 17.9-40 40-40h48c22.1 0 40 17.9 40 40v48c0 22.1-17.9 40-40 40H400c-22.1 0-40-17.9-40-40V392z"/></svg>
                ${t('panel_tagAll')}
            </span>
            ${tagFilterHtml}
        `);
    };
    
    dlg.on('change', '.tag-manage-select', function() {
        const tagId = $(this).val();
        const tags = getCustomTags();
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
            dlg.find('.tag-manage-color').val(tag.color);
            dlg.find('.tag-manage-scope-select').val(tag.scope || 'global');
        }
    });

    const updateHeaderButtonsActiveState = () => {
        const quickActionVisible = dlg.find('.bookmarks-quick-action').is(':visible');
        const tagsPanelVisible = dlg.find('.bookmarks-tags-panel').is(':visible');
        const searchPanelVisible = dlg.find('.bookmarks-search-panel').is(':visible');
        const settingsPanelVisible = dlg.find('.bookmarks-settings-panel').is(':visible');
        
        dlg.find('.bookmarks-quick-action-btn').toggleClass('active', quickActionVisible);
        dlg.find('.bookmarks-tags-btn').toggleClass('active', tagsPanelVisible);
        dlg.find('.bookmarks-search-btn').toggleClass('active', searchPanelVisible);
        dlg.find('.bookmarks-settings-btn').toggleClass('active', settingsPanelVisible);
    };

    dlg.find('.bookmarks-quick-action-btn').on('click', () => {
        const panel = dlg.find('.bookmarks-quick-action');
        const isOpening = !panel.is(':visible');
        
        dlg.find('.bookmarks-settings-panel').slideUp(200);
        dlg.find('.bookmarks-tags-panel').slideUp(200);
        dlg.find('.bookmarks-search-panel').slideUp(200);
        panel.slideToggle(200, updateHeaderButtonsActiveState);
        
        dlg.find('.bookmarks-quick-action-btn').toggleClass('active', isOpening);
        dlg.find('.bookmarks-tags-btn').removeClass('active');
        dlg.find('.bookmarks-search-btn').removeClass('active');
        dlg.find('.bookmarks-settings-btn').removeClass('active');
    });

    dlg.find('.bookmarks-tags-btn').on('click', () => {
        const panel = dlg.find('.bookmarks-tags-panel');
        const isOpening = !panel.is(':visible');
        
        dlg.find('.bookmarks-settings-panel').slideUp(200);
        dlg.find('.bookmarks-quick-action').slideUp(200);
        dlg.find('.bookmarks-search-panel').slideUp(200);
        panel.slideToggle(200, updateHeaderButtonsActiveState);
        
        dlg.find('.bookmarks-tags-btn').toggleClass('active', isOpening);
        dlg.find('.bookmarks-quick-action-btn').removeClass('active');
        dlg.find('.bookmarks-search-btn').removeClass('active');
        dlg.find('.bookmarks-settings-btn').removeClass('active');
    });

    dlg.find('.bookmarks-search-btn').on('click', () => {
        const panel = dlg.find('.bookmarks-search-panel');
        const isOpening = !panel.is(':visible');
        
        dlg.find('.bookmarks-settings-panel').slideUp(200);
        dlg.find('.bookmarks-quick-action').slideUp(200);
        dlg.find('.bookmarks-tags-panel').slideUp(200);
        panel.slideToggle(200, updateHeaderButtonsActiveState);
        
        dlg.find('.bookmarks-search-btn').toggleClass('active', isOpening);
        dlg.find('.bookmarks-quick-action-btn').removeClass('active');
        dlg.find('.bookmarks-tags-btn').removeClass('active');
        dlg.find('.bookmarks-settings-btn').removeClass('active');
        
        if (isOpening) {
            setTimeout(() => dlg.find('.bookmark-search-input').focus(), 250);
        }
    });

    dlg.find('.bookmarks-settings-btn').on('click', () => {
        const panel = dlg.find('.bookmarks-settings-panel');
        const isOpening = !panel.is(':visible');
        
        dlg.find('.bookmarks-tags-panel').slideUp(200);
        dlg.find('.bookmarks-quick-action').slideUp(200);
        dlg.find('.bookmarks-search-panel').slideUp(200);
        panel.slideToggle(200, updateHeaderButtonsActiveState);
        
        dlg.find('.bookmarks-settings-btn').toggleClass('active', isOpening);
        dlg.find('.bookmarks-quick-action-btn').removeClass('active');
        dlg.find('.bookmarks-tags-btn').removeClass('active');
        dlg.find('.bookmarks-search-btn').removeClass('active');
    });
    
    dlg.find('.tag-add-btn').on('click', async function() {
        const nameInput = dlg.find('.tag-name-input');
        const colorInput = dlg.find('.tag-new-color');
        const scopeSelect = dlg.find('.tag-scope-select');
        const name = nameInput.val().trim();
        const scope = scopeSelect.val() || 'global';
        
        if (!name) {
            toastr.warning(t('toast_tagEnterName'), t('toast_tag'));
            return;
        }
        
        addCustomTag(name, colorInput.val(), scope);
        nameInput.val('');
        await updateTagsPanel();
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        const searchQuery = dlg.find('.bookmark-search-input').val() || '';
        await loadTabContent(dlg, activeChat, currentChatName, popup, searchQuery);
        
        toastr.success(t('toast_tagAdded', name), t('toast_tag'));
    });
    
    dlg.on('change', '.tag-manage-scope-select', async function() {
        const selectEl = dlg.find('.tag-manage-select');
        const tagId = selectEl.val();
        const newScope = $(this).val();
        
        if (!tagId) return;
        
        updateTagScope(tagId, newScope);
        await updateTagsPanel();
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        const searchQuery = dlg.find('.bookmark-search-input').val() || '';
        await loadTabContent(dlg, activeChat, currentChatName, popup, searchQuery);
    });
    
    let searchTimeout = null;
    dlg.find('.bookmark-search-input').on('input', function() {
        const query = $(this).val();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const activeChat = dlg.find('.bookmark-tab.active').data('chat');
            await loadTabContent(dlg, activeChat, currentChatName, popup, query);
        }, 300);
    });
    
    dlg.find('.bookmark-search-clear-btn').on('click', async function() {
        dlg.find('.bookmark-search-input').val('');
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        await loadTabContent(dlg, activeChat, currentChatName, popup, '');
    });
    
    dlg.find('.tag-delete-btn').on('click', async function(e) {
        e.stopPropagation();
        const selectEl = dlg.find('.tag-manage-select');
        const tagId = selectEl.val();
        
        if (!tagId) {
            toastr.warning(t('toast_tagSelectFirst'), t('toast_tag'));
            return;
        }
        
        const tags = getCustomTags();
        const tag = tags.find(tg => tg.id === tagId);
        if (!tag) return;
        
        const confirmed = await Popup.show.confirm(t('panel_confirmDeleteTagTitle'), t('panel_confirmDeleteTagMessage', tag.name));
        if (!confirmed) return;
        
        await deleteCustomTag(tagId);
        await updateTagsPanel();
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        const searchQuery = dlg.find('.bookmark-search-input').val() || '';
        await loadTabContent(dlg, activeChat, currentChatName, popup, searchQuery);
        
        toastr.info(t('toast_tagDeleted', tag.name), t('toast_tag'));
    });
    
    dlg.on('change', '.tag-manage-color', async function() {
        const selectEl = dlg.find('.tag-manage-select');
        const tagId = selectEl.val();
        const newColor = $(this).val();
        
        if (!tagId) return;
        
        const tags = getCustomTags();
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
            tag.color = newColor;
            saveCustomTags(tags);
            
            await updateTagsPanel();
            const activeChat = dlg.find('.bookmark-tab.active').data('chat');
            await loadTabContent(dlg, activeChat, currentChatName, popup);
        }
    });
    
    dlg.on('click', '.tag-filter-item', async function() {
        const tagId = $(this).data('tagid');
        let currentFilters = getSetting('activeTagFilters') || [];
        
        if (tagId === '' || $(this).hasClass('tag-filter-all')) {
            currentFilters = [];
        } else {
            const index = currentFilters.indexOf(tagId);
            if (index > -1) {
                currentFilters.splice(index, 1);
            } else {
                currentFilters.push(tagId);
            }
        }
        
        setSetting('activeTagFilters', currentFilters);
        
        dlg.find('.tag-filter-item').removeClass('active');
        if (currentFilters.length === 0) {
            dlg.find('.tag-filter-all').addClass('active');
        } else {
            currentFilters.forEach(id => {
                dlg.find(`.tag-filter-item[data-tagid="${id}"]`).addClass('active');
            });
        }
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        await loadTabContent(dlg, activeChat, currentChatName, popup);
    });
    
    dlg.find('#bookmark-accent-color').on('change input', function() {
        setSetting('accentColor', $(this).val());
        applyCssVariables();
    });

    dlg.find('#bookmark-preview-range').on('change input', function() {
        setSetting('previewRange', Math.max(1, Math.min(50, parseInt($(this).val()) || 10)));
    });

    dlg.find('#bookmark-preview-line-clamp').on('change input', function() {
        const value = Math.max(1, Math.min(100, parseInt($(this).val()) || 15));
        setSetting('previewLineClamp', value);
        applyCssVariables();
        
        dlg.find('.bookmark-item-text').each(function() {
            $(this).css({
                '-webkit-line-clamp': value,
                'line-clamp': value
            });
        });
    });

    dlg.find('#bookmark-icon-type').on('change', function() {
        setSetting('bookmarkIcon', $(this).val());
        updateAllBookmarkIcons(true); 
        updatePanelIcons(dlg);
        updateExtensionMenuIcon();
    });


    dlg.find('.bookmark-reset-defaults-btn').on('click', async function() {
        const confirmed = await Popup.show.confirm(t('panel_confirmResetTitle'), t('panel_confirmResetMessage'));
        if (!confirmed) return;

 
        const selectedChatsByCharacter = getSetting('selectedChatsByCharacter') || {};
        
 
        extension_settings[extensionName] = { 
            ...defaultSettings,
            selectedChatsByCharacter 
        };
        saveSettingsDebounced();
        applyCssVariables();
        
        dlg.find('#bookmark-accent-color').val(defaultSettings.accentColor);
        dlg.find('#bookmark-preview-range').val(defaultSettings.previewRange);
        dlg.find('#bookmark-preview-line-clamp').val(defaultSettings.previewLineClamp);
        dlg.find('#bookmark-icon-type').val(defaultSettings.bookmarkIcon);
        
        dlg.find('.bookmark-sort-btn').removeClass('active');
        dlg.find(`.bookmark-sort-btn[data-sort="${defaultSettings.sortOrder}"]`).addClass('active');
        
        updateAllBookmarkIcons(true);
        updatePanelIcons(dlg);
        updateExtensionMenuIcon();
        
        dlg.find('.bookmark-item-text').each(function() {
            $(this).css({
                '-webkit-line-clamp': defaultSettings.previewLineClamp,
                'line-clamp': defaultSettings.previewLineClamp
            });
        });
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        await loadTabContent(dlg, activeChat, currentChatName, popup);
        
        toastr.success(t('toast_settingsReset'), t('toast_bookmark'));
    });


    dlg.find('.bookmark-sort-btn').on('click', async function() {
        const sortOrder = $(this).data('sort');
        setSetting('sortOrder', sortOrder);
        
        dlg.find('.bookmark-sort-btn').removeClass('active');
        $(this).addClass('active');
        
        const activeChat = dlg.find('.bookmark-tab.active').data('chat');
        await loadTabContent(dlg, activeChat, currentChatName, popup);
    });


    dlg.find('.bookmark-quick-preview-btn').on('click', async function() {
        const msgId = parseInt(dlg.find('#bookmark-quick-msgid').val());
        if (isNaN(msgId) || msgId < 0) { toastr.warning(t('toast_enterValidNumber'), t('toast_bookmark')); return; }
        const chatFileName = dlg.find('.bookmark-tab.active').data('chat');
        await showQuickPreview(msgId, chatFileName);
    });


    dlg.find('.bookmark-quick-jump-btn').on('click', async function() {
        const msgId = parseInt(dlg.find('#bookmark-quick-msgid').val());
        if (isNaN(msgId) || msgId < 0) { toastr.warning(t('toast_enterValidNumber'), t('toast_bookmark')); return; }
        popup.complete(0);
        await loadChatAndJump(dlg.find('.bookmark-tab.active').data('chat'), msgId);
    });

 
    dlg.find('.bookmark-quick-bookmark-btn').on('click', async function() {
        const msgId = parseInt(dlg.find('#bookmark-quick-msgid').val());
        if (isNaN(msgId) || msgId < 0) { toastr.warning(t('toast_enterValidNumber'), t('toast_bookmark')); return; }

        const chatFileName = dlg.find('.bookmark-tab.active').data('chat');
        
        if (chatFileName === currentChatName) {
            if (msgId >= chat.length) { toastr.warning(t('toast_messageOutOfRange'), t('toast_bookmark')); return; }
            await addBookmark(msgId);
        } else {
            await addBookmarkToExternalChat(chatFileName, msgId);
        }
        await loadTabContent(dlg, chatFileName, currentChatName, popup);
    });

 
    dlg.find('.bookmarks-tabs').on('click', '.bookmark-tab', async function(e) {
        if ($(e.target).closest('.tab-close').length) return;
        dlg.find('.bookmark-tab').removeClass('active');
        $(this).addClass('active');
        await loadTabContent(dlg, $(this).data('chat'), currentChatName, popup);
    });


    dlg.find('.bookmarks-tabs').on('click', '.tab-close', async function(e) {
        e.stopPropagation();
        const tab = $(this).closest('.bookmark-tab');
        const chatFileName = tab.data('chat');

        const selectedChats = getSelectedChatsForCurrentCharacter();
        const index = selectedChats.indexOf(chatFileName);
        if (index > -1) {
            selectedChats.splice(index, 1);
            setSelectedChatsForCurrentCharacter(selectedChats);
        }

        if (tab.hasClass('active')) {
            const firstTab = dlg.find('.bookmark-tab').first();
            firstTab.addClass('active');
            await loadTabContent(dlg, firstTab.data('chat'), currentChatName, popup);
        }
        tab.remove();
    });


    dlg.find('.bookmark-tab-add').on('click', () => showAddChatTabPopup(dlg, allChats, currentChatName, popup));

    bindBookmarkItemEvents(dlg, currentChatName, popup);
    await popup.show();
}

// ========== 擴展選單 ==========

function addExtensionMenuButton() {
    if ($('#chat-bookmarks-menu-btn').length > 0) return;

    $('#extensionsMenu').append(`
        <div id="chat-bookmarks-menu-btn" class="list-group-item flex-container flexGap5">
            <span class="extensionsMenuExtensionButton bookmark-menu-icon">${getBookmarkIconSvg(true)}</span>
            <span data-i18n="Bookmarks">${t('extensionName')}</span>
        </div>
    `);

    $('#chat-bookmarks-menu-btn').on('click', function(e) {
        e.stopPropagation();
        $('#extensionsMenu').fadeOut(200);
        showBookmarksPanel();
    });
}

// ========== 事件處理 ==========

async function onChatChanged() {
    // 清理從其他聊天繼承來的書籤（處理分支創建的情況）
    await cleanupInheritedBookmarks();
    
    setTimeout(addBookmarkButtonsToAllMessages, 500);
}

function onMessageReceived(messageId) {
    setTimeout(() => {
        const messageElement = $(`#chat .mes[mesid="${messageId}"]`);
        if (messageElement.length) addBookmarkButtonToMessage(messageElement[0]);
    }, 100);
}

function setupChatObserver() {
    const chatContainer = document.getElementById('chat');
    if (!chatContainer) {
        setTimeout(setupChatObserver, 1000);
        return;
    }

    const observer = new MutationObserver((mutations) => {
        let hasNewMessages = false;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE && node instanceof Element) {
                    if (node.classList?.contains('mes')) {
                        addBookmarkButtonToMessage(node);
                        hasNewMessages = true;
                    }
                    node.querySelectorAll?.('.mes').forEach((mesElement) => {
                        addBookmarkButtonToMessage(mesElement);
                        hasNewMessages = true;
                    });
                }
            });
        });
        if (hasNewMessages) updateAllBookmarkIcons();
    });

    observer.observe(chatContainer, { childList: true, subtree: true });
    console.log('Chat Bookmarks: MutationObserver 已設置');
}

// ========== 斜線指令 ==========

/**
 * 註冊書籤擴充的斜線指令
 */
function registerSlashCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'bookmark-panel',
        aliases: ['bookmarks', 'bm-panel'],
        callback: async () => {
            await showBookmarksPanel();
            return t('toast_slashPanelOpened');
        },
        returns: t('slash_panelDesc'),
        helpString: `
            <div>
                ${t('slash_panelHelp')}
            </div>
            <div>
                <strong>${t('slash_panelUsage')}</strong>
                <pre><code class="language-stscript">/bookmark-panel</code></pre>
            </div>
        `,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'bookmark',
        aliases: ['bm'],
        callback: async () => {
            if (chat.length === 0) {
                toastr.warning(t('toast_currentNoMessages'), t('toast_bookmark'));
                return '';
            }
            const lastMessageId = chat.length - 1;
            const success = await addBookmark(lastMessageId);
            return success ? t('toast_slashBookmarkAdded', lastMessageId) : '';
        },
        returns: t('slash_bookmarkDesc'),
        helpString: `
            <div>
                ${t('slash_bookmarkHelp')}
            </div>
            <div>
                <strong>${t('slash_panelUsage')}</strong>
                <pre><code class="language-stscript">/bookmark</code></pre>
            </div>
        `,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'bookmark-add',
        aliases: ['bm-add'],
        callback: async (args, messageId) => {
            const id = parseInt(messageId);
            if (isNaN(id) || id < 0) {
                toastr.warning(t('toast_provideValidNumber'), t('toast_bookmark'));
                return '';
            }
            const success = await addBookmark(id);
            return success ? t('toast_slashBookmarkAdded', id) : '';
        },
        returns: t('slash_addDesc'),
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: t('slash_addArgDesc'),
                typeList: [ARGUMENT_TYPE.NUMBER],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                ${t('slash_addHelp')}
            </div>
            <div>
                <strong>${t('slash_panelUsage')}</strong>
                <pre><code class="language-stscript">/bookmark-add 5</code></pre>
                ${t('slash_addUsageHint')}
            </div>
        `,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'bookmark-remove',
        aliases: ['bm-remove', 'bm-del'],
        callback: async (args, messageId) => {
            const id = parseInt(messageId);
            if (isNaN(id) || id < 0) {
                toastr.warning(t('toast_provideValidNumber'), t('toast_bookmark'));
                return '';
            }
            await removeBookmark(id);
            return t('toast_slashBookmarkRemoved', id);
        },
        returns: t('slash_removeDesc'),
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: t('slash_addArgDesc'),
                typeList: [ARGUMENT_TYPE.NUMBER],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                ${t('slash_removeHelp')}
            </div>
            <div>
                <strong>${t('slash_panelUsage')}</strong>
                <pre><code class="language-stscript">/bookmark-remove 5</code></pre>
                ${t('slash_removeUsageHint')}
            </div>
        `,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'bookmark-preview',
        aliases: ['bm-preview'],
        callback: async (args, messageId) => {
            const id = parseInt(messageId);
            if (isNaN(id) || id < 0) {
                toastr.warning(t('toast_provideValidNumber'), t('toast_bookmark'));
                return '';
            }
            const currentChatName = getCurrentChatFileName();
            await showQuickPreview(id, currentChatName);
            return t('toast_slashPreviewing', id);
        },
        returns: t('slash_previewDesc'),
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: t('slash_addArgDesc'),
                typeList: [ARGUMENT_TYPE.NUMBER],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                ${t('slash_previewHelp')}
            </div>
            <div>
                <strong>${t('slash_panelUsage')}</strong>
                <pre><code class="language-stscript">/bookmark-preview 5</code></pre>
                ${t('slash_previewUsageHint')}
            </div>
        `,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'bookmark-goto',
        aliases: ['bm-goto', 'bm-jump'],
        callback: async (args, messageId) => {
            const id = parseInt(messageId);
            if (isNaN(id) || id < 0) {
                toastr.warning(t('toast_provideValidNumber'), t('toast_bookmark'));
                return '';
            }
            const currentChatName = getCurrentChatFileName();
            await loadChatAndJump(currentChatName, id);
            return t('toast_slashJumped', id);
        },
        returns: t('slash_gotoDesc'),
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: t('slash_addArgDesc'),
                typeList: [ARGUMENT_TYPE.NUMBER],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                ${t('slash_gotoHelp')}
            </div>
            <div>
                <strong>${t('slash_panelUsage')}</strong>
                <pre><code class="language-stscript">/bookmark-goto 5</code></pre>
                ${t('slash_gotoUsageHint')}
            </div>
        `,
    }));

    console.log('Chat Bookmarks: Slash commands registered');
}

// ========== 初始化 ==========

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (extension_settings[extensionName][key] === undefined) {
            extension_settings[extensionName][key] = value;
        }
    }
    applyCssVariables();
}

jQuery(async () => {
    await loadLocale(extensionFolderPath);
    
    await loadSettings();
    addExtensionMenuButton();
    addBookmarkButtonsToAllMessages();
    setupChatObserver();
    registerSlashCommands();

    $(document).on('click', '.chat-bookmark-star', async function(e) {
        e.stopPropagation();
        const mesId = parseInt($(this).closest('.mes').attr('mesid'));
        if (!isNaN(mesId)) await toggleBookmark(mesId);
    });

    eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
    eventSource.on(event_types.MESSAGE_SENT, onMessageReceived);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageReceived);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, onMessageReceived);
    eventSource.on(event_types.MORE_MESSAGES_LOADED, () => setTimeout(addBookmarkButtonsToAllMessages, 100));

    console.log('Chat Bookmarks extension loaded');
});
