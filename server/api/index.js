const app = require('../src/index');

// Vercel serverless handler — must export a plain function (req, res)
module.exports = function handler(req, res) {
  return app(req, res);
};

