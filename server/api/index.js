const imported = require('../src/index');

function resolveApp(value) {
  const candidates = [value];
  const seen = new Set();
  while (candidates.length) {
    const candidate = candidates.pop();
    if (typeof candidate === 'function') return candidate;
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) continue;
    seen.add(candidate);
    if (candidate.app) candidates.push(candidate.app);
    if (candidate.default) candidates.push(candidate.default);
  }
  return null;
}

const app = resolveApp(imported);
if (!app) throw new TypeError('Express application export is not callable');

module.exports = function handler(req, res) {
  return app(req, res);
};

