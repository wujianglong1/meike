(() => {
  const box = document.getElementById('habits');
  if (!box) return;
  let dragged = null;
  const saveOrder = () => {
    try {
      const data = JSON.parse(localStorage.getItem('daymark-v1') || '{}');
      data.settings = data.settings || {};
      data.settings.habitNames = [...box.querySelectorAll('.habit')].map(item => item.querySelector('span')?.textContent || '').filter(Boolean);
      localStorage.setItem('daymark-v1', JSON.stringify(data));
      window.dispatchEvent(new Event('meike-local-data-changed'));
    } catch {}
  };
  const prepare = () => box.querySelectorAll('.habit').forEach(item => {
    if (item.dataset.sortReady) return;
    item.dataset.sortReady = '1'; item.draggable = false; item.title = '拖动调整习惯顺序';
    const controls = document.createElement('span'); controls.className = 'habit-order-controls';
    [['↑','上移'],['↓','下移']].forEach(([symbol, title], index) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = symbol; button.title = title; button.addEventListener('click', event => { event.preventDefault(); const target = index === 0 ? item.previousElementSibling : item.nextElementSibling; if (!target) return; box.insertBefore(item, index === 0 ? target : target.nextSibling); saveOrder(); }); controls.append(button); });
    item.append(controls);
    item.addEventListener('dragstart', event => { dragged = item; item.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); dragged = null; box.querySelectorAll('.habit').forEach(x => x.classList.remove('drop-target')); saveOrder(); });
    item.addEventListener('dragover', event => { event.preventDefault(); if (!dragged || dragged === item) return; box.querySelectorAll('.habit').forEach(x => x.classList.remove('drop-target')); item.classList.add('drop-target'); const after = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2; box.insertBefore(dragged, after ? item.nextSibling : item); });
    item.addEventListener('pointerdown', event => {
      if (event.target.closest('input,button')) return;
      dragged = item; item.classList.add('dragging'); item.setPointerCapture?.(event.pointerId);
    });
    item.addEventListener('pointermove', event => {
      if (dragged !== item) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.habit');
      if (!target || target === item || target.parentElement !== box) return;
      const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
      box.insertBefore(item, after ? target.nextSibling : target);
    });
    item.addEventListener('pointerup', () => { if (dragged !== item) return; item.classList.remove('dragging'); dragged = null; saveOrder(); });
    item.addEventListener('pointercancel', () => { item.classList.remove('dragging'); dragged = null; });
  });
  new MutationObserver(prepare).observe(box, { childList: true });
  prepare();
})();
