// ==UserScript==
// @name         GitLab NMD Acronyms & Front Matter
// @namespace    https://example.invalid/gitlab-nmd-acronyms
// @version      1.0.0
// @description  Renders `acronyms:` front matter as <abbr title="..."> tooltips on GitLab file/README, issue, and MR markdown bodies.
// @match        https://gitlab.planetabax.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Replace the @match host above with your self-hosted GitLab domain before use.
// @grant none: this script uses plain same-origin fetch() so the browser attaches
// existing session cookies automatically (no GM_xmlhttpRequest needed). If fetch()
// fails silently (network tab shows 401/403 or a redirect to sign-in), self-hosted
// CSRF/cookie hardening on this instance is the first thing to check.

(function () {
  'use strict';

  function parseFrontMatterAcronyms(md) {
    var fm = md.match(/^\s*---\n([\s\S]*?)\n---/);
    if (!fm) return {};
    var section = fm[1].match(/^acronyms:\s*\n((?:[ \t]+[^\n]+\n?)*)/m);
    if (!section) return {};
    var result = {};
    section[1].replace(/[ \t]+([^:\n]+?)\s*:\s*([^\n]+)/g, function (_, k, v) {
      result[k.trim()] = v.trim();
    });
    return result;
  }

  function applyAcronyms(el, acronyms) {
    var keys = Object.keys(acronyms).sort(function (a, b) { return b.length - a.length; });
    if (!keys.length) return;
    var escaped = keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    var re = new RegExp('(?<![A-Za-z0-9-])(' + escaped.join('|') + ')(?![A-Za-z0-9-])', 'g');
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        while (p && p !== el) {
          var t = p.tagName;
          if (t === 'CODE' || t === 'PRE' || t === 'ABBR' || t === 'A') return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) return;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var abbr = document.createElement('abbr');
        abbr.title = acronyms[m[1]];
        abbr.textContent = m[1];
        frag.appendChild(abbr);
        last = m.index + m[1].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // Front-matter hiding is handled in CSS: GitLab tags the rendered block with
  // pre[data-lang-params="frontmatter"], so no JS/DOM guessing is needed.

  function styleWarningBlockquotes(container) {
    // Ported from nmd.html: a blockquote whose first line is literally "!..."
    // (">! ..." in source) is nmd's warning-note convention.
    container.querySelectorAll('blockquote').forEach(function (bq) {
      var first = bq.firstElementChild;
      if (first && first.textContent.indexOf('!') === 0) {
        first.innerHTML = first.innerHTML.replace(/^!(\s?)/, '');
        bq.classList.add('nmd-warning');
      }
    });
  }

  var CONTAINER_SELECTORS = ['.md', '.md-file', '.gl-markdown', '.wiki', '.description', '.issuable-description', '.js-markdown-body'];

  function findMarkdownContainer() {
    for (var i = 0; i < CONTAINER_SELECTORS.length; i++) {
      var el = document.querySelector(CONTAINER_SELECTORS[i]);
      if (el && el.textContent && el.textContent.trim().length) return el;
    }
    return null;
  }

  function resolveRawUrlFallback() {
    // Project root / tree / wiki pages don't encode the backing file path in the
    // URL, so there's no string-replace trick like blob view's /-/blob/ -> /-/raw/.
    // Best guess: GitLab typically renders a direct link to the raw file somewhere
    // on these pages (e.g. next to the README). Selector unconfirmed on this
    // GitLab version - verify via devtools if this fallback keeps missing.
    var rawLink = document.querySelector('a[href*="/-/raw/"]');
    return rawLink ? rawLink.getAttribute('href') : null;
  }

  function getPageContext() {
    var path = location.pathname;
    // Best-guess regexes: exact GitLab URL structure/version on this instance isn't
    // confirmed. Namespace may contain nested subgroups (a/b/c/-/issues/1), which
    // the greedy `.+` below handles since `/-/issues/` only appears once.
    var issueMatch = path.match(/^\/(.+)\/-\/issues\/(\d+)(?:\/|$)/);
    if (issueMatch) return { type: 'issue', namespace: issueMatch[1], iid: issueMatch[2] };
    var mrMatch = path.match(/^\/(.+)\/-\/merge_requests\/(\d+)(?:\/|$)/);
    if (mrMatch) return { type: 'merge_request', namespace: mrMatch[1], iid: mrMatch[2] };
    if (path.indexOf('/-/blob/') !== -1) return { type: 'blob', rawUrl: path.replace('/-/blob/', '/-/raw/') };
    return { type: 'raw-link-fallback' };
  }

  function getProjectId(namespacePath) {
    // Expected mechanism: GitLab sets a global `gon` object on most pages with
    // gon.current_project_id. Verify `window.gon` exists on this instance if the
    // API fetches below 404. Fallback uses the GitLab API's documented support for
    // a URL-encoded "namespace/project" path in place of the numeric project id.
    if (window.gon && window.gon.current_project_id) return window.gon.current_project_id;
    return encodeURIComponent(namespacePath);
  }

  function fetchRawMarkdown(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('raw fetch failed: ' + r.status + ' ' + url);
      return r.text();
    });
  }

  function fetchIssueDescription(namespacePath, iid) {
    var id = getProjectId(namespacePath);
    return fetch('/api/v4/projects/' + id + '/issues/' + iid, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('issue fetch failed: ' + r.status);
        return r.json();
      })
      .then(function (data) { return data.description || ''; });
  }

  function fetchMergeRequestDescription(namespacePath, iid) {
    var id = getProjectId(namespacePath);
    return fetch('/api/v4/projects/' + id + '/merge_requests/' + iid, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('merge request fetch failed: ' + r.status);
        return r.json();
      })
      .then(function (data) { return data.description || ''; });
  }

  function fetchSource(ctx) {
    if (ctx.type === 'blob') return fetchRawMarkdown(ctx.rawUrl);
    if (ctx.type === 'issue') return fetchIssueDescription(ctx.namespace, ctx.iid);
    if (ctx.type === 'merge_request') return fetchMergeRequestDescription(ctx.namespace, ctx.iid);
    var rawUrl = resolveRawUrlFallback();
    if (!rawUrl) return Promise.reject(new Error('no raw markdown source found for this page'));
    return fetchRawMarkdown(rawUrl);
  }

  var lastProcessedPath = null;
  var processingPath = null;
  var observer;

  function tryProcess() {
    var path = location.pathname;
    if (path === lastProcessedPath || path === processingPath) return;
    var container = findMarkdownContainer();
    if (!container) return;
    var ctx = getPageContext();
    processingPath = path;
    fetchSource(ctx)
      .then(function (md) {
        var acronyms = parseFrontMatterAcronyms(md);
        // Disconnect while we mutate the container ourselves, otherwise the abbr
        // wrapping below (and the front-matter hide) would re-trigger this same
        // observer and loop. Combined with the lastProcessedPath check above (which
        // still applies once reconnected), this is belt-and-suspenders against a
        // self-triggered loop.
        observer.disconnect();
        try {
          applyAcronyms(container, acronyms);
          styleWarningBlockquotes(container);
        } finally {
          observer.observe(document.body, { childList: true, subtree: true });
        }
        lastProcessedPath = path;
      })
      .catch(function (err) {
        console.warn('[gitlab-nmd-acronyms]', err);
      })
      .then(function () {
        if (processingPath === path) processingPath = null;
      });
  }

  observer = new MutationObserver(function () { tryProcess(); });
  observer.observe(document.body, { childList: true, subtree: true });
  tryProcess();
})();
