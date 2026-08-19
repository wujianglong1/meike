(() => {
  const storageKey = 'meike-sidebar-collapsed';
  const toggle = document.createElement('button');
  toggle.id = 'sidebarCollapse';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', '收起侧边导航');
  document.body.append(toggle);

  function apply(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    toggle.textContent = collapsed ? '›' : '‹';
    toggle.title = collapsed ? '展开导航' : '收起导航';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', String(!collapsed));
  }

  apply(localStorage.getItem(storageKey) === '1');
  toggle.addEventListener('click', () => {
    const collapsed = !document.body.classList.contains('sidebar-collapsed');
    localStorage.setItem(storageKey, collapsed ? '1' : '0');
    apply(collapsed);
  });
})();
