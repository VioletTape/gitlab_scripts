// ==UserScript==
// @name         GitLab: Pele Mermaid renderer
// @match        https://gitlab.planetabax.com/*
// @run-at       document-idle
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/pele@1.12.0/dist/pele.global.js
// @version      1.1.0
// @description  Render GitLab Markdown Mermaid diagrams with Pele.
// ==/UserScript==

(() => {
  'use strict';

  const selector = 'pre[data-canonical-lang="mermaid"], pre.js-render-mermaid, pre:has(> code.js-render-mermaid)';
  const processed = new WeakSet();
  const mounts = new Map();
  const style = document.createElement('style');
  style.textContent = `
    pre[data-tm-pele] { display: none !important; }
    pre[data-tm-pele] ~ div > iframe[src*="sandbox/mermaid"] { display: none; }
    .tm-pele-diagram {
      --pele-bg: #fff;
      --pele-fg: #1f1e24;
      --pele-muted: #535158;
      --pele-line: #535158;
      --pele-surface: #f1f1f3;
      --pele-surface-alt: #e2e2e5;
      --pele-border: #89888d;
      --pele-accent: #1f75cb;
    }
    html.gl-dark .tm-pele-diagram {
      --pele-bg: #101217;
      --pele-fg: #ececef;
      --pele-muted: #c4c3c9;
      --pele-line: #c4c3c9;
      --pele-surface: #30313a;
      --pele-surface-alt: #22242c;
      --pele-border: #737278;
      --pele-accent: #63a6e9;
    }
  `;
  document.head.append(style);

  const render = (pre) => {
    if (processed.has(pre) || !pre.textContent.trim()) return;
    processed.add(pre);
    const container = document.createElement('div');
    container.className = 'tm-pele-diagram';
    pre.after(container);
    try {
      // GitLab may proxy diagram images; do not load them directly from Pele.
      const diagram = pele.mount(container, pre.textContent, { images: false });
      if (!diagram.result) {
        diagram.destroy();
        container.remove();
        return;
      }
      pre.dataset.tmPele = '';
      mounts.set(container, diagram);
    } catch (error) {
      container.remove();
      console.warn('[gitlab-pele-mermaid]', error);
    }
  };

  const scan = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const pre = node.closest('pre');
    if (pre?.matches(selector)) render(pre);
    node.querySelectorAll(selector).forEach(render);
  };

  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(scan));
    mounts.forEach((diagram, container) => {
      if (!container.isConnected) {
        diagram.destroy();
        mounts.delete(container);
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
  scan(document.body);
})();
