(() => {
  const button = document.getElementById('pageRefresh');
  if (!button) return;
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '更新中…';
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {}
    setTimeout(() => location.reload(), 500);
  });
})();
