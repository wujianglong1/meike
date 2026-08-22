(() => {
  const key = 'meike-english-corner-v1';
  const $ = id => document.getElementById(id);
  const labels = { note: '综合笔记', vocab: '单词短语', sentence: '好句摘抄', listening: '听力', speaking: '口语', writing: '写作', grammar: '语法' };
  const editorIds = ['englishSentence', 'englishTranslation', 'englishAnalysis', 'englishSimilar'];
  const translationCollapseKey = 'meike-english-translation-collapsed';
  let editingId = '';
  let activeEditor = null;
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const sanitize = html => {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'SPAN', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);
    template.content.querySelectorAll('*').forEach(node => {
      if (!allowed.has(node.tagName)) {
        node.replaceWith(...node.childNodes);
        return;
      }
      [...node.attributes].forEach(attr => {
        if (attr.name.toLowerCase() !== 'style') node.removeAttribute(attr.name);
      });
      if (node.hasAttribute('style')) {
        const color = node.style.color;
        const backgroundColor = node.style.backgroundColor;
        node.removeAttribute('style');
        if (color) node.style.color = color;
        if (backgroundColor) node.style.backgroundColor = backgroundColor;
      }
    });
    return template.innerHTML.trim();
  };
  const strip = html => {
    const box = document.createElement('div');
    box.innerHTML = sanitize(html);
    return box.textContent || '';
  };
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
  const setHtml = (id, value) => {
    const node = $(id);
    if (node) node.innerHTML = sanitize(value);
  };
  const getHtml = id => sanitize($(id)?.innerHTML || '');
  const hasText = (...values) => values.some(value => strip(value).trim());
  function setTranslationCollapsed(collapsed) {
    const field = $('englishTranslationField');
    const button = $('toggleEnglishTranslation');
    if (!field || !button) return;
    field.classList.toggle('is-collapsed', collapsed);
    button.textContent = collapsed ? '＋ 展开译文' : '− 收起译文';
    button.setAttribute('aria-expanded', String(!collapsed));
    localStorage.setItem(translationCollapseKey, collapsed ? '1' : '0');
  }
  function clearEditor() {
    editingId = '';
    $('englishEditorTitle').textContent = '记录一条英语收获';
    $('saveEnglishNote').textContent = '保存笔记';
    ['englishTitle', 'englishTags'].forEach(id => { if ($(id)) $(id).value = ''; });
    editorIds.forEach(id => setHtml(id, ''));
    if ($('englishType')) $('englishType').value = 'note';
    const state = $('englishSaveState');
    if (state) state.textContent = '本机自动保存，可随账户同步';
    $('englishTitle')?.focus();
  }
  function saveNote() {
    const title = $('englishTitle')?.value.trim() || '';
    const sentence = getHtml('englishSentence');
    const translation = getHtml('englishTranslation');
    const analysis = getHtml('englishAnalysis');
    const similar = getHtml('englishSimilar');
    const tags = tagList($('englishTags')?.value || '');
    const type = $('englishType')?.value || 'note';
    if (!title && !hasText(sentence, translation, analysis, similar)) {
      $('englishSentence')?.focus();
      return toast('先写一点内容，再保存到英语角');
    }
    const now = new Date().toISOString();
    const notes = read();
    const existing = notes.find(item => item.id === editingId);
    const payload = { title: title || '未命名英语笔记', type, sentence, translation, analysis, similar, content: sentence, tags, updatedAt: now };
    if (existing) Object.assign(existing, payload);
    else notes.unshift({ id: `en-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...payload, createdAt: now });
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
    setHtml('englishSentence', note.sentence || note.content || '');
    setHtml('englishTranslation', note.translation || '');
    setHtml('englishAnalysis', note.analysis || '');
    setHtml('englishSimilar', note.similar || '');
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
  function noteSection(title, html, className) {
    if (!strip(html).trim()) return '';
    return `<section class="english-note-section ${className}"><b>${title}</b><div>${sanitize(html)}</div></section>`;
  }
  function render() {
    const list = $('englishList');
    if (!list) return;
    const query = ($('englishSearch')?.value || '').trim().toLowerCase();
    const type = $('englishTypeFilter')?.value || '';
    let notes = read().slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    if (type) notes = notes.filter(item => (item.type || 'note') === type);
    if (query) notes = notes.filter(item => [item.title, strip(item.sentence || item.content), strip(item.translation), strip(item.analysis), strip(item.similar), ...(item.tags || [])].some(value => String(value || '').toLowerCase().includes(query)));
    list.innerHTML = '';
    if (!notes.length) {
      list.innerHTML = '<div class="english-empty">这里还没有英语笔记。可以记录例句、译文、解析，也可以把论文英语表达慢慢攒起来。</div>';
      return;
    }
    notes.forEach(note => {
      const card = document.createElement('article');
      card.className = `card english-note english-note-${note.type || 'note'}`;
      const tags = (note.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('');
      const sentence = note.sentence || note.content || '';
      card.innerHTML = `<div class="english-note-main"><div class="english-note-top"><span>${esc(labels[note.type] || labels.note)}</span><small>${esc(dateText(note.updatedAt || note.createdAt))}</small></div><h3>${esc(note.title || '未命名英语笔记')}</h3>${noteSection('例句', sentence, 'english-note-sentence')}${noteSection('译文', note.translation, 'english-note-translation')}${noteSection('解析', note.analysis, 'english-note-analysis')}${noteSection('类似表达', note.similar, 'english-note-similar')}${tags ? `<div class="english-tags">${tags}</div>` : ''}</div><div class="english-note-actions"><button type="button" data-edit="${esc(note.id)}">编辑</button><button type="button" data-delete="${esc(note.id)}">×</button></div>`;
      list.append(card);
    });
  }
  function applyFormat(command, value) {
    const target = activeEditor || document.activeElement?.closest?.('.english-rich-input') || $('englishSentence');
    if (!target) return;
    target.focus();
    document.execCommand(command, false, value || null);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
  window.renderEnglishCorner = render;
  document.addEventListener('mousedown', event => {
    if (event.target.closest?.('.english-formatbar button')) event.preventDefault();
  });
  document.addEventListener('click', event => {
    const edit = event.target.closest?.('[data-edit]');
    const del = event.target.closest?.('[data-delete]');
    const format = event.target.closest?.('.english-formatbar button');
    if (edit) editNote(edit.dataset.edit);
    if (del) removeNote(del.dataset.delete);
    if (format) applyFormat(format.dataset.command, format.dataset.value || null);
  });
  editorIds.forEach(id => {
    const node = $(id);
    if (!node) return;
    node.addEventListener('focus', () => { activeEditor = node; });
    node.addEventListener('input', () => {
      const state = $('englishSaveState');
      if (state) state.textContent = '正在编辑，点击保存后同步';
    });
    node.addEventListener('paste', event => {
      event.preventDefault();
      const html = event.clipboardData?.getData('text/html');
      const text = event.clipboardData?.getData('text/plain');
      document.execCommand('insertHTML', false, html ? sanitize(html) : esc(text).replace(/\n/g, '<br>'));
    });
  });
  $('saveEnglishNote')?.addEventListener('click', saveNote);
  $('clearEnglishNote')?.addEventListener('click', clearEditor);
  $('newEnglishNote')?.addEventListener('click', clearEditor);
  $('toggleEnglishTranslation')?.addEventListener('click', () => setTranslationCollapsed(!$('englishTranslationField')?.classList.contains('is-collapsed')));
  $('englishSearch')?.addEventListener('input', render);
  $('englishTypeFilter')?.addEventListener('change', render);
  ['englishTitle', 'englishTags'].forEach(id => $(id)?.addEventListener('input', () => {
    const state = $('englishSaveState');
    if (state) state.textContent = '正在编辑，点击保存后同步';
  }));
  setTranslationCollapsed(localStorage.getItem(translationCollapseKey) === '1');
  render();
})();
