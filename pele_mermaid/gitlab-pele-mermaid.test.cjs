const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let callback;
const diagrams = [];
const removed = [];
const body = {
  nodeType: 1,
  closest: () => null,
  querySelectorAll: () => [good, bad],
};
const element = (source) => ({
  nodeType: 1,
  textContent: source,
  dataset: {},
  closest() { return this; },
  matches: () => true,
  querySelectorAll: () => [],
  after(container) { this.container = container; },
});
const good = element('graph TD; A-->B');
const bad = element('invalid');
const document = {
  body,
  head: { append() {} },
  createElement: () => ({
    isConnected: true,
    remove() { this.isConnected = false; removed.push(this); },
  }),
};
const pele = {
  mount(container, source, options) {
    assert.equal(options.images, false);
    const diagram = { result: source !== 'invalid', destroyed: false, destroy() { this.destroyed = true; } };
    diagrams.push(diagram);
    return diagram;
  },
};
class MutationObserver {
  constructor(fn) { callback = fn; }
  observe() {}
}

vm.runInNewContext(fs.readFileSync(__dirname + '/gitlab-pele-mermaid.user.js', 'utf8'), {
  document, pele, MutationObserver, Node: { ELEMENT_NODE: 1 }, console,
});
assert.ok(Object.hasOwn(good.dataset, 'tmPele'));
assert.equal(Object.hasOwn(bad.dataset, 'tmPele'), false);
assert.equal(diagrams[1].destroyed, true);
assert.ok(removed.includes(bad.container));

callback([{ addedNodes: [good] }]);
assert.equal(diagrams.length, 2);
const added = element('sequenceDiagram\nA->>B: hi');
callback([{ addedNodes: [added] }]);
assert.equal(diagrams.length, 3);
assert.ok(Object.hasOwn(added.dataset, 'tmPele'));
good.container.isConnected = false;
callback([{ addedNodes: [] }]);
assert.equal(diagrams[0].destroyed, true);
