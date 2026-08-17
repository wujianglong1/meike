(() => {
  const saved = document.getElementById('saved');
  const accountState = document.getElementById('accountState');
  if (!saved) return;
  const sessionKey = 'meike-supabase-session';
  const set = text => { saved.textContent = text; if (accountState && signedIn()) accountState.textContent = text; };
  const signedIn = () => { try { return !!JSON.parse(localStorage.getItem(sessionKey) || 'null')?.user; } catch { return false; } };
  const mark = () => set(signedIn() ? '已同步' : '仅保存在本机');
  window.addEventListener('meike-local-data-changed', () => set(signedIn() ? '正在同步…' : '已自动保存'));
  window.addEventListener('meike-data-synced', () => set('已同步'));
  window.addEventListener('storage', event => { if (event.key === sessionKey) mark(); });
  mark();
})();
