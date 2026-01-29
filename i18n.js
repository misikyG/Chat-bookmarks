/**
 * Chat Bookmarks - I18N Module
 * 國際化模組，支援多語言
 */

// 支援的語言列表
const SUPPORTED_LANGUAGES = ['en', 'zh-tw', 'ja'];
const DEFAULT_LANGUAGE = 'en';

// 語言資料快取
let localeData = null;
let currentLocale = null;

/**
 * 取得當前語言設定
 * @returns {string} 語言代碼
 */
function detectLanguage() {
    // 優先使用 SillyTavern 的語言設定
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
        const lang = storedLang.toLowerCase();
        // 嘗試匹配支援的語言
        if (SUPPORTED_LANGUAGES.includes(lang)) {
            return lang;
        }
        // 嘗試匹配語言前綴 (例如 zh-hant -> zh-tw)
        if (lang.startsWith('zh-hant') || lang.startsWith('zh-tw')) {
            return 'zh-tw';
        }
        if (lang.startsWith('zh')) {
            return 'zh-tw'; // 繁體中文優先
        }
        if (lang.startsWith('ja')) {
            return 'ja';
        }
    }
    
    // 使用瀏覽器語言設定
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        return browserLang;
    }
    if (browserLang.startsWith('zh-hant') || browserLang.startsWith('zh-tw')) {
        return 'zh-tw';
    }
    if (browserLang.startsWith('zh')) {
        return 'zh-tw';
    }
    if (browserLang.startsWith('ja')) {
        return 'ja';
    }
    
    return DEFAULT_LANGUAGE;
}

/**
 * 載入語言檔案
 * @param {string} extensionPath - 擴充功能路徑
 */
export async function loadLocale(extensionPath) {
    currentLocale = detectLanguage();
    
    try {
        const response = await fetch(`${extensionPath}/locales/${currentLocale}.json`);
        if (response.ok) {
            localeData = await response.json();
            console.log(`Chat Bookmarks: Loaded locale "${currentLocale}"`);
        } else {
            throw new Error(`Failed to load locale file: ${response.status}`);
        }
    } catch (error) {
        console.warn(`Chat Bookmarks: Failed to load locale "${currentLocale}", falling back to English`, error);
        // 嘗試載入英文作為備用
        if (currentLocale !== DEFAULT_LANGUAGE) {
            try {
                const fallbackResponse = await fetch(`${extensionPath}/locales/${DEFAULT_LANGUAGE}.json`);
                if (fallbackResponse.ok) {
                    localeData = await fallbackResponse.json();
                    currentLocale = DEFAULT_LANGUAGE;
                }
            } catch (fallbackError) {
                console.error('Chat Bookmarks: Failed to load fallback locale', fallbackError);
                localeData = {};
            }
        } else {
            localeData = {};
        }
    }
}

/**
 * 翻譯文字
 * @param {string} key - 翻譯鍵值
 * @param {...any} args - 替換參數 (用於 {0}, {1} 等佔位符)
 * @returns {string} 翻譯後的文字
 */
export function t(key, ...args) {
    let text = localeData?.[key] || key;
    
    // 替換佔位符 {0}, {1}, ...
    if (args.length > 0) {
        args.forEach((arg, index) => {
            text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
        });
    }
    
    return text;
}

/**
 * 取得當前語言代碼
 * @returns {string} 語言代碼
 */
export function getCurrentLocale() {
    return currentLocale || DEFAULT_LANGUAGE;
}

/**
 * 檢查是否已載入語言資料
 * @returns {boolean}
 */
export function isLocaleLoaded() {
    return localeData !== null;
}
