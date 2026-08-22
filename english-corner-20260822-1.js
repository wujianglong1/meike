(() => {
  const key = 'meike-english-corner-v1';
  const $ = id => document.getElementById(id);
  const labels = { note: '综合笔记', vocab: '单词短语', sentence: '好句摘抄', listening: '听力', speaking: '口语', writing: '写作', grammar: '语法' };
  let editingId = '';
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const write = notes => {
    localStorage.setItem(key, JSON.stringify(notes));
    window.dispatchEvent(new Event('meike-local-data-changed'));
  };
  const toast = text => {
    const box = $('toast');
    if (!box) return;
    box.textContent = text;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 2200);
  };
  const tagList = value => String(value || '').split(/[,，、\s]+/).map(item => item.trim()).filter(Boolean);
  const dateText = value => {
    try {
      return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    } catch {
      return '';
    }
  };
  function clearEditor() {
    editingId = '';
    $('englishEditorTitle').textContent = '记录一条英语收获';
    $('saveEnglishNote').textContent = '保存笔记';
    ['englishTitle', 'englishContent', 'englishTranslation', 'englishTags'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('englishType')) $('englishType').value = 'note';
    $('englishTitle')?.focus();
  }
  function saveNote() {
    const title = $('englishTitle')?.value.trim() || '';
    const content = $('englishContent')?.value.trim() || '';
    const translation = $('englishTranslation')?.value.trim() || '';
    const tags = tagList($('englishTags')?.value || '');
    const type = $('englishType')?.value || 'note';
    if (!title && !content && !translation) {
      $('englishContent')?.focus();
      return toast('先写一点内容，再保存到英语角');
    }
    const now = new Date().toISOString();
    const notes = read();
    const existing = notes.find(item => item.id === editingId);
    if (existing) {
      Object.assign(existing, { title: title || '未命名英语笔记', type, content, translation, tags, updatedAt: now });
    } else {
      notes.unshift({ id: `en-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: title || '未命名英语笔记', type, content, translation, tags, createdAt: now, updatedAt: now });
    }
    write(notes);
    clearEditor();
    render();
    toast('英语笔记已保存');
  }
  function editNote(id) {
    const note = read().find(item => item.id === id);
    if (!note) return;
    editingId = id;
    $('englishEditorTitle').textContent = '正在编辑英语笔记';
    $('saveEnglishNote').textContent = '更新笔记';
    $('englishTitle').value = note.title || '';
    $('englishType').value = note.type || 'note';
    $('englishContent').value = note.content || '';
    $('englishTranslation').value = note.translation || '';
    $('englishTags').value = (note.tags || []).join('，');
    $('englishTitle').focus();
    $('english')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function removeNote(id) {
    const note = read().find(item => item.id === id);
    if (!note || !confirm(`删除英语笔记「${note.title || '未命名'}」？`)) return;
    write(read().filter(item => item.id !== id));
    if (editingId === id) clearEditor();
    render();
    toast('已删除英语笔记');
  }
  function render() {
    const list = $('englishList');
    if (!list) return;
    const query = ($('englishSearch')?.value || '').trim().toLowerCase();
    const type = $('englishTypeFilter')?.value || '';
    let notes = read().slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    if (type) notes = notes.filter(item => (item.type || 'note') === type);
    if (query) {
      notes = notes.filter(item => [item.title, item.content, item.translation, ...(item.tags || [])].some(value => String(value || '').toLowerCase().includes(query)));
    }
    list.innerHTML = '';
    if (!notes.length) {
      list.innerHTML = '<div class="english-empty">这里还没有英语笔记。可以记录单词、好句、语法点、听力口语心得，也可以给论文英语表达做摘抄。</div>';
      return;
    }
    notes.forEach(note => {
      const card = document.createElement('article');
      card.className = `card english-note english-note-${note.type || 'note'}`;
      const tags = (note.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('');
      card.innerHTML = `<div class="english-note-main"><div class="english-note-top"><span>${esc(labels[note.type] || labels.note)}</span><small>${esc(dateText(note.updatedAt || note.createdAt))}</small></div><h3>${esc(note.title || '未命名英语笔记')}</h3>${note.content ? `<p>${esc(note.content)}</p>` : ''}${note.translation ? `<blockquote>${esc(note.translation)}</blockquote>` : ''}${tags ? `<div class="english-tags">${tags}</div>` : ''}</div><div class="english-note-actions"><button type="button" data-edit="${esc(note.id)}">编辑</button><button type="button" data-delete="${esc(note.id)}">×</button></div>`;
      list.append(card);
    });
  }
  window.renderEnglishCorner = render;
  document.addEventListener('click', event => {
    const edit = event.target.closest?.('[data-edit]');
    const del = event.target.closest?.('[data-delete]');
    if (edit) editNote(edit.dataset.edit);
    if (del) removeNote(del.dataset.delete);
  });
  $('saveEnglishNote')?.addEventListener('click', saveNote);
  $('clearEnglishNote')?.addEventListener('click', clearEditor);
  $('newEnglishNote')?.addEventListener('click', clearEditor);
  $('englishSearch')?.addEventListener('input', render);
  $('englishTypeFilter')?.addEventListener('change', render);
  ['englishTitle', 'englishContent', 'englishTranslation', 'englishTags'].forEach(id => $(id)?.addEventListener('input', () => {
    const state = $('englishSaveState');
    if (state) state.textContent = '正在编辑，点击保存后同步';
  }));
  render();
})();
