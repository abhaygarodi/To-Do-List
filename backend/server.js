const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ── In-Memory Task Store ───────────────────────────────────────────────────
let tasks = [];

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/tasks — return all tasks
app.get("/api/tasks", (req, res) => {
    res.json({ success: true, tasks });
});

// POST /api/tasks/sync — replace all tasks with the current client list
app.post("/api/tasks/sync", (req, res) => {
    const { tasks: incoming } = req.body;

    if (!Array.isArray(incoming)) {
        return res.status(400).json({ success: false, error: "tasks must be an array" });
    }

    // Replace in-memory store
    tasks = incoming;

    res.json({
        success: true,
        message: `Synced ${tasks.length} task(s) to the server.`,
        syncedAt: new Date().toISOString(),
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});
