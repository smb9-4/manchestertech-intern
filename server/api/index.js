const imported = require('../src/index');

// Handle both CJS (module.exports = app) and ESM-interop ({ default: app }) bundling
const app = imported && imported.default ? imported.default : imported;

// Vercel serverless handler — must export a plain function (req, res)
module.exports = function handler(req, res) {
  return app(req, res);
};

