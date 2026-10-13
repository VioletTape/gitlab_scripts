// ==UserScript==
// @name         GitLab: collapse issuable details
// @match        https://gitlab.planetabax.com/*
// @run-at       document-idle
// @grant        none
// @version      1.0.0
// @description  gitlab space saver, collapse issuable details
// ==/UserScript==

(() => {
  'use strict';

  // shortcut: targets GitLab's current sidebar classes; update these selectors if GitLab changes them.
  const mergeRequestSidebarSelector = '.issuable-sidebar.is-merge-request';
  const workItemSidebarSelector = '[data-testid="detail-layout-sidebar"], .work-item-overview-right-sidebar';
  const railSelector = '.ai-navigation-rail';
  const collapsedClass = 'tm-issuable-context-collapsed';
  let collapsed = true;

  const style = document.createElement('style');
  style.textContent = `
    .right-sidebar.${collapsedClass},
    [data-testid="detail-layout-sidebar"].${collapsedClass},
    .work-item-overview-right-sidebar.${collapsedClass} { display: none !important; }
    .merge-request-overview.${collapsedClass} { grid-template-columns: minmax(0, 1fr) !important; }
    .work-item-overview.${collapsedClass} { display: block !important; }
    .gl-detail-layout-container.${collapsedClass} { grid-template-columns: minmax(0, 1fr) !important; }
    #tm-issuable-context-toggle {
      position: relative;
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
    #tm-issuable-context-toggle svg { width: 26px; height: 26px; fill: currentColor; }
    html.gl-dark #tm-issuable-context-toggle { color: #fff; }
  `;
  document.head.append(style);

  const sync = () => {
    const sidebar = location.pathname.includes('/work_items')
      ? document.querySelector(workItemSidebarSelector)
      : document.querySelector(mergeRequestSidebarSelector)?.closest('.right-sidebar');
    const rail = document.querySelector(railSelector);
    const tabList = rail?.querySelector('[role="tablist"]');

    if (!sidebar || !rail || !tabList || sidebar.contains(rail)) {
      rail?.querySelectorAll('#tm-issuable-context-divider, #tm-issuable-context-toggle').forEach((element) => element.remove());
      return;
    }

    const hideSidebar = collapsed;
    sidebar.classList.toggle(collapsedClass, hideSidebar);
    sidebar.closest('.merge-request-overview, .work-item-overview, .gl-detail-layout-container')?.classList.toggle(collapsedClass, hideSidebar);

    let divider = rail.querySelector('#tm-issuable-context-divider');
    if (!divider) {
      divider = document.createElement('div');
      divider.id = 'tm-issuable-context-divider';
      divider.className = 'gl-h-5 gl-w-1 gl-border-0 gl-border-r-1 gl-border-solid gl-border-strong lg:gl-mx-auto lg:gl-h-1 lg:gl-w-5 lg:gl-border-r-0 lg:gl-border-t-1';
      divider.setAttribute('aria-hidden', 'true');
    }

    let button = rail.querySelector('#tm-issuable-context-toggle');
    if (!button) {
      button = document.createElement('button');
      button.id = 'tm-issuable-context-toggle';
      button.type = 'button';
      button.innerHTML = `
        <svg viewBox="16 11 68 78" aria-hidden="true" focusable="false">
          <path d="m82.125 75.832v-51.664c0-6.375-5.207-11.582-11.582-11.582l-41.086-0.003907c-6.375 0-11.582 5.207-11.582 11.582v51.668c0 6.375 5.207 11.582 11.582 11.582h41.125c6.375 0.003907 11.543-5.207 11.543-11.582zm-60.082 0v-51.664c0-4.082 3.332-7.418 7.418-7.418h41.125c4.082 0 7.418 3.332 7.418 7.418v51.668c0 4.082-3.332 7.418-7.418 7.418l-41.129-0.003906c-4.125 0-7.4141-3.332-7.4141-7.418z"/>
          <path d="m65.543 28.793h-19.293c-1.168 0-2.082 0.91797-2.082 2.082 0 1.168 0.91797 2.082 2.082 2.082h19.293c1.168 0 2.082-0.91797 2.082-2.082 0-1.168-0.95703-2.082-2.082-2.082z"/>
          <path d="m65.543 47.918h-19.293c-1.168 0-2.082 0.91797-2.082 2.082 0 1.168 0.91797 2.082 2.082 2.082h19.293c1.168 0 2.082-0.91797 2.082-2.082 0-1.168-0.95703-2.082-2.082-2.082z"/>
          <path d="m65.543 67.043h-19.293c-1.168 0-2.082 0.91797-2.082 2.082 0 1.168 0.91797 2.082 2.082 2.082h19.293c1.168 0 2.082-0.91797 2.082-2.082 0-1.168-0.95703-2.082-2.082-2.082z"/>
          <path d="m32.625 29.043c-0.5 0.5-0.75 1.1641-0.75 1.832 0 0.70703 0.25 1.332 0.75 1.832s1.168 0.79297 1.832 0.79297c0.33203 0 0.70703-0.082031 1-0.20703 0.33203-0.125 0.58203-0.33203 0.83203-0.58203 0.50391-0.50391 0.79297-1.1289 0.79297-1.8359 0-0.66797-0.29297-1.375-0.79297-1.832-0.95703-1-2.707-0.96094-3.6641 0z"/>
          <path d="m32.625 48.168c-0.5 0.45703-0.75 1.1641-0.75 1.832 0 0.70703 0.25 1.332 0.75 1.832s1.168 0.79297 1.832 0.79297c0.70703 0 1.375-0.29297 1.832-0.79297 0.50391-0.5 0.79297-1.125 0.79297-1.832s-0.29297-1.375-0.79297-1.832c-0.95703-1-2.707-1-3.6641 0z"/>
          <path d="m32.625 67.293c-0.5 0.45703-0.75 1.125-0.75 1.832 0 0.33203 0.042969 0.66797 0.16797 1 0.16797 0.29297 0.33203 0.58203 0.58203 0.83203 0.5 0.5 1.125 0.75 1.832 0.75s1.375-0.25 1.832-0.75c0.25-0.25 0.45703-0.54297 0.58203-0.83203 0.125-0.33203 0.20703-0.66797 0.20703-1 0-0.70703-0.29297-1.375-0.79297-1.832-0.95312-1-2.7031-1-3.6602 0z"/>
        </svg>
      `;
      button.addEventListener('click', () => {
        collapsed = !collapsed;
        sync();
      });
    }
    if (divider.parentElement !== tabList || divider.nextElementSibling !== button || button !== tabList.lastElementChild) {
      tabList.append(divider, button);
    }

    const label = collapsed ? 'Show assignees and reviewers' : 'Hide assignees and reviewers';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', String(!collapsed));
  };

  new MutationObserver(sync).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  sync();
})();
