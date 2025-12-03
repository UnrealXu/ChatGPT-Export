(function () {
    'use strict';

    const U = window.__CGPTE_Utils;

    let accessToken = null;
    const capturedWorkspaceIds = new Set();

    function tryCaptureToken(headerLike) {
        let h = null;
        try {
            if (!headerLike) h = null;
            else if (typeof headerLike === 'string') h = headerLike;
            else if (headerLike instanceof Headers) h = headerLike.get('Authorization') || headerLike.get('authorization');
            else if (Array.isArray(headerLike)) {
                const found = headerLike.find(e => Array.isArray(e) && String(e[0]).toLowerCase() === 'authorization');
                h = found ? found[1] : null;
            } else if (typeof headerLike === 'object') {
                h = headerLike.Authorization || headerLike.authorization || null;
            }
        } catch {}
        if (h && /^Bearer\s+(.+)/i.test(h)) {
            const token = h.replace(/^Bearer\s+/i, '');
            if (token && token.toLowerCase() !== 'dummy') accessToken = token;
        }
    }

    // 최소/安全的网络拦截：只抓 token/workspace id
    (function interceptNetwork() {
        const rawFetch = window.fetch;

        function isSameOriginResource(res) {
            try {
                const url = typeof res === 'string' ? new URL(res, location.href) : new URL(res.url, location.href);
                return url.origin === location.origin;
            } catch { return true; }
        }

        function getHeaderValueFromAny(hLike, name) {
            if (!hLike) return null;
            try {
                if (hLike instanceof Headers) return hLike.get(name) || hLike.get(name.toLowerCase());
                if (Array.isArray(hLike)) {
                    const found = hLike.find(p => Array.isArray(p) && (String(p[0]).toLowerCase() === name.toLowerCase()));
                    return found ? found[1] : null;
                }
                if (typeof hLike === 'object') return hLike[name] || hLike[name.toLowerCase()] || null;
            } catch {}
            return null;
        }

        window.fetch = function(resource, options) {
            try {
                if (isSameOriginResource(resource)) {
                    const headerCandidates = [];
                    if (resource && typeof Request !== 'undefined' && resource instanceof Request) headerCandidates.push(resource.headers);
                    if (options && options.headers) headerCandidates.push(options.headers);

                    for (const hc of headerCandidates) {
                        tryCaptureToken(getHeaderValueFromAny(hc, 'Authorization'));
                        const wid = getHeaderValueFromAny(hc, 'ChatGPT-Account-Id');
                        if (wid) capturedWorkspaceIds.add(wid);
                    }
                }
            } catch {}
            return rawFetch.apply(this, arguments);
        };
    })();

    async function fetchWithRetry(input, init = {}, retries = 3) {
        let attempt = 0;
        while (true) {
            try {
                const res = await fetch(input, init);
                if (res.ok) return res;
                if (attempt < retries && (res.status === 429 || res.status >= 500)) {
                    await U.sleep(U.BASE_DELAY * Math.pow(2, attempt) + Math.random() * U.JITTER);
                    attempt++;
                    continue;
                }
                return res;
            } catch (err) {
                if (attempt < retries) {
                    await U.sleep(U.BASE_DELAY * Math.pow(2, attempt) + Math.random() * U.JITTER);
                    attempt++;
                    continue;
                }
                throw err;
            }
        }
    }

    function buildHeaders(workspaceId) {
        const headers = { 'Authorization': `Bearer ${accessToken}` };
        const did = U.getOaiDeviceId();
        if (did) headers['oai-device-id'] = did;
        if (workspaceId) headers['ChatGPT-Account-Id'] = workspaceId;
        return headers;
    }

    async function ensureAccessToken() {
        if (accessToken) return accessToken;
        try {
            const session = await (await fetch('/api/auth/session?unstable_client=true')).json();
            if (session.accessToken) {
                accessToken = session.accessToken;
                return accessToken;
            }
        } catch {}
        return null;
    }

    function detectAllWorkspaceIds() {
        const foundIds = new Set(capturedWorkspaceIds);
        try {
            const data = JSON.parse(document.getElementById('__NEXT_DATA__')?.textContent || '{}');
            const accounts = data?.props?.pageProps?.user?.accounts;
            if (accounts) Object.values(accounts).forEach(acc => { if (acc?.account?.id) foundIds.add(acc.account.id); });
        } catch {}
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                if (key.includes('account') || key.includes('workspace')) {
                    const value = localStorage.getItem(key);
                    if (!value) continue;
                    const v = value.replace(/"/g, '');
                    if (/^ws-[a-f0-9-]{36}$/i.test(v) || /^[a-f0-9-]{36}$/i.test(v)) foundIds.add(v);
                }
            }
        } catch {}
        return Array.from(foundIds);
    }

    async function getProjects(workspaceId) {
        if (!workspaceId) return [];
        const r = await fetchWithRetry(`/backend-api/gizmos/snorlax/sidebar`, { headers: buildHeaders(workspaceId) });
        if (!r.ok) return [];
        const data = await r.json();
        const projects = [];
        data.items?.forEach(item => {
            if (item?.gizmo?.id && item?.gizmo?.display?.name) {
                projects.push({ id: item.gizmo.id, title: item.gizmo.display.name });
            }
        });
        return projects;
    }

    async function listConversationMetas(onProgress, workspaceId, lang = 'en') {
        const headers = buildHeaders(workspaceId);
        const out = [];
        const isZh = lang === 'zh';

        // Root: active + archived
        for (const is_archived of [false, true]) {
            let offset = 0, has_more = true, page = 0;
            do {
                onProgress?.(isZh
                    ? `正在加载 · 根目录 / ${is_archived ? '已归档' : '活跃'} · 第 ${++page} 页`
                    : `Loading · Root / ${is_archived ? 'Archived' : 'Active'} p${++page}`
                );
                const r = await fetchWithRetry(
                    `/backend-api/conversations?offset=${offset}&limit=${U.PAGE_LIMIT}&order=updated${is_archived ? '&is_archived=true' : ''}`,
                    { headers }
                );
                if (!r.ok) throw new Error(`获取 Root 对话列表失败 (${r.status})`);
                const j = await r.json();
                const items = j.items || [];
                for (const it of items) {
                    out.push({
                        id: it.id,
                        title: it.title || 'Untitled Conversation',
                        update_time: it.update_time,
                        create_time: it.create_time,
                        is_archived,
                        group: is_archived ? 'Root / Archived' : 'Root / Active',
                        folder: 'Root',
                        projectId: null
                    });
                }
                has_more = items.length === U.PAGE_LIMIT;
                offset += items.length;
                await U.sleep(U.jitter());
            } while (has_more);
        }

        // Projects
        const projects = await getProjects(workspaceId);
        for (const project of projects) {
            let cursor = '0';
            let page = 0;
            do {
                onProgress?.(isZh
                    ? `正在加载 · 项目 / ${project.title} · 第 ${++page} 页`
                    : `Loading · ${project.title} p${++page}`
                );
                const r = await fetchWithRetry(`/backend-api/gizmos/${project.id}/conversations?cursor=${cursor}`, { headers });
                if (!r.ok) throw new Error(`获取项目对话列表失败 (${r.status})`);
                const j = await r.json();
                const items = j.items || [];
                for (const it of items) {
                    out.push({
                        id: it.id,
                        title: it.title || 'Untitled Conversation',
                        update_time: it.update_time,
                        create_time: it.create_time,
                        is_archived: !!it.is_archived,
                        group: `Project / ${project.title}`,
                        folder: U.sanitizeFilename(project.title) || 'Project',
                        projectId: project.id
                    });
                }
                cursor = j.cursor;
                await U.sleep(U.jitter());
            } while (cursor);
        }

        // dedup + sort
        const seen = new Set();
        const dedup = [];
        for (const m of out) {
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            dedup.push(m);
        }
        dedup.sort((a, b) => (b.update_time || 0) - (a.update_time || 0));
        return dedup;
    }

    async function getConversation(id, workspaceId) {
        const headers = buildHeaders(workspaceId);
        const r = await fetchWithRetry(`/backend-api/conversation/${id}`, { headers });
        if (!r.ok) throw new Error(`获取对话详情失败 ${id} (${r.status})`);
        const j = await r.json();
        j.__fetched_at = new Date().toISOString();
        return j;
    }

    window.__CGPTE_API = {
        ensureAccessToken,
        buildHeaders,
        detectAllWorkspaceIds,
        getProjects,
        listConversationMetas,
        getConversation
    };
})();
