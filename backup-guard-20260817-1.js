(() => {
  const input = document.getElementById('import');
  const exportButton = document.getElementById('export');
  if (!input) return;
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const bundle = () => ({
    version: 3,
    backupMeta: { app: '美刻', createdAt: new Date().toISOString() },
    planner: read('daymark-v1'),
    links: read('meike-link-book') || [],
    secrets: read('meike-secret-book') || [],
    profile: read('meike-profile') || {}
  });
  if (exportButton) exportButton.onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `美刻备份-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  };
  document.addEventListener('change', event => {
    if (event.target !== input) return;
    event.stopImmediatePropagation();
    const file = input.files?.[0]; if (!file) return;
    file.text().then(text => {
      const data = JSON.parse(text), planner = data.planner || data;
      if (!planner?.days || !planner?.goals) throw Error('invalid');
      const days = Object.keys(planner.days).length;
      const links = Array.isArray(data.links) ? data.links.length : 0;
      const secrets = Array.isArray(data.secrets) ? data.secrets.length : 0;
      const when = data.backupMeta?.createdAt ? new Date(data.backupMeta.createdAt).toLocaleString('zh-CN') : '未知时间';
      if (!confirm(`备份时间：${when}\n包含 ${days} 天记录、${links} 个网址、${secrets} 条秘密。\n\n确定恢复吗？当前数据会被替换。`)) return;
      localStorage.setItem('daymark-v1', JSON.stringify(planner));
      if (Array.isArray(data.links)) localStorage.setItem('meike-link-book', JSON.stringify(data.links));
      if (Array.isArray(data.secrets)) localStorage.setItem('meike-secret-book', JSON.stringify(data.secrets));
      if (data.profile) localStorage.setItem('meike-profile', JSON.stringify(data.profile));
      location.reload();
    }).catch(() => alert('无法识别这个备份文件'));
    input.value = '';
  }, true);
})();
