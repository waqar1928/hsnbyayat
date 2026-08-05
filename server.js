// Entry point required by Phusion Passenger (used by Hostinger's "Node.js
// App" hosting, confirmed via public_html/.htaccess: PassengerStartupFile
// server.js). Passenger launches this file directly rather than running
// `npm start` / `next start` — it expects a single script that boots an
// HTTP server and listens on the port Passenger provides via process.env.PORT.
// Standard Next.js custom-server pattern; see next.config.ts for app config
// (nothing here needs to duplicate that — `next()` reads it automatically).
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on port ${port} (${dev ? "development" : process.env.NODE_ENV})`);
  });
});
