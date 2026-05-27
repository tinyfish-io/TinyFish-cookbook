const fetch = require("node-fetch");

function createAppJWT() {
  const crypto = require("crypto");
  const appId = process.env.GITHUB_APP_ID;

  // Support both file path (local dev) and raw key string (Railway/production)
  let privateKey;
  if (process.env.GITHUB_PRIVATE_KEY) {
    // Railway — key stored as env var, newlines encoded as \n
    privateKey = process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n");
  } else {
    const fs = require("fs");
    const keyPath = process.env.GITHUB_PRIVATE_KEY_PATH || "./private-key.pem";
    privateKey = fs.readFileSync(keyPath, "utf8");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 60,
    iss: appId,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${header}.${body}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signingInput}.${signature}`;
}

async function getInstallationToken(installationId) {
  const jwt = createAppJWT();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get installation token: ${err}`);
  }

  const data = await res.json();
  return data.token;
}

async function githubRequest(path, installationId, options = {}) {
  const token = await getInstallationToken(installationId);

  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error (${res.status}) for ${path}: ${err}`);
  }

  return res.json();
}

async function getAllInstallations() {
  const jwt = createAppJWT();

  const res = await fetch("https://api.github.com/app/installations", {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) return [];
  return res.json();
}

module.exports = { getInstallationToken, githubRequest, getAllInstallations };