(() => {
  const storageKey = 'meike-literature-library-v1';
  const fileDbName = 'meike-literature-files-v1';
  const fileStore = 'pdfs';
  const $ = id => document.getElementById(id);
  let editingId = null;
  let readerUrl = '';
  let readingId = '';
  let editingNoteId = '';

  const read = () => {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  };
  const save = records => {
    localStorage.setItem(storageKey, JSON.stringify(records));
    window.dispatchEvent(new Event('meike-local-data-changed'));
  };
  const stamp = () => new Date().toISOString();
  const statusText = value => ({ unread: '未读', reading: '在读', read: '已读' }[value] || '未读');
  const normaliseUrl = value => {
    const text = value.trim();
    if (!text) return '';
    if (/^10\.\d{4,9}\//i.test(text)) return `https://doi.org/${text}`;
    return text;
  };
  const isUsableUrl = value => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol);
    } catch {
      return false;
    }
  };
  const tagsFor = item => String(item.tags || '').split(/[，,]/).map(tag => tag.trim()).filter(Boolean);
  const setText = (id, value) => { $(id).value = value || ''; };
  const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const openFileDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(fileDbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(fileStore, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const fileAction = async (mode, action) => {
    const db = await openFileDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(fileStore, mode);
      const request = action(tx.objectStore(fileStore));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  };
  const savePdf = item => fileAction('readwrite', store => store.put(item));
  const readPdf = id => fileAction('readonly', store => store.get(id));
  const removePdf = id => fileAction('readwrite', store => store.delete(id));
  const cleanPdfString = value => String(value || '').replace(/\\([()\\])/g, '$1').replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\\d{3}/g, ' ').replace(/\s+/g, ' ').trim();
  const infoValue = (raw, field) => {
    const match = raw.match(new RegExp(`/${field}\\s*\\(([^]{0,1000}?)\\)`, 'i'));
    return cleanPdfString(match?.[1] || '');
  };
  const filenameTitle = name => name.replace(/\.pdf$/i, '').replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  async function identifyPdf(file) {
    const raw = new TextDecoder('latin1').decode(await file.arrayBuffer());
    const doi = raw.match(/10\.\d{4,9}\/[\w.()/:;-]+/i)?.[0]?.replace(/[).,;]+$/, '') || '';
    const metaTitle = infoValue(raw, 'Title');
    const metaAuthors = infoValue(raw, 'Author');
    const year = raw.match(/(?:19|20)\d{2}/)?.[0] || '';
    return {
      title: metaTitle && metaTitle.length > 2 && metaTitle.length < 220 ? metaTitle : filenameTitle(file.name),
      authors: metaAuthors && metaAuthors.length < 180 ? metaAuthors : '',
      year,
      url: doi ? `https://doi.org/${doi}` : '',
      source: '',
      tags: '',
      note: ''
    };
  }
  const setImportHint = text => { const hint = $('literatureImportHint'); if (hint) hint.textContent = text; };
  function updateReadingItem(transform) {
    const records = read();
    const item = records.find(record => record.id === readingId);
    if (!item) return;
    transform(item);
    item.updatedAt = stamp();
    save(records);
  }
  function importedNoteParts(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
    return clean.split(/\n\s*\n+/).map(part => part.trim()).filter(Boolean).slice(0, 200);
  }
  async function importReaderNotes(file) {
    const status = $('literatureNoteImportStatus');
    const extension = file?.name?.split('.').pop()?.toLowerCase();
    if (!file || !['txt', 'md', 'markdown'].includes(extension)) {
      if (status) status.textContent = '请选择 TXT 或 Markdown 笔记文件。';
      return;
    }
    if (file.size > 1024 * 1024) {
      if (status) status.textContent = '笔记文件请控制在 1MB 以内。';
      return;
    }
    const parts = importedNoteParts(await file.text());
    if (!parts.length) {
      if (status) status.textContent = '文件中没有可导入的文字。';
      return;
    }
    const now = stamp();
    updateReadingItem(item => {
      const notes = Array.isArray(item.notes) ? item.notes : [];
      item.notes = [...parts.map(text => ({ id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, createdAt: now, updatedAt: now, sourceName: file.name })), ...notes];
    });
    if (status) status.textContent = `已导入 ${parts.length} 条笔记`;
    renderReaderNotes();
  }
  function renderReaderNotes() {
    const list = $('literatureNotesList');
    const input = $('literatureNoteInput');
    const saveButton = $('literatureNoteSave');
    if (!list || !input || !saveButton) return;
    const item = read().find(record => record.id === readingId);
    const notes = Array.isArray(item?.notes) ? item.notes : [];
    list.textContent = '';
    if (!notes.length) {
      const empty = document.createElement('p');
      empty.className = 'literature-notes-empty';
      empty.textContent = '还没有笔记。记录要点、疑问或实验启发。';
      list.append(empty);
    }
    notes.forEach(note => {
      const card = document.createElement('article');
      card.className = 'literature-note-card';
      const text = document.createElement('p');
      text.textContent = note.text || '';
      const footer = document.createElement('footer');
      const date = document.createElement('time');
      date.textContent = new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const actions = document.createElement('div');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '编辑';
      edit.addEventListener('click', () => {
        editingNoteId = note.id;
        input.value = note.text || '';
        input.focus();
        saveButton.textContent = '保存修改';
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'literature-note-delete';
      remove.textContent = '×';
      remove.title = '删除笔记';
      remove.setAttribute('aria-label', '删除笔记');
      remove.addEventListener('click', () => {
        updateReadingItem(record => { record.notes = (record.notes || []).filter(entry => entry.id !== note.id); });
        if (editingNoteId === note.id) { editingNoteId = ''; input.value = ''; saveButton.textContent = '添加笔记'; }
        renderReaderNotes();
      });
      actions.append(edit, remove);
      footer.append(date, actions);
      card.append(text, footer);
      list.append(card);
    });
  }
  function saveReaderNote() {
    const input = $('literatureNoteInput');
    const button = $('literatureNoteSave');
    const text = input?.value.trim();
    if (!text || !readingId) { input?.focus(); return; }
    const now = stamp();
    updateReadingItem(item => {
      const notes = Array.isArray(item.notes) ? item.notes : [];
      if (editingNoteId) {
        item.notes = notes.map(note => note.id === editingNoteId ? { ...note, text, updatedAt: now } : note);
      } else {
        item.notes = [{ id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, createdAt: now, updatedAt: now }, ...notes];
      }
    });
    editingNoteId = '';
    input.value = '';
    button.textContent = '添加笔记';
    renderReaderNotes();
  }
  function closePdfReader() {
    const reader = $('literatureReader');
    const frame = $('literatureReaderFrame');
    if (!reader || reader.hidden) return;
    reader.hidden = true;
    if (frame) frame.removeAttribute('src');
    if (readerUrl) URL.revokeObjectURL(readerUrl);
    readerUrl = '';
    readingId = '';
    editingNoteId = '';
  }
  function createPdfReader() {
    let reader = $('literatureReader');
    if (reader) return reader;
    reader = document.createElement('section');
    reader.id = 'literatureReader';
    reader.className = 'literature-reader';
    reader.hidden = true;
    reader.innerHTML = '<header class="literature-reader-bar"><button id="literatureReaderBack" class="literature-reader-back" type="button" aria-label="返回文献库" title="返回文献库">←</button><h2 id="literatureReaderTitle"></h2><button id="literatureReaderClose" class="literature-reader-close" type="button" aria-label="关闭阅读器" title="关闭">×</button></header><div class="literature-reader-workspace"><section class="literature-reader-document"><iframe id="literatureReaderFrame" class="literature-reader-frame" title="本地 PDF 阅读器"></iframe></section><aside class="literature-notes"><div class="literature-notes-head"><div><span>阅读笔记</span><small id="literatureNoteImportStatus">与当前文献关联保存</small></div><label class="literature-note-import" title="导入 TXT 或 Markdown 笔记文件">导入笔记<input id="literatureNoteFile" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown"></label></div><div class="literature-note-composer"><textarea id="literatureNoteInput" rows="4" placeholder="写下阅读要点、方法、数据或疑问"></textarea><button id="literatureNoteSave" type="button">添加笔记</button></div><div id="literatureNotesList" class="literature-notes-list"></div></aside></div>';
    document.body.append(reader);
    $('literatureReaderBack').addEventListener('click', closePdfReader);
    $('literatureReaderClose').addEventListener('click', closePdfReader);
    $('literatureNoteSave').addEventListener('click', saveReaderNote);
    $('literatureNoteFile').addEventListener('change', async event => {
      await importReaderNotes(event.target.files?.[0]);
      event.target.value = '';
    });
    const notesPanel = reader.querySelector('.literature-notes');
    const clearNotesDragState = () => notesPanel.classList.remove('is-dragging-file');
    const hasDraggedFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
    notesPanel.addEventListener('dragenter', event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      notesPanel.classList.add('is-dragging-file');
    });
    notesPanel.addEventListener('dragover', event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    notesPanel.addEventListener('dragleave', event => {
      if (!notesPanel.contains(event.relatedTarget)) clearNotesDragState();
    });
    notesPanel.addEventListener('drop', async event => {
      event.preventDefault();
      clearNotesDragState();
      await importReaderNotes(event.dataTransfer?.files?.[0]);
    });
    $('literatureNoteInput').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveReaderNote(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closePdfReader(); });
    document.addEventListener('click', event => { if (event.target.closest('.nav')) closePdfReader(); });
    return reader;
  }
  async function openPdf(item) {
    const stored = await readPdf(item.id);
    if (!stored?.blob) { alert('该 PDF 只保存在添加它的设备上。请在本机重新拖入文件。'); return; }
    closePdfReader();
    const reader = createPdfReader();
    readerUrl = URL.createObjectURL(stored.blob);
    readingId = item.id;
    editingNoteId = '';
    $('literatureReaderTitle').textContent = item.title || item.pdfName || '本地文献';
    $('literatureReaderFrame').src = `${readerUrl}#view=FitH`;
    reader.hidden = false;
    renderReaderNotes();
  }
  async function importPdf(file) {
    if (!file || !(/\.pdf$/i.test(file.name) || file.type === 'application/pdf')) return;
    if (file.size > 50 * 1024 * 1024) { alert('单篇 PDF 请控制在 50MB 以内。'); return; }
    setImportHint('正在识别 PDF 信息…');
    try {
      const info = await identifyPdf(file);
      const id = `literature-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await savePdf({ id, name: file.name, size: file.size, type: file.type, addedAt: Date.now(), blob: file });
      save([{ id, ...info, status: 'unread', pdfName: file.name, pdfSize: file.size, createdAt: stamp(), updatedAt: stamp() }, ...read()]);
      setImportHint(`已添加《${info.title}》，识别信息可随时编辑`);
      render();
    } catch {
      setImportHint('已添加 PDF；未能识别的信息可在“编辑”中补充');
      const id = `literature-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await savePdf({ id, name: file.name, size: file.size, type: file.type, addedAt: Date.now(), blob: file });
      save([{ id, title: filenameTitle(file.name), authors: '', year: '', source: '', url: '', status: 'unread', tags: '', note: '', pdfName: file.name, pdfSize: file.size, createdAt: stamp(), updatedAt: stamp() }, ...read()]);
      render();
    }
  }

  function summary(records) {
    const values = { unread: 0, reading: 0, read: 0 };
    records.forEach(item => { values[item.status] = (values[item.status] || 0) + 1; });
    const box = $('literatureSummary');
    box.textContent = '';
    [['全部', records.length, 'all'], ['未读', values.unread, 'unread'], ['在读', values.reading, 'reading'], ['已读', values.read, 'read']].forEach(([label, count, status]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `literature-summary-item ${status}`;
      button.dataset.status = status;
      button.innerHTML = `<strong>${count}</strong><span>${label}</span>`;
      button.addEventListener('click', () => {
        $('literatureStatusFilter').value = status;
        render();
      });
      box.append(button);
    });
  }

  function makeMeta(text, className = '') {
    const part = document.createElement('span');
    part.className = `literature-meta-item ${className}`.trim();
    part.textContent = text;
    return part;
  }

  function render() {
    const list = $('literatureList');
    if (!list) return;
    const all = read().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    const query = ($('literatureSearch')?.value || '').trim().toLowerCase();
    const filter = $('literatureStatusFilter')?.value || 'all';
    const records = all.filter(item => {
      const text = [item.title, item.authors, item.year, item.source, item.tags, item.note].join(' ').toLowerCase();
      return (!query || text.includes(query)) && (filter === 'all' || item.status === filter);
    });
    summary(all);
    list.textContent = '';
    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'literature-empty';
      empty.textContent = all.length ? '没有符合条件的文献。' : '文献库还是空的，先收下一篇正在读的研究吧。';
      list.append(empty);
      return;
    }
    records.forEach(item => {
      const card = document.createElement('article');
      card.className = `card literature-card literature-${item.status || 'unread'}`;
      const main = document.createElement('div');
      main.className = 'literature-card-main';
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `literature-status literature-status-${item.status || 'unread'}`;
      marker.textContent = statusText(item.status);
      marker.title = '点击切换阅读状态';
      marker.addEventListener('click', () => {
        const next = { unread: 'reading', reading: 'read', read: 'unread' }[item.status] || 'reading';
        const changed = read().map(record => record.id === item.id ? { ...record, status: next, updatedAt: stamp() } : record);
        save(changed);
        render();
      });
      const content = document.createElement('div');
      content.className = 'literature-card-content';
      const title = document.createElement(item.url && !item.pdfName ? 'a' : 'h3');
      title.className = 'literature-title';
      title.textContent = item.title;
      if (item.url && !item.pdfName) {
        title.href = item.url;
        title.target = '_blank';
        title.rel = 'noopener';
        title.title = '打开文献链接';
      }
      content.append(title);
      const meta = document.createElement('div');
      meta.className = 'literature-meta';
      if (item.authors) meta.append(makeMeta(item.authors));
      if (item.year) meta.append(makeMeta(item.year));
      if (item.source) meta.append(makeMeta(item.source));
      if (meta.childNodes.length) content.append(meta);
      const tags = tagsFor(item);
      if (tags.length) {
        const tagList = document.createElement('div');
        tagList.className = 'literature-tags';
        tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.textContent = tag;
          tagList.append(chip);
        });
        content.append(tagList);
      }
      if (item.note) {
        const note = document.createElement('p');
        note.className = 'literature-note';
        note.textContent = item.note;
        content.append(note);
      }
      if (item.pdfName) {
        const file = document.createElement('div');
        file.className = 'literature-card-file';
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = `PDF · ${item.pdfName}${item.pdfSize ? ` (${formatSize(item.pdfSize)})` : ''}`;
        open.addEventListener('click', () => openPdf(item));
        file.append(open);
        content.append(file);
      }
      main.append(marker, content);
      const actions = document.createElement('div');
      actions.className = 'literature-card-actions';
      if (item.pdfName) {
        const localRead = document.createElement('button');
        localRead.type = 'button';
        localRead.className = 'literature-local-read';
        localRead.textContent = '本地阅读';
        localRead.addEventListener('click', () => openPdf(item));
        actions.append(localRead);
      }
      if (item.url) {
        const open = document.createElement('a');
        open.href = item.url;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = item.pdfName ? '文献网页 ↗' : '打开 ↗';
        actions.append(open);
      }
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '编辑';
      edit.addEventListener('click', () => openEditor(item));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'literature-delete';
      remove.textContent = '×';
      remove.title = '删除文献';
      remove.setAttribute('aria-label', `删除：${item.title}`);
      remove.addEventListener('click', () => {
        if (!confirm(`删除《${item.title}》吗？`)) return;
        if (item.pdfName) removePdf(item.id).catch(() => {});
        save(read().filter(record => record.id !== item.id));
        render();
      });
      actions.append(edit, remove);
      card.append(main, actions);
      list.append(card);
    });
  }

  function openEditor(item = null) {
    editingId = item?.id || null;
    $('literatureEditor').hidden = false;
    $('literatureEditorEyebrow').textContent = item ? '修改条目' : '加入文献库';
    $('literatureEditorTitle').textContent = item ? '编辑文献' : '添加一篇文献';
    setText('literatureTitle', item?.title);
    setText('literatureAuthors', item?.authors);
    setText('literatureYear', item?.year);
    setText('literatureSource', item?.source);
    setText('literatureUrl', item?.url);
    setText('literatureTags', item?.tags);
    setText('literatureNote', item?.note);
    $('literatureStatus').value = item?.status || 'unread';
    $('literatureTitle').focus();
    $('literatureEditor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeEditor() {
    editingId = null;
    $('literatureEditor').hidden = true;
  }

  function saveEditor() {
    const title = $('literatureTitle').value.trim();
    const url = normaliseUrl($('literatureUrl').value);
    const year = $('literatureYear').value.trim();
    if (!title) {
      $('literatureTitle').focus();
      return;
    }
    if (year && !/^\d{4}$/.test(year)) {
      $('literatureYear').focus();
      return;
    }
    if (!isUsableUrl(url)) {
      $('literatureUrl').focus();
      return;
    }
    const records = read();
    const old = records.find(item => item.id === editingId);
    const entry = {
      id: editingId || `literature-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      authors: $('literatureAuthors').value.trim(),
      year,
      source: $('literatureSource').value.trim(),
      url,
      status: $('literatureStatus').value,
      tags: $('literatureTags').value.trim(),
      note: $('literatureNote').value.trim(),
      pdfName: old?.pdfName || '',
      pdfSize: old?.pdfSize || 0,
      createdAt: old?.createdAt || stamp(),
      updatedAt: stamp()
    };
    const next = old ? records.map(item => item.id === entry.id ? entry : item) : [entry, ...records];
    save(next);
    closeEditor();
    render();
  }

  const originalView = window.view;
  if (typeof originalView === 'function') {
    window.view = viewName => {
      originalView(viewName);
      if (viewName === 'literature') {
        $('title').textContent = '读过的文字，会成为自己的光。';
        render();
      }
    };
  }

  $('newLiterature')?.addEventListener('click', () => openEditor());
  $('cancelLiterature')?.addEventListener('click', closeEditor);
  $('saveLiterature')?.addEventListener('click', saveEditor);
  $('literatureSearch')?.addEventListener('input', render);
  $('literatureStatusFilter')?.addEventListener('change', render);
  $('literaturePdf')?.addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; importPdf(file); });
  ['dragenter', 'dragover'].forEach(type => $('literatureImport')?.addEventListener(type, event => { event.preventDefault(); $('literatureImport').classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach(type => $('literatureImport')?.addEventListener(type, event => { event.preventDefault(); $('literatureImport').classList.remove('is-dragging'); }));
  $('literatureImport')?.addEventListener('drop', event => importPdf(event.dataTransfer?.files?.[0]));
  $('literatureEditor')?.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEditor();
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveEditor();
  });
  window.addEventListener('meike-data-synced', () => {
    if (document.querySelector('.nav[data-view="literature"]')?.classList.contains('active')) render();
  });
  if (document.querySelector('.nav[data-view="literature"]')?.classList.contains('active')) render();
})();
