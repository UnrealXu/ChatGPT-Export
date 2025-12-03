[中文](#中文) | [English](#english)

# 中文

## 项目简介
**ChatGPT 导出聊天记录（团队和个人通用）**：浏览器侧边栏扩展，支持个人/团队工作区，导出格式 JSON / Markdown / HTML。

## 功能
- 右侧侧栏操作，不遮挡输入，可边聊边导出
- 个人 / 团队模式（支持 Workspace ID 自动检测）
- 对话列表搜索、全选可见或按需勾选，支持“全部导出”或“选择导出”
- 导出 ZIP，内含 JSON / Markdown / HTML（可自由组合）
- 内置中英双语 UI 切换

## 安装（开发者模式）
以 Chrome/Edge 为例：
1. 下载/克隆本仓库。
2. 打开 `chrome://extensions` 或 `edge://extensions`，开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本仓库根目录。
4. 打开 chatgpt.com，右下角出现“导出会话”按钮，点击即可打开侧栏。

## 使用
1. 点击右下角“导出会话”按钮打开/收起侧栏。
2. 切换语言（中文/English）及模式（个人/团队，团队需 Workspace ID）。
3. 点击“加载”获取对话列表，支持搜索/全选可见/单独勾选。
4. 选择导出格式（JSON/Markdown/HTML），选择“全部”或“选择”，点击“导出”生成 ZIP。

## 目录结构
- `content.js`：入口浮动按钮注入
- `src/ui/panel.js`, `src/ui/styles.css`：侧栏 UI 与样式
- `src/core/api.js`, `src/core/exporter.js`, `src/core/utils.js`：数据获取与打包导出
- `jszip.min.js`：内置压缩库（按 manifest 顺序注入）

## 打包
需要 crx 时，可用浏览器扩展打包功能，选择本目录为源；`manifest.json` 已配置权限。

## 版本
- 当前：9.0.1（命名“ChatGPT 导出聊天记录（团队和个人通用）”）

## 许可
本仓库采用 **MIT License**，可自由用于个人和商业项目，需保留版权和许可声明，详见 `LICENSE.md`。

---

# English

## Overview
**ChatGPT Chat Export (Personal & Team)**: A right-sidebar browser extension to export chats from ChatGPT workspaces (personal/team) into JSON / Markdown / HTML.

## Features
- Right-side panel that doesn’t block the input box; chat while exporting
- Personal or Team mode (Workspace ID auto-detection supported)
- Search, select visible, or pick specific conversations; export all or selected
- ZIP output containing JSON / Markdown / HTML (pick any combination)
- Built-in UI language toggle (EN/中文)

## Install (Developer Mode)
Chrome/Edge:
1. Download/clone this repo.
2. Open `chrome://extensions` or `edge://extensions`, enable “Developer mode”.
3. Click “Load unpacked” and choose this repo root.
4. Open chatgpt.com; a “导出会话” button appears at bottom-right to open the panel.

## Usage
1. Click “导出会话” to open/close the sidebar.
2. Pick language (EN/中文) and mode (Personal/Team; Team needs Workspace ID).
3. Click “Load” to fetch conversations; search/select as needed.
4. Choose formats (JSON/Markdown/HTML), pick “All” or “Select”, then “Export” to get a ZIP.

## Structure
- `content.js`: injects the floating entry button
- `src/ui/panel.js`, `src/ui/styles.css`: sidebar UI & styles
- `src/core/api.js`, `src/core/exporter.js`, `src/core/utils.js`: data fetching and export
- `jszip.min.js`: bundled compression library (loaded per manifest order)

## Build
For a crx, use the browser’s pack extension tool with this folder as source; `manifest.json` already includes permissions.

## Version
- Current: 9.0.1 (“ChatGPT 导出聊天记录（团队和个人通用)”)

## License
This repo uses the **MIT License**. You can use it for personal and commercial projects; keep the copyright and license notice. See `LICENSE.md` for details.
