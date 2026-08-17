(() => {
  const box = document.getElementById('habits');
  if (!box) return;

  let drag = null;
  let suppressClick = false;

  const saveOrder = () => {
    try {
      const data = JSON.parse(localStorage.getItem('daymark-v1') || '{}');
      data.settings = data.settings || {};
      data.settings.habitNames = [...box.querySelectorAll('.habit')]
        .map(item => item.querySelector('span')?.textContent || '')
        .filter(Boolean);
      localStorage.setItem('daymark-v1', JSON.stringify(data));
      window.dispatchEvent(new Event('meike-local-data-changed'));
    } catch {}
  };

  const clearDropState = () => {
    box.querySelectorAll('.habit.drop-target').forEach(item => item.classList.remove('drop-target'));
  };

  const restoreItem = () => {
    if (!drag) return;
    const { item, styles } = drag;
    item.classList.remove('dragging');
    item.style.position = styles.position;
    item.style.left = styles.left;
    item.style.top = styles.top;
    item.style.width = styles.width;
    item.style.zIndex = styles.zIndex;
    item.style.pointerEvents = styles.pointerEvents;
    item.style.transform = styles.transform;
    clearDropState();
  };

  const finishDrag = (commit) => {
    if (!drag) return;
    const { item, placeholder, active } = drag;
    if (active && commit && placeholder?.parentNode === box) box.insertBefore(item, placeholder);
    if (placeholder?.parentNode) placeholder.remove();
    restoreItem();
    const didMove = active && commit;
    drag = null;
    if (didMove) saveOrder();
  };

  const beginDrag = (event) => {
    const item = event.currentTarget;
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('input,button')) return;
    if (drag) finishDrag(false);
    const rect = item.getBoundingClientRect();
    drag = {
      item,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      placeholder: null,
      styles: {
        position: item.style.position,
        left: item.style.left,
        top: item.style.top,
        width: item.style.width,
        zIndex: item.style.zIndex,
        pointerEvents: item.style.pointerEvents,
        transform: item.style.transform
      }
    };
    item.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const item = drag.item;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance < 6) return;

    if (!drag.active) {
      const rect = item.getBoundingClientRect();
      const placeholder = document.createElement('span');
      placeholder.className = 'habit-drag-placeholder';
      placeholder.style.width = `${rect.width}px`;
      placeholder.style.height = `${rect.height}px`;
      box.insertBefore(placeholder, item);
      drag.placeholder = placeholder;
      drag.active = true;
      suppressClick = true;
      item.classList.add('dragging');
      item.style.position = 'fixed';
      item.style.left = `${rect.left}px`;
      item.style.top = `${rect.top}px`;
      item.style.width = `${rect.width}px`;
      item.style.zIndex = '20';
      item.style.pointerEvents = 'none';
      item.style.transform = 'translate3d(0, 0, 0)';
    }

    event.preventDefault();
    item.style.transform = `translate3d(${event.clientX - drag.startX}px, ${event.clientY - drag.startY}px, 0)`;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.habit');
    if (!target || target === item || target.parentElement !== box) {
      const items = [...box.querySelectorAll('.habit')].filter(candidate => candidate !== item);
      const first = items[0];
      const last = items[items.length - 1];
      if (first && event.clientY < first.getBoundingClientRect().top) box.insertBefore(drag.placeholder, first);
      else if (last && event.clientY > last.getBoundingClientRect().bottom) box.insertBefore(drag.placeholder, last.nextSibling);
      return;
    }
    clearDropState();
    target.classList.add('drop-target');
    const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    if (after) {
      if (target.nextSibling !== drag.placeholder) box.insertBefore(drag.placeholder, target.nextSibling);
    } else if (target !== drag.placeholder.nextSibling) {
      box.insertBefore(drag.placeholder, target);
    }
  };

  const prepare = () => box.querySelectorAll('.habit').forEach(item => {
    if (item.dataset.sortReady) return;
    item.dataset.sortReady = '1';
    item.draggable = false;
    item.title = '按住胶囊本体拖动调整习惯顺序';
    item.querySelector('.habit-order-controls')?.remove();
    item.addEventListener('pointerdown', beginDrag);
    item.addEventListener('pointermove', moveDrag);
    item.addEventListener('pointerup', () => finishDrag(true));
    item.addEventListener('pointercancel', () => finishDrag(false));
    item.addEventListener('click', event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    });
    item.addEventListener('lostpointercapture', () => {
      if (drag?.item === item) finishDrag(true);
    });
  });

  new MutationObserver(prepare).observe(box, { childList: true });
  prepare();
})();
