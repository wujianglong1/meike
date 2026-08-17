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
    item.dataset.sortReady = '1'; item.draggable = true; item.title = '拖动调整习惯顺序';
    item.addEventListener('dragstart', event => { dragged = item; item.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); dragged = null; box.querySelectorAll('.habit').forEach(x => x.classList.remove('drop-target')); saveOrder(); });
    item.addEventListener('dragover', event => { event.preventDefault(); if (!dragged || dragged === item) return; box.querySelectorAll('.habit').forEach(x => x.classList.remove('drop-target')); item.classList.add('drop-target'); const after = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2; box.insertBefore(dragged, after ? item.nextSibling : item); });
  });
  new MutationObserver(prepare).observe(box, { childList: true });
  prepare();
})();
