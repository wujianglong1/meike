(() => {
  const storageKey = 'daymark-page-zoom-v4';
  const slider = document.querySelector('#pageZoom');
  const valueLabel = document.querySelector('#zoomValue');
  const resetButton = document.querySelector('#zoomReset');
  const zoomTargets = document.querySelectorAll('main > .view');
  if (!slider || !valueLabel || !resetButton) return;

  const control = slider.closest('.page-zoom');
  const controlLabel = control.querySelector(':scope > span');
  if (controlLabel) controlLabel.textContent = '内容';

  let mode = localStorage.getItem(storageKey) || 'auto';

  let frame = 0;
  let pendingZoom = 100;

  function paintZoom() {
    frame = 0;
    zoomTargets.forEach(target => { target.style.zoom = `${pendingZoom}%`; });
    slider.value = pendingZoom;
    valueLabel.textContent = `${Math.round(pendingZoom)}%`;
  }

  function applyZoom(value, persist = true) {
    const zoom = Math.min(110, Math.max(60, Number(value) || 100));
    pendingZoom = zoom;
    if (!frame) frame = requestAnimationFrame(paintZoom);
    if (persist) {
      mode = 'manual';
      localStorage.setItem(storageKey, String(zoom));
    }
    control.classList.toggle('is-auto', mode === 'auto');
  }

  slider.addEventListener('input', event => applyZoom(event.target.value, false));
  slider.addEventListener('change', event => {
    mode = 'manual';
    localStorage.setItem(storageKey, String(event.target.value));
    control.classList.remove('is-auto');
  });

  slider.addEventListener('pointerdown', event => {
    const bounds = slider.getBoundingClientRect();
    slider.setPointerCapture(event.pointerId);
    const update = pointerEvent => {
      const ratio = Math.max(0, Math.min(1, (pointerEvent.clientX - bounds.left) / bounds.width));
      const next = Number(slider.min) + ratio * (Number(slider.max) - Number(slider.min));
      applyZoom(Math.round(next), false);
    };
    update(event);
    slider.onpointermove = update;
    slider.onpointerup = slider.onpointercancel = pointerEvent => {
      update(pointerEvent);
      slider.onpointermove = null;
      slider.onpointerup = null;
      slider.onpointercancel = null;
      mode = 'manual';
      localStorage.setItem(storageKey, String(pendingZoom));
      control.classList.remove('is-auto');
    };
  });
  function autoFit(persist = true) {
    const mobile = window.innerWidth <= 800;
    const designWidth = mobile ? 390 : 1500;
    const usableWidth = Math.max(320, window.innerWidth - 16);
    const widthFit = usableWidth / designWidth;
    const minimum = mobile ? 90 : 82;
    const value = Math.max(minimum, Math.min(widthFit * 100, 100));
    mode = 'auto';
    if (persist) localStorage.setItem(storageKey, 'auto');
    applyZoom(value, false);
  }

  resetButton.addEventListener('click', () => autoFit(true));
  window.addEventListener('resize', () => { if (mode === 'auto') autoFit(false); });
  if (mode === 'auto') autoFit(false);
  else applyZoom(Number(mode), false);
})();
