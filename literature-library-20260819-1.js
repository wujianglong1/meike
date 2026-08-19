(() => {
  const storageKey = 'meike-literature-library-v1';
  const $ = id => document.getElementById(id);
  let editingId = null;

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
      const title = document.createElement(item.url ? 'a' : 'h3');
      title.className = 'literature-title';
      title.textContent = item.title;
      if (item.url) {
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
      main.append(marker, content);
      const actions = document.createElement('div');
      actions.className = 'literature-card-actions';
      if (item.url) {
        const open = document.createElement('a');
        open.href = item.url;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = '打开 ↗';
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
  $('literatureEditor')?.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEditor();
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveEditor();
  });
  window.addEventListener('meike-data-synced', () => {
    if (document.querySelector('.nav[data-view="literature"]')?.classList.contains('active')) render();
  });
  if (document.querySelector('.nav[data-view="literature"]')?.classList.contains('active')) render();
})();
