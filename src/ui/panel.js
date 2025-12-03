(function () {
    'use strict';

    const U = window.__CGPTE_Utils;
    const API = window.__CGPTE_API;
    const Exporter = window.__CGPTE_Exporter;

    const I18N = {
        zh: {
            title: '导出聊天记录',
            close: '关闭',
            jsonLabel: 'JSON',
            jsonHelp: '原始对话数据',
            markdownLabel: 'Markdown',
            markdownHelp: '易读文本导出',
            htmlLabel: 'HTML',
            htmlHelp: '独立网页导出',
            personal: '个人',
            team: '团队',
            teamIdLabel: '团队 Workspace ID',
            teamHint: '粘贴 ws-... 或 UUID（自动检测）',
            teamHintDetected: ({ ids }) => `检测到：${ids}`,
            all: '全部',
            select: '选择',
            listLabel: '对话列表',
            listHelp: '加载列表后，在树中勾选（Root / Projects）',
            load: '加载',
            searchPlaceholder: '搜索标题 / 项目',
            selectVisible: '全选可见',
            selectNone: '清空选择',
            emptyList: '尚未加载列表',
            noMatch: '没有匹配项',
            hide: '收起',
            export: '导出',
            ready: '就绪',
            preparingToken: '准备凭证…',
            loadingList: '正在加载列表…',
            loadedList: ({ count = 0 }) => `已加载 ${count} 条`,
            accessTokenError: '无法获取 Access Token：刷新页面或打开任意对话后再试',
            formatError: '请至少选择一种导出格式',
            teamIdMissing: '团队模式请先填写 Workspace ID（或等待自动检测）',
            loadFailedPrefix: '加载列表失败：',
            exportFailedPrefix: '导出失败：',
            exportingAll: '正在导出全部…',
            exportingSelected: ({ count = 0 }) => `正在导出已选（${count}）…`,
            exportingProgress: ({ current = 0, total = 0 }) => `正在导出 ${current}/${total}`,
            generatingZip: '正在打包 ZIP…',
            done: '完成',
            noneSelected: '还没有选择任何对话',
            untitled: '未命名对话',
            selectedCount: ({ count = 0 }) => `${count} 条已选`,
            archivedSuffix: ' · 已归档',
            folderAria: ({ folder, selected = 0, total = 0 }) => `文件夹 ${folder} ${selected}/${total}`
        },
        en: {
            title: 'Chat Export',
            close: 'Close',
            jsonLabel: 'JSON',
            jsonHelp: 'Raw conversation payload',
            markdownLabel: 'Markdown',
            markdownHelp: 'Readable text export',
            htmlLabel: 'HTML',
            htmlHelp: 'Standalone web page',
            personal: 'Personal',
            team: 'Team',
            teamIdLabel: 'Team Workspace ID',
            teamHint: 'Paste ws-... or UUID (auto-detected if any)',
            teamHintDetected: ({ ids }) => `Detected: ${ids}`,
            all: 'All',
            select: 'Select',
            listLabel: 'Conversation list',
            listHelp: 'Load list, then pick in the tree (Root / Projects)',
            load: 'Load',
            searchPlaceholder: 'Search title / project',
            selectVisible: 'Select visible',
            selectNone: 'Select none',
            emptyList: 'No list loaded.',
            noMatch: 'No match.',
            hide: 'Hide',
            export: 'Export',
            ready: 'Ready',
            preparingToken: 'Preparing token…',
            loadingList: 'Loading list…',
            loadedList: ({ count = 0 }) => `Loaded ${count}`,
            accessTokenError: 'Unable to get Access Token: refresh or open any chat and try again',
            formatError: 'Select at least one format',
            teamIdMissing: 'Team mode requires a Workspace ID (or wait for detection)',
            loadFailedPrefix: 'Load failed: ',
            exportFailedPrefix: 'Export failed: ',
            exportingAll: 'Exporting all…',
            exportingSelected: ({ count = 0 }) => `Exporting selected (${count})…`,
            exportingProgress: ({ current = 0, total = 0 }) => `Exporting ${current}/${total}`,
            generatingZip: 'Generating ZIP…',
            done: 'Done',
            noneSelected: 'No conversations selected',
            untitled: 'Untitled Conversation',
            selectedCount: ({ count = 0 }) => `${count} selected`,
            archivedSuffix: ' · Archived',
            folderAria: ({ folder, selected = 0, total = 0 }) => `Folder ${folder} ${selected}/${total}`
        }
    };

    const State = {
        open: false,
        loadingList: false,
        metas: [],
        checkedIds: new Set(),
        openGroups: new Set(['Root']),
        formats: { json: true, markdown: true, html: true },
        mode: 'personal',
        scope: 'selected',
        lang: 'zh',
        teamWorkspaceId: '',
        workspaceDetected: [],
        lastStatus: null
    };

    function t(key, params) {
        const dict = I18N[State.lang] || I18N.en;
        let val = dict[key] ?? I18N.en[key] ?? key;
        if (typeof val === 'function') return val(params || {});
        if (params) {
            return val.replace(/\{(\w+)\}/g, (_, k) => (params && params[k] !== undefined ? params[k] : ''));
        }
        return val;
    }

    function ensureDom() {
        if (document.getElementById('cgpte-panel')) return;

        const overlay = document.createElement('div');
        overlay.id = 'cgpte-overlay';

        const panel = document.createElement('div');
        panel.id = 'cgpte-panel';

        panel.innerHTML = `
      <div class="cgpte-header">
        <div class="cgpte-title" data-i18n="title"></div>
        <button class="cgpte-lang-toggle" id="lang-toggle" aria-label="Language">中文</button>
        <button class="cgpte-close" id="cgpte-close" data-i18n="close"></button>
      </div>

      <div class="cgpte-body">
        <div class="cgpte-section">
          <div class="row">
            <div class="left">
              <div class="label" data-i18n="jsonLabel"></div>
              <div class="help" data-i18n="jsonHelp"></div>
            </div>
            <div class="cgpte-switch" id="sw-json" role="switch" aria-checked="true"></div>
          </div>
          <div class="row">
            <div class="left">
              <div class="label" data-i18n="markdownLabel"></div>
              <div class="help" data-i18n="markdownHelp"></div>
            </div>
            <div class="cgpte-switch" id="sw-md" role="switch" aria-checked="true"></div>
          </div>
          <div class="row">
            <div class="left">
              <div class="label" data-i18n="htmlLabel"></div>
              <div class="help" data-i18n="htmlHelp"></div>
            </div>
            <div class="cgpte-switch" id="sw-html" role="switch" aria-checked="true"></div>
          </div>
        </div>

        <div class="cgpte-section">
          <div class="cgpte-chipbar">
            <button class="cgpte-chip" id="chip-personal" aria-pressed="true" data-i18n="personal"></button>
            <button class="cgpte-chip" id="chip-team" aria-pressed="false" data-i18n="team"></button>
          </div>
          <div class="row" id="team-row" style="display:none;">
            <div class="left" style="flex:1;">
              <div class="label" data-i18n="teamIdLabel"></div>
              <div class="help" id="team-hint" data-i18n="teamHint"></div>
              <div style="margin-top:8px;">
                <input class="cgpte-input" id="team-id" data-i18n-placeholder="teamHint" placeholder="">
              </div>
            </div>
          </div>
        </div>

        <div class="cgpte-section">
          <div class="cgpte-chipbar">
            <button class="cgpte-chip" id="chip-all" aria-pressed="false" data-i18n="all"></button>
            <button class="cgpte-chip" id="chip-selected" aria-pressed="true" data-i18n="select"></button>
          </div>

          <div class="row">
            <div class="left" style="flex:1;">
              <div class="label" data-i18n="listLabel"></div>
              <div class="help" data-i18n="listHelp"></div>
            </div>
            <button class="cgpte-btn secondary" id="btn-load" data-i18n="load"></button>
          </div>

          <div class="row" id="search-row">
            <div class="left" style="flex:1;">
              <input class="cgpte-input" id="search" data-i18n-placeholder="searchPlaceholder" placeholder="">
            </div>
          </div>

          <div class="cgpte-chipbar" id="sel-tools">
            <button class="cgpte-chip" id="btn-all-vis" aria-pressed="false" data-i18n="selectVisible"></button>
            <button class="cgpte-chip" id="btn-none" aria-pressed="false" data-i18n="selectNone"></button>
            <div style="margin-left:auto;color:var(--c-sub);font-size:12px;" id="sel-count"></div>
          </div>

          <div class="cgpte-tree" id="tree"></div>
        </div>
      </div>

      <div class="cgpte-footer">
        <div class="cgpte-status" id="status"></div>
        <button class="cgpte-btn secondary" id="btn-hide" data-i18n="hide"></button>
        <button class="cgpte-btn" id="btn-export" data-i18n="export"></button>
      </div>
    `;

        document.documentElement.appendChild(overlay);
        document.documentElement.appendChild(panel);

        panel.querySelector('#cgpte-close').addEventListener('click', close);
        panel.querySelector('#btn-hide').addEventListener('click', close);
        panel.querySelector('#lang-toggle').addEventListener('click', () => {
            State.lang = State.lang === 'zh' ? 'en' : 'zh';
            applyLanguage();
            renderTree();
        });

        bindSwitch(panel, 'sw-json', () => State.formats.json, v => (State.formats.json = v));
        bindSwitch(panel, 'sw-md', () => State.formats.markdown, v => (State.formats.markdown = v));
        bindSwitch(panel, 'sw-html', () => State.formats.html, v => (State.formats.html = v));

        panel.querySelector('#chip-personal').addEventListener('click', () => setMode('personal'));
        panel.querySelector('#chip-team').addEventListener('click', () => setMode('team'));
        panel.querySelector('#chip-all').addEventListener('click', () => setScope('all'));
        panel.querySelector('#chip-selected').addEventListener('click', () => setScope('selected'));

        panel.querySelector('#team-id').addEventListener('input', (e) => {
            State.teamWorkspaceId = e.target.value.trim();
        });

        panel.querySelector('#btn-load').addEventListener('click', async () => {
            await loadList();
        });

        panel.querySelector('#search').addEventListener('input', () => renderTree());

        panel.querySelector('#btn-all-vis').addEventListener('click', () => {
            const ids = getVisibleMetas().map(m => m.id);
            ids.forEach(id => State.checkedIds.add(id));
            syncFolderCheckboxes();
            updateCount();
            renderTree();
        });
        panel.querySelector('#btn-none').addEventListener('click', () => {
            State.checkedIds.clear();
            syncFolderCheckboxes();
            updateCount();
            renderTree();
        });

        panel.querySelector('#btn-export').addEventListener('click', async () => {
            await exportNow();
        });

        State.workspaceDetected = API.detectAllWorkspaceIds();
        applyLanguage();
        renderTree();
    }

    function bindSwitch(panel, id, get, set) {
        const el = panel.querySelector(`#${id}`);
        const apply = () => {
            el.dataset.on = String(!!get());
            el.setAttribute('aria-checked', String(!!get()));
        };
        apply();
        el.addEventListener('click', () => {
            set(!get());
            apply();
        });
    }

    function setMode(mode) {
        State.mode = mode;
        syncAllUI();
    }

    function setScope(scope) {
        State.scope = scope;
        syncAllUI();
        renderTree();
    }

    function syncAllUI() {
        const panel = document.getElementById('cgpte-panel');
        if (!panel) return;

        panel.querySelector('#chip-personal').setAttribute('aria-pressed', String(State.mode === 'personal'));
        panel.querySelector('#chip-team').setAttribute('aria-pressed', String(State.mode === 'team'));
        panel.querySelector('#team-row').style.display = State.mode === 'team' ? 'block' : 'none';

        panel.querySelector('#chip-all').setAttribute('aria-pressed', String(State.scope === 'all'));
        panel.querySelector('#chip-selected').setAttribute('aria-pressed', String(State.scope === 'selected'));

        const showSelect = State.scope === 'selected';
        panel.querySelector('#search-row').style.display = showSelect ? 'block' : 'none';
        panel.querySelector('#sel-tools').style.display = showSelect ? 'flex' : 'none';
        panel.querySelector('#tree').style.display = showSelect ? 'block' : 'none';
    }

    function setStatusRaw(text) {
        State.lastStatus = { key: null, params: null, text };
        const el = document.getElementById('status');
        if (el) el.textContent = text || '';
    }

    function setStatusKey(key, params) {
        State.lastStatus = { key, params: params || null, text: null };
        const el = document.getElementById('status');
        if (el) el.textContent = t(key, params);
    }

    function refreshStatusForLang() {
        if (!State.lastStatus) {
            setStatusKey('ready');
            return;
        }
        const { key, params, text } = State.lastStatus;
        if (key) setStatusKey(key, params);
        else setStatusRaw(text);
    }

    function updateCount() {
        const el = document.getElementById('sel-count');
        if (el) el.textContent = t('selectedCount', { count: State.checkedIds.size });
    }

    function applyLanguage() {
        const panel = document.getElementById('cgpte-panel');
        if (!panel) return;

        panel.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });
        panel.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
        const langBtn = panel.querySelector('#lang-toggle');
        if (langBtn) langBtn.textContent = State.lang === 'zh' ? '中文' : 'EN';

        const hint = panel.querySelector('#team-hint');
        if (hint) {
            hint.textContent = State.workspaceDetected.length
                ? t('teamHintDetected', { ids: State.workspaceDetected.join(', ') })
                : t('teamHint');
        }

        refreshStatusForLang();
        updateCount();
        syncAllUI();
    }

    function open() {
        ensureDom();
        document.getElementById('cgpte-overlay').classList.add('open');
        document.getElementById('cgpte-panel').classList.add('open');
        setStatusKey('ready');
        State.open = true;
    }

    function close() {
        const o = document.getElementById('cgpte-overlay');
        const p = document.getElementById('cgpte-panel');
        if (o) o.classList.remove('open');
        if (p) p.classList.remove('open');
        State.open = false;
    }

    function displayFolderLabel(key) {
        if (State.lang !== 'zh') return key;
        if (key === 'Root / Active') return '根目录 / 活跃';
        if (key === 'Root / Archived') return '根目录 / 已归档';
        if (key === 'Root') return '根目录';
        if (key.startsWith('Project / ')) return `项目 / ${key.replace('Project / ', '')}`;
        return key;
    }

    function groupMetas(list) {
        const map = new Map();

        for (const m of list) {
            let folderKey = m.folder || 'Root';
            if (folderKey === 'Root') folderKey = m.group || 'Root';
            if (!map.has(folderKey)) {
                map.set(folderKey, {
                    key: folderKey,
                    label: folderKey,
                    items: []
                });
            }
            map.get(folderKey).items.push(m);
        }

        const groups = Array.from(map.values());

        const rank = (k) => {
            if (k === 'Root / Active') return 0;
            if (k === 'Root / Archived') return 1;
            if (k === 'Root') return 2;
            return 10;
        };

        groups.sort((a, b) => {
            const ra = rank(a.key), rb = rank(b.key);
            if (ra !== rb) return ra - rb;
            return String(a.label).localeCompare(String(b.label), 'zh-Hans-CN');
        });

        for (const g of groups) g.items.sort((a, b) => (b.update_time || 0) - (a.update_time || 0));
        return groups;
    }

    function getVisibleMetas() {
        const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
        if (!q) return State.metas.slice();
        return State.metas.filter(m =>
            String(m.title || '').toLowerCase().includes(q) ||
            String(m.group || '').toLowerCase().includes(q) ||
            String(m.folder || '').toLowerCase().includes(q)
        );
    }

    function syncFolderCheckboxes() {
        const panel = document.getElementById('cgpte-panel');
        if (!panel) return;
        const folderCbs = panel.querySelectorAll('[data-folder-cb="1"]');
        folderCbs.forEach(cb => {
            const folderKey = cb.getAttribute('data-folder-key');
            const ids = (cb.getAttribute('data-folder-ids') || '').split('|').filter(Boolean);
            const selected = ids.filter(id => State.checkedIds.has(id)).length;

            if (selected === 0) {
                cb.checked = false;
                U.setIndeterminate(cb, false);
            } else if (selected === ids.length) {
                cb.checked = true;
                U.setIndeterminate(cb, false);
            } else {
                cb.checked = false;
                U.setIndeterminate(cb, true);
            }
            cb.setAttribute('aria-label', t('folderAria', { folder: displayFolderLabel(folderKey), selected, total: ids.length }));
        });
    }

    function renderTree() {
        const tree = document.getElementById('tree');
        if (!tree) return;
        tree.innerHTML = '';

        if (!State.metas.length) {
            tree.innerHTML = `<div style="padding:10px;color:var(--c-sub);font-size:12px;">${t('emptyList')}</div>`;
            updateCount();
            return;
        }

        const filtered = getVisibleMetas();
        const groups = groupMetas(filtered);

        if (!filtered.length) {
            tree.innerHTML = `<div style="padding:10px;color:var(--c-sub);font-size:12px;">${t('noMatch')}</div>`;
            updateCount();
            return;
        }

        const frag = document.createDocumentFragment();

        for (const g of groups) {
            if (!g.items.length) continue;

            const details = document.createElement('details');
            details.open = State.openGroups.has(g.key);

            details.addEventListener('toggle', () => {
                if (details.open) State.openGroups.add(g.key);
                else State.openGroups.delete(g.key);
            });

            const summary = document.createElement('summary');

            const caret = document.createElement('div');
            caret.className = 'cgpte-caret';
            caret.textContent = '>';

            const folderName = document.createElement('div');
            folderName.className = 'cgpte-foldername';
            folderName.textContent = displayFolderLabel(g.label);

            const folderMeta = document.createElement('div');
            folderMeta.className = 'cgpte-foldermeta';
            folderMeta.textContent = `${g.items.length}`;

            const folderCb = document.createElement('input');
            folderCb.type = 'checkbox';
            folderCb.className = 'cgpte-check';
            folderCb.setAttribute('data-folder-cb', '1');
            folderCb.setAttribute('data-folder-key', g.key);
            folderCb.setAttribute('data-folder-ids', g.items.map(x => x.id).join('|'));
            folderCb.addEventListener('click', (e) => e.stopPropagation());
            folderCb.addEventListener('change', () => {
                const ids = g.items.map(x => x.id);
                if (folderCb.checked) ids.forEach(id => State.checkedIds.add(id));
                else ids.forEach(id => State.checkedIds.delete(id));
                syncFolderCheckboxes();
                updateCount();
                renderTree();
            });

            summary.appendChild(caret);
            summary.appendChild(folderCb);
            summary.appendChild(folderName);
            summary.appendChild(folderMeta);

            details.appendChild(summary);

            for (const item of g.items) {
                const row = document.createElement('div');
                row.className = 'cgpte-item';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'cgpte-check';
                cb.checked = State.checkedIds.has(item.id);
                cb.addEventListener('change', () => {
                    if (cb.checked) State.checkedIds.add(item.id);
                    else State.checkedIds.delete(item.id);
                    syncFolderCheckboxes();
                    updateCount();
                });

                const txt = document.createElement('div');
                txt.className = 'txt';

                const t1 = document.createElement('div');
                t1.className = 't1';
                t1.textContent = item.title || t('untitled');

                const t2 = document.createElement('div');
                t2.className = 't2';
                const time = U.formatTimeSeconds(item.update_time) || U.formatTimeSeconds(item.create_time) || '';
                const suffix = item.is_archived ? t('archivedSuffix') : '';
                t2.textContent = `${time}${suffix}`;

                txt.appendChild(t1);
                txt.appendChild(t2);

                row.appendChild(cb);
                row.appendChild(txt);
                details.appendChild(row);
            }

            frag.appendChild(details);
        }

        tree.appendChild(frag);

        syncFolderCheckboxes();
        updateCount();
    }

    function translateProgressText(msg) {
        if (State.lang !== 'zh') return msg;
        return String(msg || '')
            .replace(/Loading\s*·\s*/i, '正在加载 · ')
            .replace(/Root \/ Active/gi, '根目录 / 活跃')
            .replace(/Root \/ Archived/gi, '根目录 / 已归档')
            .replace(/Project \/ /gi, '项目 / ')
            .replace(/p(\d+)/gi, '第 $1 页');
    }

    async function loadList() {
        if (State.loadingList) return;
        const panel = document.getElementById('cgpte-panel');
        const btn = panel?.querySelector('#btn-load');
        try {
            State.loadingList = true;
            if (btn) btn.disabled = true;

            setStatusKey('preparingToken');
            const token = await API.ensureAccessToken();
            if (!token) throw new Error(t('accessTokenError'));

            const workspaceId = State.mode === 'team'
                ? (State.teamWorkspaceId || State.workspaceDetected[0] || '')
                : null;

            if (State.mode === 'team' && !workspaceId) {
                throw new Error(t('teamIdMissing'));
            }

            setStatusKey('loadingList');
            State.metas = await API.listConversationMetas(
                (msg) => setStatusRaw(translateProgressText(msg)),
                workspaceId,
                State.lang
            );

            State.openGroups.add('Root / Active');
            State.openGroups.add('Root / Archived');

            setStatusKey('loadedList', { count: State.metas.length });
            renderTree();
        } catch (e) {
            console.error(e);
            setStatusRaw(`${t('loadFailedPrefix')}${e.message}`);
            alert(`${t('loadFailedPrefix')}${e.message}`);
        } finally {
            State.loadingList = false;
            if (btn) btn.disabled = false;
        }
    }

    function translateExportStatus(msg) {
        if (State.lang !== 'zh') return msg;
        return String(msg || '')
            .replace(/^Exporting\s+(\d+)\/(\d+)/i, '正在导出 $1/$2')
            .replace(/^Generating ZIP/i, '正在打包 ZIP');
    }

    async function exportNow() {
        const panel = document.getElementById('cgpte-panel');
        const btn = panel?.querySelector('#btn-export');
        try {
            if (btn) btn.disabled = true;

            const formats = {
                json: !!State.formats.json,
                markdown: !!State.formats.markdown,
                html: !!State.formats.html
            };
            if (!formats.json && !formats.markdown && !formats.html) {
                throw new Error(t('formatError'));
            }

            const workspaceId = State.mode === 'team'
                ? (State.teamWorkspaceId || State.workspaceDetected[0] || '')
                : null;

            if (State.mode === 'team' && !workspaceId) {
                throw new Error(t('teamIdMissing'));
            }

            if (!State.metas.length) {
                await loadList();
            }

            const statusProxy = (msg) => setStatusRaw(translateExportStatus(msg));

            if (State.scope === 'all') {
                setStatusKey('exportingAll');
                await Exporter.exportAllFromMetas({
                    mode: State.mode,
                    workspaceId,
                    formats,
                    metas: State.metas,
                    onStatus: statusProxy
                });
                setStatusKey('done');
                return;
            }

            const items = Array.from(State.checkedIds).map(id => {
                const meta = State.metas.find(m => m.id === id);
                return { id, folder: meta?.folder || 'Root' };
            });

            if (!items.length) throw new Error(t('noneSelected'));

            setStatusKey('exportingSelected', { count: items.length });
            await Exporter.exportZip({
                mode: State.mode,
                workspaceId,
                formats,
                scope: { type: 'selected', items },
                onStatus: statusProxy
            });
            setStatusKey('done');
        } catch (e) {
            console.error(e);
            setStatusRaw(`${t('exportFailedPrefix')}${e.message}`);
            alert(`${t('exportFailedPrefix')}${e.message}`);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    window.__CGPTE_Panel = { open, close, toggle: () => (State.open ? close() : open()) };
})();
