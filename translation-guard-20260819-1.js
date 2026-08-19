(() => {
  const selectors = [
    'iframe.goog-te-banner-frame',
    'iframe.goog-te-menu-frame',
    '.goog-te-banner-frame',
    '.goog-te-menu-frame',
    '.goog-te-balloon-frame',
    '#goog-gt-tt',
    'body > .skiptranslate'
  ];
  const suppress = () => {
    document.documentElement.classList.add('notranslate');
    document.documentElement.style.top = '0px';
    if (document.body) document.body.style.top = '0px';
    selectors.forEach(selector => document.querySelectorAll(selector).forEach(node => node.remove()));
  };
  suppress();
  new MutationObserver(suppress).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', suppress);
})();
