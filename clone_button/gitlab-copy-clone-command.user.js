// ==UserScript==
// @name         GitLab: copy SSH clone command
// @match        https://gitlab.planetabax.com/*
// @run-at       document-idle
// @grant        none
// @version      1.0.0
// @description  Adds a button to copy the current repository's SSH clone command.
// ==/UserScript==

(() => {
  'use strict';

  const buttonId = 'tm-gitlab-copy-clone-command';
  const railSelector = '.ai-navigation-rail';

  // Tampermonkey rail controls use unique ascending data-tm-rail-order values.
  const placeInRailOrder = (button, tabList) => {
    const order = Number(button.dataset.tmRailOrder);
    const nextButton = [...tabList.querySelectorAll('[data-tm-rail-order]')]
      .find((candidate) => candidate !== button && Number(candidate.dataset.tmRailOrder) > order);
    if (button.parentElement !== tabList || (nextButton && button.nextElementSibling !== nextButton)) {
      tabList.insertBefore(button, nextButton);
    }
  };

  const getProjectPath = () => {
    const path = location.pathname.split('/-/')[0].replace(/^\/|\/$/g, '');
    const segments = path.split('/');
    if (!path || segments.length < 2 || segments[0] === 'dashboard') return null;
    if (!window.gon?.current_project_id && !location.pathname.includes('/-/')) return null;
    return path;
  };

  const style = document.createElement('style');
  style.textContent = `
    #${buttonId} {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 44px;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--gl-text-color-default, inherit);
      cursor: pointer;
    }
    #${buttonId} svg { width: 26px; height: 26px; fill: none; stroke: currentColor; }
    html.gl-dark #${buttonId} { color: #fff; }
  `;
  document.head.append(style);

  const sync = () => {
    const rail = document.querySelector(railSelector);
    const tabList = rail?.querySelector('[role="tablist"]');
    if (!tabList || !getProjectPath()) {
      document.querySelectorAll(`#${buttonId}`).forEach((button) => button.remove());
      return;
    }

    let button = tabList.querySelector(`#${buttonId}`);
    if (!button) {
      button = document.createElement('button');
      button.id = buttonId;
      button.type = 'button';
      button.dataset.tmRailOrder = '10';
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      `;
      button.addEventListener('click', () => {
        const projectPath = getProjectPath();
        if (projectPath) {
          navigator.clipboard.writeText(`git clone git@gitlab.planetabax.com:${projectPath}.git`)
            .then(() => { button.title = 'SSH clone command copied'; })
            .catch((error) => console.error('[gitlab-copy-clone-command]', error));
        }
      });
    }

    const label = 'Copy SSH clone command';
    button.title = label;
    button.setAttribute('aria-label', label);
    placeInRailOrder(button, tabList);
  };

  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', sync);
  sync();
})();
