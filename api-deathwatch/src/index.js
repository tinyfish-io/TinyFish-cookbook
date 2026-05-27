require("dotenv").config();
const express = require("express");
const { Webhooks } = require("@octokit/webhooks");
const cron = require("node-cron");
const { handleInstallation } = require("./handlers/installation");
const { runWeeklyChecks } = require("./scheduler");

const app = express();
const port = process.env.PORT || 3000;

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
});

// On install — run immediately (first run, no 7-day skip)
webhooks.on("installation.created", async ({ payload }) => {
  console.log(`App installed by: ${payload.installation.account.login}`);
  for (const repo of payload.repositories || []) {
    await handleInstallation(payload.installation.id, repo.full_name, true);
  }
});

// When repos are added to an existing installation
webhooks.on("installation_repositories.added", async ({ payload }) => {
  for (const repo of payload.repositories_added || []) {
    await handleInstallation(payload.installation.id, repo.full_name, true);
  }
});

// Webhook receiver
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    await webhooks.verifyAndReceive({
      id: req.headers["x-github-delivery"],
      name: req.headers["x-github-event"],
      signature: req.headers["x-hub-signature-256"],
      payload: req.body.toString(),
    });
    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send("Bad Request");
  }
});

app.get("/", (req, res) => {
  res.send("API Deathwatch is running.");
});

// Every Monday at 9am — scheduler enforces 7-day gap per repo internally
cron.schedule("0 9 * * 1", async () => {
  console.log("Running weekly health checks...");
  await runWeeklyChecks();
});

app.listen(port, () => {
  console.log(`API Deathwatch listening on port ${port}`);
});