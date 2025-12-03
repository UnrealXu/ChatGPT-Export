(function () {
    'use strict';

    const Utils = {
        BASE_DELAY: 600,
        JITTER: 400,
        PAGE_LIMIT: 100,

        sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
        jitter() { return Utils.BASE_DELAY + Math.random() * Utils.JITTER; },

        sanitizeFilename(name) {
            return String(name || '').replace(/[\/\\?%*:|"<>]/g, '-').trim();
        },

        formatTimeSeconds(sec) {
            if (!sec || !Number.isFinite(sec)) return '';
            try { return new Date(sec * 1000).toLocaleString(); } catch { return ''; }
        },

        getCookie(name) {
            const m = document.cookie.match(new RegExp(`${name}=([^;]+)`));
            return m ? m[1] : null;
        },

        getOaiDeviceId() {
            return Utils.getCookie('oai-did');
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = String(text ?? '');
            return div.innerHTML;
        },

        // 给 folder checkbox 设置 indeterminate
        setIndeterminate(checkbox, val) {
            try { checkbox.indeterminate = !!val; } catch {}
        }
    };

    window.__CGPTE_Utils = Utils;
})();
