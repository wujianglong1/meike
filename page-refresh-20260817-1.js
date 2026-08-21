(() => {
  const viewKey = 'meike-refresh-view';
  const validViews = new Set(['today', 'goals', 'life', 'calendar', 'secret', 'links', 'bookshelf', 'literature', 'history', 'styles']);
  const savedView = sessionStorage.getItem(viewKey);
  if (validViews.has(savedView) && typeof view === 'function') requestAnimationFrame(() => view(savedView));
  const button = document.getElementById('pageRefresh');
  if (!button) return;
  button.addEventListener('click', async () => {
    const current = document.querySelector('.view.active')?.id || document.querySelector('.nav.active')?.dataset.view;
    if (validViews.has(current)) sessionStorage.setItem(viewKey, current);
    button.disabled = true;
    button.classList.add('is-updating');
    button.textContent = '更新中…';
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {}
    setTimeout(() => location.reload(), 500);
  });
})();
