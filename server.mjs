import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

// ── CONFIG ───────────────────────────────────────────────────────────────
// This is the ONLY thing you should ever need to change if your host
// ever gives you a different hostname/port (e.g. after a server restart
// on their end, or if you upgrade/move nodes).
//
// CHANGED for the move off bothosting.net (old target:
// http://fi11.bot-hosting.net:20623, kept here in history only).
//
// Node hostname confirmed from the panel's SFTP connection details:
//   sftp://nodej.eaglegnick.tech:2022
// "MADOVA TECH" / "REQUIEM ORDER" (seen with spaces, changed between
// checks) was the server's own display NAME in the panel, not a network
// address — that's why it kept changing and never worked as a hostname.
// The actual node address is nodej.eaglegnick.tech.
//
// Port 2022 above is SFTP's port, NOT the bot's port — do not reuse it
// here. The bot's own PORT is set separately in start.sh (currently
// 4042). Before this proxy goes live, open the panel's
// Allocations/Network tab specifically (not the SFTP details box) and
// confirm 4042 is really the allocated port for THIS server's primary
// connection — if the panel gave you a different port there, update the
// number below to match it exactly, and update start.sh's PORT to the
// same number.
const TARGET = "http://nodej.eaglegnick.tech:3032";
// ─────────────────────────────────────────────────────────────────────────

const app = express();

// Whatever platform this proxy itself runs on sets PORT for us — do not
// hardcode this. This is a DIFFERENT port from the bot's own PORT in
// start.sh: this bender is a separate small process (likely still on
// Render, or wherever you're running the domain redirect from), sitting
// in front of the bot host and forwarding to TARGET above. If this proxy
// process moves too, its own platform will supply a new PORT value here
// automatically — nothing to edit in that case either.
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
        res.end("Requiem Order is down alert mods or try again later. Also try refreshing your page.");
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
