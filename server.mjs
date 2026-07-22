import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

// ── CONFIG ───────────────────────────────────────────────────────────────
// This is the ONLY thing you should ever need to change if BotHosting.net
// ever gives you a different hostname/port (e.g. after a server restart
// on their end, or if you upgrade/move nodes).
const TARGET = "http://fi11.bot-hosting.net:20623";
// ─────────────────────────────────────────────────────────────────────────

const app = express();

// Render sets PORT for us automatically — do not hardcode this.
const PORT = process.env.PORT || 10000;

const proxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,   // rewrites the Host header to match the target
  ws: true,              // forwards WebSocket upgrades too (needed if the
                          // admin dashboard or anything else uses a live
                          // socket connection through the browser)
  on: {
    error: (err, req, res) => {
      console.error("[proxy error]", err.message);
      if (res && "writeHead" in res) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad gateway — the origin server (BotHosting.net) did not respond. It may be restarting or offline.");
      }
    },
  },
});

app.use("/", proxy);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[proxy] listening on port ${PORT}, forwarding to ${TARGET}`);
});

// Explicitly wire up WebSocket upgrade forwarding — http-proxy-middleware
// needs this hooked into the raw HTTP server's 'upgrade' event, not just
// the Express app, or WebSocket connections silently fail to proxy.
server.on("upgrade", proxy.upgrade);
