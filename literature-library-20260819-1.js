(() => {
  const storageKey = 'meike-literature-library-v1';
  const fileDbName = 'meike-literature-files-v1';
  const fileStore = 'pdfs';
  const supportedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'markdown', 'rtf', 'csv', 'html', 'htm'];
  const supportedAccept = supportedExtensions.map(ext => `.${ext}`).join(',');
  const $ = id => document.getElementById(id);
  let editingId = null;
  let readerUrl = '';
  let readingId = '';
  let editingNoteId = '';
  let activeFolderId = localStorage.getItem('meike-literature-active-folder') || 'all';

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
  const isFolder = item => item?.kind === 'folder';
  const folders = () => read().filter(isFolder).sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'));
  const papers = records => records.filter(item => !isFolder(item));
  const folderName = id => folders().find(folder => folder.id === id)?.name || '';
  function renderFolders() {
    const box = $('literatureFolders');
    if (!box) return;
    const records = read();
    const paperRecords = papers(records);
    const list = [{ id: 'all', name: '全部文献', count: paperRecords.length }, ...folders().map(folder => ({ ...folder, count: paperRecords.filter(item => item.folderId === folder.id).length }))];
    if (!list.some(folder => folder.id === activeFolderId)) {
      activeFolderId = 'all';
      localStorage.setItem('meike-literature-active-folder', activeFolderId);
    }
    box.textContent = '';
    list.forEach(folder => {
      const chip = document.createElement('div');
      chip.className = `literature-folder-chip${folder.id === activeFolderId ? ' is-active' : ''}`;
      const select = document.createElement('button');
      select.type = 'button';
      select.className = 'literature-folder-select';
      const icon = document.createElement('span');
      icon.className = 'literature-folder-icon';
      icon.textContent = folder.id === 'all' ? '▦' : '▰';
      const name = document.createElement('span');
      name.textContent = folder.name;
      const count = document.createElement('b');
      count.textContent = folder.count;
      select.append(icon, name, count);
      select.addEventListener('click', () => { activeFolderId = folder.id; localStorage.setItem('meike-literature-active-folder', activeFolderId); render(); });
      chip.append(select);
      if (folder.id !== 'all') {
        const actions = document.createElement('div');
        actions.className = 'literature-folder-actions';
        const rename = document.createElement('button');
        rename.type = 'button';
        rename.textContent = '重命名';
        rename.addEventListener('click', () => renameFolder(folder));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '删除';
        remove.addEventListener('click', () => removeFolder(folder));
        actions.append(rename, remove);
        chip.append(actions);
      }
      box.append(chip);
    });
  }
  function createFolder() {
    const name = prompt('请输入文件夹名称');
    const trimmed = name?.trim();
    if (!trimmed) return;
    if (folders().some(folder => folder.name === trimmed)) return alert('这个文件夹已经存在。');
    const now = stamp();
    const folder = { id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind: 'folder', name: trimmed, createdAt: now, updatedAt: now };
    save([...read(), folder]);
    activeFolderId = folder.id;
    localStorage.setItem('meike-literature-active-folder', activeFolderId);
    render();
  }
  function renameFolder(folder) {
    const name = prompt('修改文件夹名称', folder.name);
    const trimmed = name?.trim();
    if (!trimmed || trimmed === folder.name) return;
    if (folders().some(item => item.id !== folder.id && item.name === trimmed)) return alert('这个文件夹已经存在。');
    save(read().map(item => item.id === folder.id ? { ...item, name: trimmed, updatedAt: stamp() } : item));
    render();
  }
  function removeFolder(folder) {
    if (!confirm(`删除文件夹“${folder.name}”？其中的文献会保留在“全部文献”中。`)) return;
    save(read().filter(item => item.id !== folder.id).map(item => item.folderId === folder.id ? { ...item, folderId: '' } : item));
    if (activeFolderId === folder.id) activeFolderId = 'all';
    localStorage.setItem('meike-literature-active-folder', activeFolderId);
    render();
  }
  function ensureFolderUi() {
    if (!document.getElementById('literature-folder-style')) {
      const style = document.createElement('style');
      style.id = 'literature-folder-style';
      style.textContent = `.literature-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.literature-folder-create{border:1px solid var(--line)!important;background:transparent!important;color:var(--accent)!important}.literature-folder-create:hover{background:color-mix(in srgb,var(--accent) 8%,var(--card))!important}.literature-folders{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.literature-folder-chip{display:flex;align-items:center;border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden}.literature-folder-chip.is-active{border-color:color-mix(in srgb,var(--accent) 55%,var(--line));background:color-mix(in srgb,var(--accent) 9%,var(--card))}.literature-folder-select{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--ink);padding:8px 10px;cursor:pointer}.literature-folder-select b{min-width:1.2em;color:var(--muted);font-size:11px}.literature-folder-icon{color:var(--accent);font-size:14px}.literature-folder-actions{display:none;align-items:center;gap:3px;padding-right:5px}.literature-folder-chip:hover .literature-folder-actions,.literature-folder-chip:focus-within .literature-folder-actions{display:flex}.literature-folder-actions button{border:0;background:transparent;color:var(--muted);font-size:11px;padding:3px;cursor:pointer}.literature-folder-actions button:hover{color:var(--accent)}#literatureFolder{min-width:0}@media(max-width:700px){.literature-head-actions{width:100%}.literature-head-actions button{flex:1}}`;
      document.head.append(style);
    }
    const head = document.querySelector('#literature .literature-head');
    const importInput = $('literaturePdf');
    const importBox = $('literatureImport');
    if (importInput) {
      importInput.accept = supportedAccept;
      importInput.multiple = true;
    }
    if (importBox) {
      importBox.querySelector('.literature-import-icon')?.replaceChildren(document.createTextNode('文件'));
      const strong = importBox.querySelector('strong');
      if (strong) strong.textContent = '拖入 PDF、Word、PPT 等文件，自动添加到文献库';
      const hint = importBox.querySelector('small');
      if (hint) hint.textContent = '支持 PDF、Word、PPT、Excel、TXT、Markdown、HTML 等格式；可随时编辑文献信息';
    }
    const addButton = $('newLiterature');
    if (head && addButton && !$('newLiteratureFolder')) {
      const actions = document.createElement('div');
      actions.className = 'literature-head-actions';
      const create = document.createElement('button');
      create.id = 'newLiteratureFolder';
      create.className = 'literature-folder-create';
      create.type = 'button';
      create.textContent = '＋ 新建文件夹';
      create.addEventListener('click', createFolder);
      addButton.replaceWith(actions);
      actions.append(create, addButton);
    }
    if (importBox && !$('literatureFolders')) {
      const box = document.createElement('div');
      box.id = 'literatureFolders';
      box.className = 'literature-folders';
      box.setAttribute('aria-label', '文献文件夹');
      importBox.insertAdjacentElement('afterend', box);
    }
    const status = $('literatureStatus');
    if (status && !$('literatureFolder')) {
      const select = document.createElement('select');
      select.id = 'literatureFolder';
      select.setAttribute('aria-label', '归入文件夹');
      select.innerHTML = '<option value="">不归入文件夹</option>';
      status.insertAdjacentElement('afterend', select);
    }
  }
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
  const filenameTitle = name => name.replace(/\.[^.]+$/i, '').replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const extensionOf = name => String(name || '').split('.').pop()?.toLowerCase() || '';
  const isSupportedFile = file => Boolean(file && (supportedExtensions.includes(extensionOf(file.name)) || file.type === 'application/pdf'));
  const filesFromDrop = event => {
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) return files;
    return Array.from(event.dataTransfer?.items || []).map(item => item.kind === 'file' ? item.getAsFile() : null).filter(Boolean);
  };
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
    reader.innerHTML = '<header class="literature-reader-bar"><button id="literatureReaderBack" class="literature-reader-back" type="button" aria-label="返回文献库" title="返回文献库">←</button><h2 id="literatureReaderTitle"></h2><button id="literatureReaderClose" class="literature-reader-close" type="button" aria-label="关闭阅读器" title="关闭">×</button></header><div class="literature-reader-workspace"><section class="literature-reader-document"><iframe id="literatureReaderFrame" class="literature-reader-frame" title="本地文献阅读器"></iframe></section><div id="literatureReaderDivider" class="literature-reader-divider" role="separator" aria-label="调整文献与笔记宽度" aria-orientation="vertical" tabindex="0"></div><aside class="literature-notes"><div class="literature-notes-head"><div><span>阅读笔记</span><small id="literatureNoteImportStatus">与当前文献关联保存</small></div><label class="literature-note-import" title="导入 TXT 或 Markdown 笔记文件">导入笔记<input id="literatureNoteFile" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown"></label></div><div class="literature-note-composer"><textarea id="literatureNoteInput" rows="4" placeholder="写下阅读要点、方法、数据或疑问"></textarea><button id="literatureNoteSave" type="button">添加笔记</button></div><div id="literatureNotesList" class="literature-notes-list"></div></aside></div>';
    document.body.append(reader);
    $('literatureReaderBack').addEventListener('click', closePdfReader);
    $('literatureReaderClose').addEventListener('click', closePdfReader);
    $('literatureNoteSave').addEventListener('click', saveReaderNote);
    const workspace = reader.querySelector('.literature-reader-workspace');
    const divider = $('literatureReaderDivider');
    const savedNotesWidth = Number(localStorage.getItem('meike-literature-notes-width'));
    if (savedNotesWidth >= 260) workspace.style.setProperty('--literature-notes-width', `${savedNotesWidth}px`);
    divider.addEventListener('pointerdown', event => {
      const startX = event.clientX;
      const startWidth = reader.querySelector('.literature-notes').getBoundingClientRect().width;
      divider.setPointerCapture(event.pointerId);
      reader.classList.add('is-resizing');
      const move = moveEvent => {
        const maxWidth = Math.max(260, Math.min(620, workspace.clientWidth - 330));
        const nextWidth = Math.round(Math.max(260, Math.min(maxWidth, startWidth - (moveEvent.clientX - startX))));
        workspace.style.setProperty('--literature-notes-width', `${nextWidth}px`);
      };
      const finish = finishEvent => {
        divider.releasePointerCapture(finishEvent.pointerId);
        reader.classList.remove('is-resizing');
        localStorage.setItem('meike-literature-notes-width', String(Math.round(reader.querySelector('.literature-notes').getBoundingClientRect().width)));
        divider.removeEventListener('pointermove', move);
        divider.removeEventListener('pointerup', finish);
        divider.removeEventListener('pointercancel', finish);
      };
      divider.addEventListener('pointermove', move);
      divider.addEventListener('pointerup', finish);
      divider.addEventListener('pointercancel', finish);
    });
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
    if (!stored?.blob) { alert('该文件只保存在添加它的设备上。请在本机重新拖入文件。'); return; }
    closePdfReader();
    const reader = createPdfReader();
    readerUrl = URL.createObjectURL(stored.blob);
    readingId = item.id;
    editingNoteId = '';
    $('literatureReaderTitle').textContent = item.title || item.pdfName || '本地文献';
    $('literatureReaderFrame').src = extensionOf(item.pdfName) === 'pdf' ? `${readerUrl}#view=FitH` : readerUrl;
    reader.hidden = false;
    const savedNotesWidth = Number(localStorage.getItem('meike-literature-notes-width'));
    if (savedNotesWidth >= 260) {
      const workspace = reader.querySelector('.literature-reader-workspace');
      const maxWidth = Math.max(260, Math.min(620, workspace.clientWidth - 330));
      workspace.style.setProperty('--literature-notes-width', `${Math.min(savedNotesWidth, maxWidth)}px`);
    }
    renderReaderNotes();
  }
  async function importPdf(file) {
    if (!isSupportedFile(file)) { if (file) alert('暂不支持这种文件格式。'); return; }
    if (file.size > 50 * 1024 * 1024) { alert('单个文件请控制在 50MB 以内。'); return; }
    const isPdf = extensionOf(file.name) === 'pdf' || file.type === 'application/pdf';
    setImportHint(isPdf ? '正在识别 PDF 信息…' : '正在添加文件…');
    try {
      const info = isPdf ? await identifyPdf(file) : { title: filenameTitle(file.name), authors: '', year: '', url: '', source: '', tags: '', note: '' };
      const id = `literature-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await savePdf({ id, name: file.name, size: file.size, type: file.type, addedAt: Date.now(), blob: file });
      save([{ id, ...info, folderId: activeFolderId === 'all' ? '' : activeFolderId, status: 'unread', pdfName: file.name, pdfSize: file.size, createdAt: stamp(), updatedAt: stamp() }, ...read()]);
      setImportHint(`已添加《${info.title}》，识别信息可随时编辑`);
      render();
    } catch {
      setImportHint('已添加文件；未能识别的信息可在“编辑”中补充');
      const id = `literature-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await savePdf({ id, name: file.name, size: file.size, type: file.type, addedAt: Date.now(), blob: file });
      save([{ id, title: filenameTitle(file.name), authors: '', year: '', source: '', url: '', status: 'unread', tags: '', note: '', folderId: activeFolderId === 'all' ? '' : activeFolderId, pdfName: file.name, pdfSize: file.size, createdAt: stamp(), updatedAt: stamp() }, ...read()]);
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
    const all = papers(read()).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    const query = ($('literatureSearch')?.value || '').trim().toLowerCase();
    const filter = $('literatureStatusFilter')?.value || 'all';
    const records = all.filter(item => {
      const text = [item.title, item.authors, item.year, item.source, item.tags, item.note].join(' ').toLowerCase();
      return (!query || text.includes(query)) && (filter === 'all' || item.status === filter) && (activeFolderId === 'all' || item.folderId === activeFolderId);
    });
    renderFolders();
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
      if (item.folderId && folderName(item.folderId)) content.append(makeMeta(`文件夹：${folderName(item.folderId)}`, 'literature-folder-meta'));
      if (item.pdfName) {
        const file = document.createElement('div');
        file.className = 'literature-card-file';
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = `${extensionOf(item.pdfName).toUpperCase() || '文件'} · ${item.pdfName}${item.pdfSize ? ` (${formatSize(item.pdfSize)})` : ''}`;
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
    const folderSelect = $('literatureFolder');
    if (folderSelect) {
      folderSelect.textContent = '';
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '不归入文件夹';
      folderSelect.append(emptyOption);
      folders().forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        folderSelect.append(option);
      });
      folderSelect.value = item?.folderId || (activeFolderId === 'all' ? '' : activeFolderId);
    }
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
      notes: old?.notes || [],
      folderId: $('literatureFolder')?.value || '',
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

  ensureFolderUi();
  $('newLiterature')?.addEventListener('click', () => openEditor());
  $('cancelLiterature')?.addEventListener('click', closeEditor);
  $('saveLiterature')?.addEventListener('click', saveEditor);
  $('literatureSearch')?.addEventListener('input', render);
  $('literatureStatusFilter')?.addEventListener('change', render);
  $('literaturePdf')?.addEventListener('change', async event => { const files = Array.from(event.target.files || []); event.target.value = ''; for (const file of files) await importPdf(file); });
  ['dragenter', 'dragover'].forEach(type => $('literatureImport')?.addEventListener(type, event => { event.preventDefault(); $('literatureImport').classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach(type => $('literatureImport')?.addEventListener(type, event => { event.preventDefault(); $('literatureImport').classList.remove('is-dragging'); }));
  $('literatureImport')?.addEventListener('drop', async event => { for (const file of filesFromDrop(event)) await importPdf(file); });
  $('literatureEditor')?.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEditor();
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveEditor();
  });
  window.addEventListener('meike-data-synced', () => {
    if (document.querySelector('.nav[data-view="literature"]')?.classList.contains('active')) render();
  });
  if (document.querySelector('.nav[data-view="literature"]')?.classList.contains('active')) render();
})();
