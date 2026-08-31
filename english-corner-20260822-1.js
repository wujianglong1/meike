(() => {
  const key = 'meike-english-corner-v1';
  const $ = id => document.getElementById(id);
  const labels = { note: '综合笔记', phrase: '词组', vocab: '单词短语', sentence: '好句摘抄', listening: '听力', speaking: '口语', writing: '写作', grammar: '语法' };
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
  const plainTextToHtml = text => {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const parts = [];
    let list = [];
    const flushList = () => {
      if (!list.length) return;
      parts.push(`<ul>${list.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`);
      list = [];
    };
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      const bullet = trimmed.match(/^(?:[-*•·]|\d+[.)、])\s*(.+)$/);
      if (bullet) {
        list.push(bullet[1]);
        return;
      }
      flushList();
      parts.push(`<p>${esc(trimmed)}</p>`);
    });
    flushList();
    return parts.join('') || '<p><br></p>';
  };
  const cleanHtmlSpacing = html => {
    const template = document.createElement('template');
    template.innerHTML = sanitize(html);
    const trimStartIn = node => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent = child.textContent.replace(/^[\s\u00a0\u3000]+/g, '');
          if (child.textContent.length) return;
          child.remove();
          continue;
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          trimStartIn(child);
          if ((child.textContent || '').trim()) return;
          if (!['BR'].includes(child.tagName)) child.remove();
        }
      }
    };
    template.content.querySelectorAll('*').forEach(node => {
      node.style.marginLeft = '';
      node.style.paddingLeft = '';
      node.style.textIndent = '';
      node.style.textAlign = '';
      if (!node.getAttribute('style')) node.removeAttribute('style');
    });
    template.content.querySelectorAll('p,div,li,blockquote,span').forEach(node => {
      trimStartIn(node);
      node.innerHTML = node.innerHTML
        .replace(/^(?:&nbsp;|\s|　)+/g, '')
        .replace(/<br\s*\/?>\s*(?:&nbsp;|\s|　)*$/gi, '')
        .replace(/^(?:<br\s*\/?>)+/gi, '');
      if (!node.textContent.trim() && !node.querySelector('img')) node.remove();
    });
    template.content.querySelectorAll('br').forEach(br => {
      const parent = br.parentElement;
      if (parent && !parent.textContent.trim() && parent.childNodes.length <= 1) parent.remove();
    });
    return template.innerHTML.trim();
  };
  function cleanEditorSpacing(target) {
    const node = target || activeEditor || document.activeElement?.closest?.('.english-rich-input');
    if (!node) return;
    node.innerHTML = cleanHtmlSpacing(node.innerHTML);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.focus();
    toast('已整理多余空格');
  }
  function insertCleanParagraph() {
    document.execCommand('insertHTML', false, '<p><br></p>');
  }
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
  const getHtml = id => cleanHtmlSpacing($(id)?.innerHTML || '');
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
  function createPhraseNote({ phrase = '', meaning = '', example = '', tags = [] } = {}) {
    if (!phrase && !meaning) {
      return toast('先写一个想记住的词组');
    }
    const now = new Date().toISOString();
    const notes = read();
    notes.unshift({ id: `phrase-${Date.now()}-${Math.random().toString(16).slice(2)}`, type: 'phrase', title: phrase || '未命名词组', sentence: phrase ? `<p>${esc(phrase)}</p>` : '', translation: meaning ? `<p>${esc(meaning)}</p>` : '', analysis: example ? `<p>${esc(example)}</p>` : '', similar: '', content: phrase ? `<p>${esc(phrase)}</p>` : '', tags, createdAt: now, updatedAt: now });
    write(notes);
    return true;
  }
  function savePhrase() {
    const phrase = $('englishPhraseText')?.value.trim() || '';
    const meaning = $('englishPhraseMeaning')?.value.trim() || '';
    const example = $('englishPhraseExample')?.value.trim() || '';
    const tags = tagList($('englishPhraseTags')?.value || '');
    if (!phrase && !meaning) {
      $('englishPhraseText')?.focus();
      return toast('先写一个想记住的词组');
    }
    if (!createPhraseNote({ phrase, meaning, example, tags })) return;
    ['englishPhraseText', 'englishPhraseMeaning', 'englishPhraseExample', 'englishPhraseTags'].forEach(id => { if ($(id)) $(id).value = ''; });
    render();
    toast('词组已加入记忆库');
  }
  function saveInlinePhrase(button) {
    const panel = button.closest('.english-inline-phrase');
    if (!panel) return;
    const phrase = panel.querySelector('[data-inline-phrase]')?.value.trim() || '';
    const meaning = panel.querySelector('[data-inline-meaning]')?.value.trim() || '';
    const example = panel.querySelector('[data-inline-example]')?.value.trim() || '';
    const tags = tagList(panel.querySelector('[data-inline-tags]')?.value || '');
    if (!phrase && !meaning) {
      panel.querySelector('[data-inline-phrase]')?.focus();
      return toast('先写一个想记住的词组');
    }
    if (!createPhraseNote({ phrase, meaning, example, tags })) return;
    render();
    toast('已从这条笔记加入词组库');
  }
  function editPhrase(id) {
    const note = read().find(item => item.id === id);
    if (!note) return;
    $('englishPhraseText').value = strip(note.sentence || note.content || note.title || '').trim();
    $('englishPhraseMeaning').value = strip(note.translation || '').trim();
    $('englishPhraseExample').value = strip(note.analysis || '').trim();
    $('englishPhraseTags').value = (note.tags || []).join('，');
    removePhrase(id, false);
    $('englishPhraseText')?.focus();
  }
  function removePhrase(id, ask = true) {
    const note = read().find(item => item.id === id);
    if (!note || (ask && !confirm(`删除词组「${note.title || '未命名'}」？`))) return;
    write(read().filter(item => item.id !== id));
    render();
    if (ask) toast('已删除词组');
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
  function inlinePhrasePanel(note) {
    const sentence = strip(note.sentence || note.content || '').trim().replace(/\s+/g, ' ');
    const translation = strip(note.translation || '').trim().replace(/\s+/g, ' ');
    const title = strip(note.title || '').trim();
    return `<aside class="english-inline-phrase" hidden><div><span>词组项</span><h4>从这条笔记摘词组</h4><p>把想记住的表达放到词组库，之后可以集中复习。</p></div><input data-inline-phrase type="text" maxlength="80" placeholder="词组 / 搭配" value="${esc(title && title !== '未命名英语笔记' ? title : '')}"><input data-inline-meaning type="text" maxlength="120" placeholder="含义 / 用法" value="${esc(translation.slice(0, 80))}"><textarea data-inline-example maxlength="220" placeholder="例句 / 语境">${esc(sentence.slice(0, 160))}</textarea><input data-inline-tags type="text" maxlength="120" placeholder="标签，用逗号分隔" value="${esc((note.tags || []).join('，'))}"><button type="button" data-save-inline-phrase>保存到词组库</button></aside>`;
  }
  function ensureInlinePhrase(card) {
    let panel = card?.querySelector('.english-inline-phrase');
    if (panel || !card?.dataset.noteId) return panel;
    const note = read().find(item => item.id === card.dataset.noteId);
    if (!note) return null;
    const actions = card.querySelector('.english-note-actions');
    actions?.insertAdjacentHTML('beforebegin', inlinePhrasePanel(note));
    return card.querySelector('.english-inline-phrase');
  }
  function render() {
    const list = $('englishList');
    if (!list) return;
    const query = ($('englishSearch')?.value || '').trim().toLowerCase();
    const type = $('englishTypeFilter')?.value || '';
    renderPhraseBank(query, type);
    if (type === 'phrase') {
      list.innerHTML = '<div class="english-empty">上方已显示所有匹配的词组。</div>';
      return;
    }
    let notes = read().filter(item => (item.type || 'note') !== 'phrase').sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    if (type) notes = notes.filter(item => (item.type || 'note') === type);
    if (query) notes = notes.filter(item => [item.title, strip(item.sentence || item.content), strip(item.translation), strip(item.analysis), strip(item.similar), ...(item.tags || [])].some(value => String(value || '').toLowerCase().includes(query)));
    list.innerHTML = '';
    if (!notes.length) {
      list.innerHTML = '<div class="english-empty">这里还没有英语笔记。可以记录例句、译文、解析，也可以把论文英语表达慢慢攒起来。</div>';
      return;
    }
    notes.forEach(note => {
      const card = document.createElement('article');
      card.className = `card english-note english-note-${note.type || 'note'} is-collapsed`;
      card.dataset.noteId = note.id;
      const tags = (note.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('');
      const sentence = note.sentence || note.content || '';
      const sentenceHtml = noteSection('例句', sentence || '暂无例句', 'english-note-sentence');
      const detailHtml = `${noteSection('译文', note.translation, 'english-note-translation')}${noteSection('解析', note.analysis, 'english-note-analysis')}${noteSection('类似表达', note.similar, 'english-note-similar')}${tags ? `<div class="english-tags">${tags}</div>` : ''}`;
      card.innerHTML = `<div class="english-note-main"><div class="english-note-top"><span>${esc(labels[note.type] || labels.note)}</span><small>${esc(dateText(note.updatedAt || note.createdAt))}</small></div><h3>${esc(note.title || '未命名英语笔记')}</h3>${sentenceHtml}<div class="english-note-extra" hidden style="display:none">${detailHtml || '<div class="english-note-section english-note-empty-detail"><b>补充</b><div>这条笔记还没有译文、解析或类似表达。</div></div>'}</div></div>${inlinePhrasePanel(note)}<div class="english-note-actions"><button type="button" data-toggle-note>展开笔记</button><button type="button" data-edit="${esc(note.id)}">编辑</button><button type="button" data-delete="${esc(note.id)}">×</button></div>`;
      list.append(card);
    });
  }
  function renderPhraseBank(query = '', type = '') {
    const list = $('englishPhraseList');
    if (!list) return;
    list.closest?.('.english-phrase-bank')?.classList.toggle('is-filter-hidden', !!type && type !== 'phrase');
    if (type && type !== 'phrase') {
      list.innerHTML = '';
      return;
    }
    const phrases = read().filter(item => (item.type || '') === 'phrase').filter(item => !query || [item.title, strip(item.sentence || item.content), strip(item.translation), strip(item.analysis), ...(item.tags || [])].some(value => String(value || '').toLowerCase().includes(query))).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    list.innerHTML = phrases.length ? '' : '<div class="english-phrase-empty">还没有词组。看到想记住的表达，就先丢到这里。</div>';
    phrases.forEach(note => {
      const card = document.createElement('div');
      card.className = 'english-phrase-card';
      const phrase = strip(note.sentence || note.content || note.title).trim() || note.title || '未命名词组';
      const meaning = strip(note.translation || '').trim();
      const example = strip(note.analysis || '').trim();
      const tags = (note.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('');
      card.innerHTML = `<div><strong>${esc(phrase)}</strong>${meaning ? `<p>${esc(meaning)}</p>` : ''}${example ? `<small>${esc(example)}</small>` : ''}${tags ? `<div class="english-tags">${tags}</div>` : ''}</div><div class="english-phrase-actions"><button type="button" data-edit-phrase="${esc(note.id)}">编辑</button><button type="button" data-delete-phrase="${esc(note.id)}">×</button></div>`;
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
    const toggle = event.target.closest?.('[data-toggle-note]');
    const cleaner = event.target.closest?.('[data-clean-space]');
    const editPhraseButton = event.target.closest?.('[data-edit-phrase]');
    const deletePhraseButton = event.target.closest?.('[data-delete-phrase]');
    const saveInlinePhraseButton = event.target.closest?.('[data-save-inline-phrase]');
    if (edit) editNote(edit.dataset.edit);
    if (del) removeNote(del.dataset.delete);
    if (editPhraseButton) editPhrase(editPhraseButton.dataset.editPhrase);
    if (deletePhraseButton) removePhrase(deletePhraseButton.dataset.deletePhrase);
    if (saveInlinePhraseButton) saveInlinePhrase(saveInlinePhraseButton);
    if (format) applyFormat(format.dataset.command, format.dataset.value || null);
    if (cleaner) {
      const target = $(cleaner.closest('.english-formatbar')?.dataset.for);
      cleanEditorSpacing(target);
    }
    if (toggle) {
      const card = toggle.closest('.english-note');
      const extra = card?.querySelector('.english-note-extra');
      const collapsed = !card?.classList.contains('is-collapsed');
      card?.classList.toggle('is-collapsed', collapsed);
      card?.classList.toggle('is-expanded', !collapsed);
      const inlinePhrase = collapsed ? card?.querySelector('.english-inline-phrase') : ensureInlinePhrase(card);
      if (extra) {
        extra.hidden = collapsed;
        extra.style.display = collapsed ? 'none' : '';
      }
      if (inlinePhrase) {
        inlinePhrase.hidden = collapsed;
        inlinePhrase.style.display = collapsed ? 'none' : 'grid';
      }
      toggle.textContent = collapsed ? '展开笔记' : '收起笔记';
    }
  });
  editorIds.forEach(id => {
    const node = $(id);
    if (!node) return;
    node.addEventListener('focus', () => { activeEditor = node; });
    node.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      insertCleanParagraph();
    });
    node.addEventListener('input', () => {
      const state = $('englishSaveState');
      if (state) state.textContent = '正在编辑，点击保存后同步';
    });
    node.addEventListener('paste', event => {
      event.preventDefault();
      const html = event.clipboardData?.getData('text/html');
      const text = event.clipboardData?.getData('text/plain');
      document.execCommand('insertHTML', false, html ? cleanHtmlSpacing(html) : plainTextToHtml(text));
    });
  });
  $('saveEnglishNote')?.addEventListener('click', saveNote);
  $('saveEnglishPhrase')?.addEventListener('click', savePhrase);
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
