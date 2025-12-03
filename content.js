(function () {
    'use strict';

    function waitForBody(cb) {
        if (document.body) return cb();
        const mo = new MutationObserver(() => {
            if (document.body) { mo.disconnect(); cb(); }
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    function addFloatingButton() {
        if (document.getElementById('cgpte-fab')) return;

        if (!document.getElementById('cgpte-fab-style')) {
            const style = document.createElement('style');
            style.id = 'cgpte-fab-style';
            style.textContent = `
            #cgpte-fab{
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 1000001;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,.24);
                background: #1a1b1e;
                color: #e5e7eb;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 12px 30px rgba(0,0,0,.28);
                transition: transform .14s ease, box-shadow .14s ease, background .14s ease;
            }
            #cgpte-fab:hover{
                transform: translateY(-1px);
                box-shadow: 0 16px 34px rgba(0,0,0,.32);
                background: #1f2024;
            }
            #cgpte-fab:active{ transform: translateY(0); }
            #cgpte-fab .cgpte-fab-icon{ font-size: 14px; opacity:.9; }
            `;
            document.head.appendChild(style);
        }

        const btn = document.createElement('button');
        btn.id = 'cgpte-fab';
        btn.type = 'button';
        btn.innerHTML = `<span class="cgpte-fab-icon">⇩</span><span>导出会话</span>`;
        btn.setAttribute('aria-label', '导出会话');

        btn.addEventListener('click', () => {
            window.__CGPTE_Panel?.toggle?.();
        });

        document.documentElement.appendChild(btn);
    }

    waitForBody(() => {
        // 给页面加载一点时间，确保 ChatGPT 样式/DOM 稳定
        setTimeout(addFloatingButton, 800);
    });
})();
