(function () {
    'use strict';
  
    try {
    const U = window.__CGPTE_Utils;
    const API = window.__CGPTE_API;
  
    function parseConversation(convData) {
      const mapping = convData.mapping || {};
      const msgs = [];
      for (const key in mapping) {
        const node = mapping[key];
        const message = node && node.message;
        if (!message || !message.content || !message.content.parts) continue;
        const role = message.author && message.author.role;
        if (role !== 'user' && role !== 'assistant') continue;
        const content = message.content.parts.join('\n');
        if (!content || !content.trim()) continue;
        msgs.push({
          role,
          content,
          createTime: message.create_time,
          model: (message.metadata && message.metadata.model_slug) || ''
        });
      }
      msgs.sort((a, b) => (a.createTime || 0) - (b.createTime || 0));
      return {
        title: convData.title || 'Untitled Conversation',
        createTime: convData.create_time,
        updateTime: convData.update_time,
        conversationId: convData.conversation_id,
        model: convData.default_model_slug || '',
        messages: msgs
      };
    }
  
    function markdown(convData) {
      const p = parseConversation(convData);
      let md = `# ${p.title}\n\n`;
      md += `**Conversation ID:** \`${p.conversationId}\`\n\n`;
      if (p.model) md += `**Model:** ${p.model}\n\n`;
      if (p.createTime) md += `**Created:** ${new Date(p.createTime * 1000).toLocaleString()}\n\n`;
      if (p.updateTime) md += `**Last Updated:** ${new Date(p.updateTime * 1000).toLocaleString()}\n\n`;
      md += `---\n\n`;
      p.messages.forEach((msg, index) => {
        const roleLabel = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
        const ts = msg.createTime ? ` (${new Date(msg.createTime * 1000).toLocaleString()})` : '';
        md += `## ${roleLabel}${ts}\n\n${msg.content}\n\n`;
        if (index < p.messages.length - 1) md += `---\n\n`;
      });
      return md;
    }
  
    function html(convData) {
      const p = parseConversation(convData);
  
      const renderContent = (content) => {
        let h = U.escapeHtml(content);
  
        const blocks = [];
        h = h.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
          const idx = blocks.length;
          const blockHtml = `<pre><code class="language-${U.escapeHtml(lang || 'text')}">${U.escapeHtml(code.trim())}</code></pre>`;
          blocks.push(blockHtml);
          return `[[[CODE_BLOCK_${idx}]]]`;
        });
  
        h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
        h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
        h = h.replace(/\n/g, '<br>');
        h = h.replace(/\[\[\[CODE_BLOCK_(\d+)]]]/g, (_, i) => blocks[Number(i)]);
        return h;
      };
  
      return `<!doctype html>
  <html lang="zh-CN">
  <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${U.escapeHtml(p.title)}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#0b0f14;color:#e8edf2;margin:0;padding:22px}
    .wrap{max-width:960px;margin:0 auto}
    .card{background:#0f1720;border:1px solid rgba(255,255,255,.09);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden}
    header{padding:22px 22px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
    h1{font-size:20px;margin:0 0 10px}
    .meta{opacity:.85;font-size:13px;line-height:1.4}
    .msg{padding:16px 22px;border-bottom:1px solid rgba(255,255,255,.06)}
    .msg:last-child{border-bottom:none}
    .role{font-weight:700;font-size:13px;opacity:.9;margin-bottom:8px}
    .user .role{color:#7dd3fc}
    .assistant .role{color:#a7f3d0}
    .content{font-size:14px;line-height:1.7;white-space:normal}
    pre{background:#0b1220;border:1px solid rgba(255,255,255,.08);padding:12px;border-radius:12px;overflow:auto}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    a{color:#7dd3fc;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
  </head>
  <body>
  <div class="wrap">
    <div class="card">
      <header>
        <h1>${U.escapeHtml(p.title)}</h1>
        <div class="meta">
          <div><strong>ID:</strong> ${U.escapeHtml(p.conversationId)}</div>
          ${p.model ? `<div><strong>Model:</strong> ${U.escapeHtml(p.model)}</div>` : ''}
          ${p.createTime ? `<div><strong>Created:</strong> ${new Date(p.createTime * 1000).toLocaleString()}</div>` : ''}
          ${p.updateTime ? `<div><strong>Updated:</strong> ${new Date(p.updateTime * 1000).toLocaleString()}</div>` : ''}
        </div>
      </header>
      ${p.messages.map(m => `
        <div class="msg ${m.role}">
          <div class="role">${m.role === 'user' ? '👤 User' : '🤖 Assistant'}${m.createTime ? ` · ${new Date(m.createTime * 1000).toLocaleString()}` : ''}</div>
          <div class="content">${renderContent(m.content)}</div>
        </div>
      `).join('')}
    </div>
  </div>
  </body>
  </html>`;
    }
  
    function uniqueFilename(convData, ext) {
      const id = String(convData.conversation_id || '').trim() || Math.random().toString(36).slice(2, 10);
      const ts = convData.create_time ? new Date(convData.create_time * 1000) : new Date();
      const tsPart = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
      let base = convData.title;
      if (!base || base.trim().toLowerCase() === 'new chat') base = 'Untitled Conversation';
      return `${U.sanitizeFilename(base)}_${id}_${tsPart}.${ext}`;
    }
  
    function downloadBlob(blob, filename) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
  
    async function exportZip({ mode, workspaceId, formats, scope, onStatus }) {
      if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载（检查 manifest 的加载顺序）');
  
      const token = await API.ensureAccessToken();
      if (!token) throw new Error('无法获取 Access Token：请刷新页面或打开任意对话后再试');
  
      const zip = new JSZip();
      const folderCache = new Map();
  
      const addToFolder = (folderName) => {
        const safe = U.sanitizeFilename(folderName || 'Root') || 'Root';
        if (safe === 'Root') return zip;
        if (!folderCache.has(safe)) folderCache.set(safe, zip.folder(safe));
        return folderCache.get(safe);
      };
  
      if (scope?.type === 'selected') {
        const items = Array.isArray(scope.items) ? scope.items : [];
        if (!items.length) throw new Error('未选择任何对话');
  
        for (let i = 0; i < items.length; i++) {
          const { id, folder } = items[i];
          onStatus?.(`Exporting ${i + 1}/${items.length}`);
          const conv = await API.getConversation(id, workspaceId);
          const folderObj = addToFolder(folder);
  
          if (formats.json) folderObj.file(uniqueFilename(conv, 'json'), JSON.stringify(conv, null, 2));
          if (formats.markdown) folderObj.file(uniqueFilename(conv, 'md'), markdown(conv));
          if (formats.html) folderObj.file(uniqueFilename(conv, 'html'), html(conv));
  
          await U.sleep(U.jitter());
        }
  
        onStatus?.('Generating ZIP…');
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const date = new Date().toISOString().slice(0, 10);
        const filename = mode === 'team'
          ? `chatgpt_team_${workspaceId}_${date}_selected_${items.length}.zip`
          : `chatgpt_personal_${date}_selected_${items.length}.zip`;
        downloadBlob(blob, filename);
        return;
      }
  
      // 全部导出：直接复用“可见元信息列表”更简单（由 UI 先加载 metas）
      throw new Error('全部导出请在 UI 中选择“全部导出”，面板会先加载列表再执行（避免重复扫接口）。');
    }
  
    async function exportAllFromMetas({ mode, workspaceId, formats, metas, onStatus }) {
      if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载（检查 manifest 的加载顺序）');
      const token = await API.ensureAccessToken();
      if (!token) throw new Error('无法获取 Access Token：请刷新页面或打开任意对话后再试');
  
      const zip = new JSZip();
      const folderCache = new Map();
  
      function getFolder(folderName) {
        const safe = U.sanitizeFilename(folderName || 'Root') || 'Root';
        if (safe === 'Root') return zip;
        if (!folderCache.has(safe)) folderCache.set(safe, zip.folder(safe));
        return folderCache.get(safe);
      }
  
      for (let i = 0; i < metas.length; i++) {
        const m = metas[i];
        onStatus?.(`Exporting ${i + 1}/${metas.length}`);
        const conv = await API.getConversation(m.id, workspaceId);
        const folderObj = getFolder(m.folder || 'Root');
  
        if (formats.json) folderObj.file(uniqueFilename(conv, 'json'), JSON.stringify(conv, null, 2));
        if (formats.markdown) folderObj.file(uniqueFilename(conv, 'md'), markdown(conv));
        if (formats.html) folderObj.file(uniqueFilename(conv, 'html'), html(conv));
  
        await U.sleep(U.jitter());
      }
  
      onStatus?.('Generating ZIP…');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const date = new Date().toISOString().slice(0, 10);
      const filename = mode === 'team'
        ? `chatgpt_team_${workspaceId}_${date}_all_${metas.length}.zip`
        : `chatgpt_personal_${date}_all_${metas.length}.zip`;
      downloadBlob(blob, filename);
    }
  
    window.__CGPTE_Exporter = {
      exportZip,
      exportAllFromMetas
    };
    } catch (err) {
      console.error('[CGPTE exporter] init failed', err);
      window.__CGPTE_Exporter = window.__CGPTE_Exporter || {
        exportZip: async () => { throw err; },
        exportAllFromMetas: async () => { throw err; }
      };
    }
  })();
  
