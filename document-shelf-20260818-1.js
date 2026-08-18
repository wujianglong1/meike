(() => {
  const dbName = 'meike-document-shelf-v1';
  const storeName = 'documents';
  const fileInput = document.getElementById('documentFile');
  const list = document.getElementById('documentList');
  if (!fileInput || !list) return;

  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, action) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = action(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  };
  const all = () => run('readonly', store => store.getAll());
  const put = item => run('readwrite', store => store.put(item));
  const remove = id => run('readwrite', store => store.delete(id));
  const esc = text => String(text || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const formatDate = value => new Date(value).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const iconFor = name => { const ext = name.split('.').pop()?.toLowerCase(); return { doc: 'W', docx: 'W', ppt: 'P', pptx: 'P', pdf: 'P', xls: 'X', xlsx: 'X', txt: 'T', md: 'T', rtf: 'T' }[ext] || '·'; };

  async function render() {
    const docs = (await all()).sort((a, b) => b.addedAt - a.addedAt);
    list.innerHTML = '';
    if (!docs.length) {
      list.innerHTML = '<div class="document-empty">还没有文档，添加一个需要反复查看的文件吧。</div>';
      return;
    }
    docs.forEach(doc => {
      const row = document.createElement('article');
      row.className = 'document-card';
      row.innerHTML = `<span class="document-icon">${iconFor(doc.name)}</span><div class="document-main"><strong>${esc(doc.name)}</strong><small>${formatSize(doc.size)} · ${formatDate(doc.addedAt)}</small></div><div class="document-actions"><button type="button" class="document-open">打开</button><button type="button" class="document-download">下载</button><button type="button" class="document-delete" aria-label="删除文档">×</button></div>`;
      const url = URL.createObjectURL(doc.blob);
      row.querySelector('.document-open').onclick = () => window.open(url, '_blank', 'noopener');
      row.querySelector('.document-download').onclick = () => { const link = document.createElement('a'); link.href = url; link.download = doc.name; link.click(); };
      row.querySelector('.document-delete').onclick = async () => { if (!confirm(`删除文档「${doc.name}」？`)) return; await remove(doc.id); URL.revokeObjectURL(url); render(); };
      list.append(row);
    });
  }

  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { alert('单个文档请控制在 25MB 以内。'); return; }
    await put({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, type: file.type, size: file.size, addedAt: Date.now(), blob: file });
    render();
  };
  render();
})();
