(() => {
  const K = 'meike-link-book';
  const DB = 'meike-link-files-v1';
  const STORE = 'files';
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const $ = id => document.getElementById(id);
  const list = $('linkList');
  const fileInput = $('linkFileInput');
  const dropZone = $('linkFileDrop');
  const fileMessage = $('linkFileMessage');
  if (!list) return;

  let editingId = null;
  let renderToken = 0;
  let viewer = null;
  const viewerObjectUrls = [];
  const objectUrls = new Set();
  const read = () => { try { const value = JSON.parse(localStorage.getItem(K) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const write = items => { localStorage.setItem(K, JSON.stringify(items)); window.dispatchEvent(new Event('meike-local-data-changed')); };
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const formatDate = value => new Date(value || Date.now()).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const extension = name => String(name || '').split('.').pop()?.toUpperCase().slice(0, 5) || 'FILE';
  const message = text => { if (fileMessage) fileMessage.textContent = text || ''; };

  const openDb = () => new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(Error('当前浏览器不支持本地文件库'));
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, action) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  };
  const getFile = fileId => run('readonly', store => store.get(fileId)).catch(() => null);
  const putFile = record => run('readwrite', store => store.put(record));
  const removeFile = fileId => run('readwrite', store => store.delete(fileId)).catch(() => null);
  const clearObjectUrls = () => { objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls.clear(); };
  const objectUrl = blob => { const url = URL.createObjectURL(blob); objectUrls.add(url); return url; };

  const viewerUrl = blob => { const url = URL.createObjectURL(blob); viewerObjectUrls.push(url); return url; };
  const viewerDocument = (title, body) => new Blob([`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>html{background:#eef3fb;color:#34415a;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}body{box-sizing:border-box;width:min(920px,calc(100% - 32px));min-height:calc(100vh - 32px);margin:16px auto;padding:42px 48px;background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(50,67,96,.12);line-height:1.8;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{width:100%;border-collapse:collapse}td,th{border:1px solid #d7dfec;padding:7px 10px;text-align:left}pre{white-space:pre-wrap;font:inherit}.unsupported{display:grid;place-items:center;min-height:65vh;text-align:center}.unsupported div{max-width:520px}.unsupported b{display:block;margin-bottom:14px;font-size:64px;color:#8aa5d8}.unsupported h2{margin:0 0 10px}.unsupported p{color:#71809d}@media(max-width:600px){body{width:100%;min-height:100vh;margin:0;padding:24px 20px;border-radius:0}}</style></head><body>${body}</body></html>`], { type: 'text/html' });
  function closeViewer() {
    if (!viewer) return;
    const frame = viewer.querySelector('iframe');
    if (frame) frame.src = 'about:blank';
    viewer.remove();
    viewer = null;
    viewerObjectUrls.splice(0).forEach(URL.revokeObjectURL);
  }
  function createViewer(item, blob) {
    closeViewer();
    viewer = document.createElement('section');
    viewer.className = 'link-file-viewer';
    viewer.innerHTML = `<header><button type="button" class="link-viewer-back" aria-label="关闭文件">‹</button><h2>${esc(item.name || item.fileName || '本地文件')}</h2><div><button type="button" class="link-viewer-download">下载原文件</button><button type="button" class="link-viewer-close" aria-label="关闭文件">×</button></div></header><div class="link-viewer-loading">正在准备预览…</div><iframe title="${esc(item.name || item.fileName || '文件预览')}" hidden></iframe>`;
    const download = () => { const link = document.createElement('a'); link.href = viewerUrl(blob); link.download = item.fileName || item.name || '文件'; link.click(); };
    viewer.querySelector('.link-viewer-download').onclick = download;
    viewer.querySelector('.link-viewer-back').onclick = closeViewer;
    viewer.querySelector('.link-viewer-close').onclick = closeViewer;
    document.body.append(viewer);
    return viewer;
  }
  async function openStoredFile(item, blob) {
    if (!(blob instanceof Blob)) return;
    const panel = createViewer(item, blob);
    const frame = panel.querySelector('iframe');
    const loading = panel.querySelector('.link-viewer-loading');
    const ext = String(item.fileName || item.name || '').split('.').pop()?.toLowerCase() || '';
    try {
      let source;
      if (ext === 'pdf' || blob.type === 'application/pdf') {
        frame.removeAttribute('sandbox');
        source = `${viewerUrl(blob)}#view=FitH`;
      } else if (ext === 'docx') {
        if (!window.mammoth?.convertToHtml) throw Error('Word 阅读组件未能加载');
        const result = await window.mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        source = viewerUrl(viewerDocument(item.name || item.fileName, result.value || '<p>文档没有可显示的正文。</p>'));
        frame.setAttribute('sandbox', '');
      } else if (blob.type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
        const imageSource = viewerUrl(blob);
        source = viewerUrl(viewerDocument(item.name || item.fileName, `<p style="text-align:center"><img src="${imageSource}" alt="${esc(item.name || item.fileName)}"></p>`));
        frame.setAttribute('sandbox', '');
      } else if (['txt', 'md', 'markdown', 'csv', 'rtf'].includes(ext) || blob.type?.startsWith('text/')) {
        source = viewerUrl(viewerDocument(item.name || item.fileName, `<pre>${esc(await blob.text())}</pre>`));
        frame.setAttribute('sandbox', '');
      } else if (['html', 'htm'].includes(ext)) {
        source = viewerUrl(new Blob([await blob.text()], { type: 'text/html' }));
        frame.setAttribute('sandbox', '');
      } else {
        const label = ext ? ext.toUpperCase() : 'FILE';
        source = viewerUrl(viewerDocument(item.name || item.fileName, `<div class="unsupported"><div><b>${esc(label)}</b><h2>这种格式暂时不能在网页内预览</h2><p>老式 DOC、PPT、Excel 和压缩文件需要使用电脑或平板上的对应应用打开。这里不会自动下载；需要时请点击上方“下载原文件”。</p></div></div>`));
        frame.setAttribute('sandbox', '');
      }
      if (panel !== viewer) return;
      frame.onload = () => { loading.hidden = true; frame.hidden = false; };
      frame.src = source;
    } catch (error) {
      if (panel !== viewer) return;
      loading.innerHTML = `<strong>暂时无法预览这个文件</strong><small>${esc(error.message || '文件内容无法读取')}。原文件仍然完好，可以点击“下载原文件”。</small>`;
    }
  }

  function reset() {
    editingId = null;
    $('linkName').value = '';
    $('linkUrl').value = '';
    $('saveLink').textContent = '添加网址';
  }

  function fileAction(label, action, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    if (!disabled) button.onclick = action;
    return button;
  }

  async function render() {
    const token = ++renderToken;
    clearObjectUrls();
    const items = read();
    const fileRecords = await Promise.all(items.map(item => item.type === 'file' ? getFile(item.fileId || item.id) : null));
    if (token !== renderToken) return;
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div class="link-list-empty">这里还是空的，添加一个网址或拖入一份文件吧。</div>';
      return;
    }
    items.forEach((item, index) => {
      if (item.type === 'file') {
        const stored = fileRecords[index];
        const row = document.createElement('article');
        row.className = 'link-item link-item-file card';
        const icon = document.createElement('span');
        icon.className = 'link-file-icon';
        icon.textContent = extension(item.fileName || item.name);
        const main = document.createElement('div');
        main.className = 'link-file-main';
        main.innerHTML = `<strong>${esc(item.name || item.fileName || '未命名文件')}</strong><div class="link-file-meta"><span>${esc(item.fileName || '')}</span><span>·</span><span>${formatSize(item.size || stored?.blob?.size || 0)}</span><span>·</span><span>${formatDate(item.createdAt)}</span></div>`;
        const badge = document.createElement('span');
        badge.className = `link-local-badge${stored?.blob ? '' : ' is-missing'}`;
        badge.textContent = stored?.blob ? '已保存在本机' : '此设备缺少文件';
        const actions = document.createElement('div');
        actions.className = 'link-actions';
        const fileUrl = stored?.blob ? objectUrl(stored.blob) : '';
        actions.append(
          fileAction('打开', () => openStoredFile(item, stored.blob), !fileUrl),
          fileAction('下载', () => { const link = document.createElement('a'); link.href = fileUrl; link.download = item.fileName || item.name || '文件'; link.click(); }, !fileUrl),
          fileAction('重命名', () => {
            const name = prompt('文件显示名称', item.name || item.fileName || '');
            if (name === null || !name.trim()) return;
            const next = read();
            const target = next.find(entry => entry.id === item.id);
            if (target) { target.name = name.trim(); target.updatedAt = new Date().toISOString(); write(next); render(); }
          }),
          fileAction('×', async () => {
            if (!confirm(`删除文件「${item.name || item.fileName}」？`)) return;
            const next = read().filter(entry => entry.id !== item.id);
            await removeFile(item.fileId || item.id);
            write(next);
            render();
          })
        );
        actions.lastElementChild.title = '删除';
        row.append(icon, main, badge, actions);
        list.append(row);
        return;
      }

      const row = document.createElement('article');
      row.className = 'link-item card';
      const open = document.createElement('a');
      open.href = item.url;
      open.target = '_blank';
      open.rel = 'noopener';
      open.textContent = item.name;
      const url = document.createElement('small');
      url.textContent = item.url;
      const actions = document.createElement('div');
      actions.className = 'link-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '编辑';
      edit.title = '编辑网址';
      edit.onclick = () => { editingId = item.id || String(index); $('linkName').value = item.name || ''; $('linkUrl').value = item.url || ''; $('saveLink').textContent = '保存修改'; $('linkName').focus(); };
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = '删除';
      remove.onclick = () => { if (!confirm(`删除网址「${item.name || item.url}」？`)) return; const next = read(); next.splice(index, 1); write(next); if (editingId === (item.id || String(index))) reset(); render(); };
      actions.append(edit, remove);
      row.append(open, url, actions);
      list.append(row);
    });
  }

  async function addFiles(files) {
    const accepted = [...(files || [])];
    if (!accepted.length) return;
    const oversized = accepted.filter(file => file.size > MAX_FILE_SIZE);
    const usable = accepted.filter(file => file.size <= MAX_FILE_SIZE);
    if (!usable.length) { message('文件过大：单个文件请控制在 50 MB 以内。'); return; }
    message(`正在保存 ${usable.length} 个文件…`);
    const items = read();
    let saved = 0;
    for (const file of usable) {
      const recordId = makeId();
      try {
        await putFile({ id: recordId, name: file.name, type: file.type, size: file.size, addedAt: Date.now(), blob: file });
        const now = new Date().toISOString();
        items.unshift({ id: recordId, type: 'file', fileId: recordId, name: file.name.replace(/\.[^.]+$/, '') || file.name, fileName: file.name, mime: file.type, size: file.size, createdAt: now, updatedAt: now, localOnly: true });
        saved += 1;
      } catch (error) { message(`保存失败：${error.message || '本机存储空间不足'}`); }
    }
    if (saved) write(items);
    message(`已加入 ${saved} 个文件${oversized.length ? `，另有 ${oversized.length} 个超过 50 MB 未添加` : ''}。`);
    render();
  }

  $('saveLink').onclick = () => {
    let name = $('linkName').value.trim(), url = $('linkUrl').value.trim();
    if (!url) return $('linkUrl').focus();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch { return $('linkUrl').focus(); }
    const items = read();
    const existing = items.findIndex((item, index) => (item.id || String(index)) === editingId);
    const now = new Date().toISOString();
    const item = { id: existing >= 0 ? items[existing].id || String(existing) : makeId(), type: 'url', name: name || new URL(url).hostname, url, createdAt: existing >= 0 ? items[existing].createdAt || now : now, updatedAt: now };
    if (existing >= 0) items[existing] = item; else items.push(item);
    write(items);
    reset();
    render();
  };

  if (fileInput && dropZone) {
    fileInput.onchange = () => { addFiles(fileInput.files); fileInput.value = ''; };
    dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); } });
    ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add('is-dragging'); }));
    ['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove('is-dragging'); }));
    dropZone.addEventListener('drop', event => addFiles(event.dataTransfer?.files));
  }
  document.querySelector('.nav[data-view="links"]')?.addEventListener('click', () => { document.getElementById('title').textContent = '网址与文件'; render(); });
  window.addEventListener('meike-data-synced', render);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && viewer) closeViewer(); });
  document.addEventListener('click', event => { if (viewer && event.target.closest('.nav')) closeViewer(); });
  window.addEventListener('beforeunload', () => { closeViewer(); clearObjectUrls(); });
  render();
})();
