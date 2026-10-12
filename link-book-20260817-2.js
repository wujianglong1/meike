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
          fileAction('打开', () => window.open(fileUrl, '_blank', 'noopener'), !fileUrl),
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
  window.addEventListener('beforeunload', clearObjectUrls);
  render();
})();
