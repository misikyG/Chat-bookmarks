# Chat Bookmarks

[繁體中文](#繁體中文) | [English](#english)

---

<h2 id="繁體中文">繁體中文</h2>

這是一個 SillyTavern 擴充功能，讓你可以在聊天訊息上標記書籤，方便日後快速回顧重要對話。

### 功能特色

#### 訊息書籤標記
- 在每則訊息都有按鈕，點擊即可標記/取消書籤
- 已標記的書籤會顯示為有色實心圖樣

#### 書籤瀏覽面板
- 從左下角的擴展功能選單（魔杖圖示）中點選「書籤」
- 可查看當前聊天的所有書籤
- 支援篩選顯示當前聊天或其他聊天視窗的書籤

#### 標籤管理
- 建立自訂標籤並設定顏色
- 為書籤添加標籤以便分類
- 透過標籤篩選書籤（支援多選）
- **標籤範圍說明**：
  - 「**全域**」：通用標籤，在所有角色的書籤中都可以使用
  - 「**角色**」：僅此角色標籤，只在當前角色的書籤中顯示

#### 訊息預覽
- 點擊任何書籤項目可預覽該訊息
- 預覽會顯示書籤訊息後的訊息（可設定範圍）
- 支援向上及向下載入更多預覽訊息
- 目標訊息高亮顯示

#### 快速跳轉
- 可直接跳轉到任何書籤訊息
- 支援跨聊天視窗跳轉
- 快速操作面板可透過訊息編號跳轉/書籤

#### 自訂設定
- 強調色選擇
- 多種書籤圖示樣式（星星、愛心、書籤、旗幟）
- 可設定預覽範圍與內容行數限制
- 多種排序選項（按訊息順序或書籤時間）

### 斜線指令

| 指令 | 別名 | 說明 | 範例 |
|------|------|------|------|
| `/bookmark-panel` | `/bookmarks`<br>`/bm-panel` | 打開書籤管理面板 | `/bookmark-panel` |
| `/bookmark` | `/bm` | 為最後一則訊息添加書籤 | `/bookmark` |
| `/bookmark-add <編號>` | `/bm-add` | 為指定編號的訊息添加書籤 | `/bookmark-add 5` |
| `/bookmark-remove <編號>` | `/bm-remove`<br>`/bm-del` | 移除指定編號訊息的書籤 | `/bookmark-remove 5` |
| `/bookmark-preview <編號>` | `/bm-preview` | 預覽指定編號的訊息 | `/bookmark-preview 5` |
| `/bookmark-goto <編號>` | `/bm-goto`<br>`/bm-jump` | 跳轉至指定編號的訊息 | `/bookmark-goto 5` |

**提示：** 可以在快速回覆（Quick Reply）或 STscript 腳本中使用這些指令。

### 注意事項
- 當聊天視窗太多，打開面板以及查找書籤速度會變慢（需載入時間）
- 跨窗跳轉或者跳轉太過長遠的訊息時需要載入時間，避免資訊消失請勿在此時隨意操作

---

<h2 id="english">English</h2>

A SillyTavern extension that allows you to mark bookmarks on chat messages for quick review of important conversations.

### Features

#### Message Bookmarking
- Every message has a button to toggle bookmarks
- Bookmarked messages display with a colored solid icon

#### Bookmark Panel
- Access from the extension menu (wand icon) in the bottom left corner → select "Bookmarks"
- View all bookmarks in the current chat
- Support for filtering and viewing bookmarks across different chat sessions

#### Tag Management
- Create custom tags with custom colors
- Assign tags to bookmarks for better organization
- Filter bookmarks by tags (supports multiple tag selection)
- **Tag Scope Explained**:
  - "**Global**": Universal tags, available across all characters
  - "**Char**": Character-specific tags, only visible for the current character

#### Message Preview
- Click any bookmark item to preview that message
- Preview shows messages after the bookmarked message (configurable range)
- Support for loading more preview messages (both up and down)
- Target message is highlighted

#### Quick Jump
- Jump directly to any bookmarked message
- Support cross-chat jumping
- Quick action panel for jumping/bookmarking by message number

#### Customization
- Accent color selection
- Multiple bookmark icon styles (Star, Heart, Bookmark, Flag)
- Configurable preview range and content line clamp
- Multiple sort options (by message order or bookmark time)

### Slash Commands

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/bookmark-panel` | `/bookmarks`<br>`/bm-panel` | Open bookmark management panel | `/bookmark-panel` |
| `/bookmark` | `/bm` | Bookmark the last message | `/bookmark` |
| `/bookmark-add <id>` | `/bm-add` | Bookmark a specific message | `/bookmark-add 5` |
| `/bookmark-remove <id>` | `/bm-remove`<br>`/bm-del` | Remove bookmark from a message | `/bookmark-remove 5` |
| `/bookmark-preview <id>` | `/bm-preview` | Preview a specific message | `/bookmark-preview 5` |
| `/bookmark-goto <id>` | `/bm-goto`<br>`/bm-jump` | Jump to a specific message | `/bookmark-goto 5` |

**Tip:** These commands can be used in Quick Reply or STscript.

### Notes
- Having many chat sessions may slow down the panel loading and bookmark searching
- Cross-chat jumping or jumping to distant messages requires loading time; avoid operating during this process

