/**
 * Node/Express host for the static web export.
 *
 *   npm run build:web   # expo export --platform web -> dist/
 *   npm run serve       # this file
 *   npm run prod        # both
 *
 * Expo's `output: "static"` emits real HTML per route, so `/about` is a file on
 * disk, not a client-side redirect. This server does two things: serve those
 * files with sane caching, and accept the access-request form.
 */

const fs = require("node:fs");
const path = require("node:path");
const { Readable, pipeline } = require("node:stream");
const express = require("express");

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "..", "dist");
const REQUESTS = path.join(__dirname, "access-requests.jsonl");

// The research agent (service/main.py) runs as its own Python process.
const AGENT_URL = (process.env.RESEARCH_API || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

const app = express();
app.use(express.json({ limit: "16kb" }));

if (!fs.existsSync(DIST)) {
  console.error(
    `No build found at ${DIST}\nRun \`npm run build:web\` first (or \`npm run prod\` to do both).`
  );
  process.exit(1);
}

/* ------------------------------------------------------------------- api -- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/api/access-requests", (req, res) => {
  const { email, company, note } = req.body || {};

  if (typeof email !== "string" || !EMAIL.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (company != null && typeof company !== "string") {
    return res.status(400).json({ error: "`company` must be a string." });
  }
  if (note != null && typeof note !== "string") {
    return res.status(400).json({ error: "`note` must be a string." });
  }

  const record = {
    email: email.slice(0, 320),
    company: (company || "").slice(0, 200),
    note: (note || "").slice(0, 2000),
    receivedAt: new Date().toISOString(),
  };

  // A file is the right amount of database for a waitlist. Swap for a real one
  // when there is a real one.
  fs.appendFile(REQUESTS, JSON.stringify(record) + "\n", (err) => {
    if (err) {
      console.error("[access-requests] write failed:", err);
      return res.status(500).json({ error: "Could not record the request." });
    }
    console.log(`[access-requests] ${record.email}`);
    res.status(201).json({ ok: true });
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), agentUrl: AGENT_URL });
});

/* ---------------------------------------------------------- research agent -- */

/**
 * Proxied rather than called from the browser directly, so the page has a
 * single origin and the Python service never needs to be publicly reachable.
 */

function agentUnreachable(res, err) {
  console.error("[research] agent unreachable:", err.message);
  if (res.headersSent) return res.end();
  res.status(502).json({
    error: `Research agent not reachable at ${AGENT_URL}. Start it with \`npm run agent\`.`,
  });
}

app.get("/api/research/stream", async (req, res) => {
  const ticker = String(req.query.ticker || "");
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const upstream = await fetch(
      `${AGENT_URL}/research/stream?ticker=${encodeURIComponent(ticker)}`,
      { signal: controller.signal }
    );

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return res
        .status(upstream.status)
        .json({ error: detail || "Agent rejected the request." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // `pipeline`, not `.pipe()`: a run takes minutes, so the reader closing the
    // tab mid-stream is routine. `.pipe()` does not forward the resulting abort,
    // and an unhandled stream 'error' takes the whole process down with it.
    pipeline(Readable.fromWeb(upstream.body), res, (err) => {
      if (err && !controller.signal.aborted) {
        console.error("[research] stream ended early:", err.message);
      }
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    agentUnreachable(res, err);
  }
});

app.post("/api/research", async (req, res) => {
  try {
    const upstream = await fetch(`${AGENT_URL}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    const payload = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(payload);
  } catch (err) {
    agentUnreachable(res, err);
  }
});

/* ------------------------------------------------------------------ site -- */

// Hashed bundles and fonts are immutable; HTML is not.
app.use(
  express.static(DIST, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(js|css|ttf|woff2?|png|jpg|svg)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  const notFound = path.join(DIST, "+not-found.html");
  res
    .status(404)
    .sendFile(fs.existsSync(notFound) ? notFound : path.join(DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Equity Labs listening on http://localhost:${PORT}`);
});
