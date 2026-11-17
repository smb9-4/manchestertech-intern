const app = require('../src/index');

// Vercel serverless: export the Express app as the default handler
module.exports = app;
module.exports.default = app;
