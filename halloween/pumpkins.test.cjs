const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const element = () => ({
  attrs: new Map(),
  writes: 0,
  getAttribute(name) { return this.attrs.get(name) ?? null; },
  hasAttribute(name) { return this.attrs.has(name); },
  setAttribute(name, value) { this.writes++; this.attrs.set(name, value); },
  removeAttribute(name) { this.writes++; this.attrs.delete(name); },
  toggleAttribute(name, active) {
    if (active) this.setAttribute(name, '');
    else this.removeAttribute(name);
  },
});
const root = element();
const svg = element();
const use = element();
use.closest = () => svg;
use.setAttribute('href', '/assets/icons.svg#status_success_borderless');
let callback;
let options;
const events = {};
const styles = [];
const context = {
  document: {
    documentElement: root,
    body: {},
    head: { append: (style) => styles.push(style) },
    createElement: element,
    querySelectorAll: () => [use],
  },
  location: { pathname: '/group/project/-/pipelines' },
  window: { addEventListener: (name, fn) => { events[name] = fn; } },
  requestAnimationFrame: (fn) => fn(),
  MutationObserver: class {
    constructor(fn) { callback = fn; }
    observe(target, settings) { options = settings; }
  },
};
vm.runInNewContext(fs.readFileSync(`${__dirname}/gitlab-pipeline-pumpkins.user.js`, 'utf8'), context);
assert.equal(svg.getAttribute('data-tm-pumpkin'), 'success');
assert.equal(root.hasAttribute('data-tm-pipeline-pumpkins'), true);
const writes = svg.writes + root.writes;
callback();
assert.equal(svg.writes + root.writes, writes, 'Repeated sync must not mutate the DOM');
assert.ok(!options.attributeFilter.includes('data-tm-pumpkin'), 'Do not observe own attributes');

for (const [status, expected] of Object.entries({
  success: 'success', failed: 'canceled', running: 'running', pending: 'pending',
  created: 'pending', preparing: 'pending', waiting_for_resource: 'pending',
  scheduled: 'pending', manual: 'pending', canceled: 'canceled', skipped: null,
  warning: 'failed', unknown: null,
})) {
  use.setAttribute('href', `#status_${status}`);
  callback();
  assert.equal(svg.getAttribute('data-tm-pumpkin'), expected, status);
}
use.removeAttribute('href');
use.setAttribute('xlink:href', '#status_running_borderless');
callback();
assert.equal(svg.getAttribute('data-tm-pumpkin'), 'running');
use.setAttribute('xlink:href', '#success');
callback();
assert.equal(svg.getAttribute('data-tm-pumpkin'), null, 'Only GitLab status sprites are decorated');
context.location.pathname = '/group/project/-/pipelines/123';
callback();
assert.equal(root.hasAttribute('data-tm-pipeline-pumpkins'), true);
context.location.pathname = '/dashboard/projects';
events.popstate();
assert.equal(root.hasAttribute('data-tm-pipeline-pumpkins'), false);
assert.equal(styles.length, 1);
assert.equal((styles[0].textContent.match(/data:image\/png;base64,/g) || []).length, 5);
console.log('Pumpkin status mapping, updates, navigation, embedding, and idempotence passed.');
