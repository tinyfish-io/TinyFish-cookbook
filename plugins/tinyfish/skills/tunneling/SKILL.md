---
name: tunneling
description: Expose local ports to the internet as public HTTPS URLs using tinyfi.sh SSH tunnels. Use when you need to expose a locally running app, test webhooks, or give TinyFish access to a site that is only hosted locally — tunnel it first, then point TinyFish to the tunneled URL. No signup, no API key, no installation beyond SSH.
---

# TinyFish Tunneling (tinyfi.sh)

Create instant public HTTPS URLs for locally running apps via SSH tunneling. Free, no account, no installation beyond SSH.

## Pre-flight Check (REQUIRED)

```bash
which ssh && echo "SSH available" || echo "SSH not found — install OpenSSH first"
```

If SSH is not available, stop and tell the user to install OpenSSH.

---

## Quick Start

**Warning:** This exposes your local service to the public internet. Do not tunnel admin panels, debug endpoints, or services that expose secrets or credentials.

```bash
ssh -o StrictHostKeyChecking=accept-new -R 80:localhost:<PORT> tinyfi.sh
```

Replace `<PORT>` with the port your app is running on. The command prints a public `https://<random>.tinyfi.sh` URL.

> **Note:** `StrictHostKeyChecking=accept-new` automatically trusts the tinyfi.sh host key on first connection and rejects changes on subsequent connections. If you require stricter verification, manually confirm the server fingerprint before first use.

---

## Custom Subdomain

Request a specific subdomain instead of a random one:

```bash
ssh -o StrictHostKeyChecking=accept-new -R myname:80:localhost:<PORT> tinyfi.sh
```

This gives you `https://myname.tinyfi.sh`.

---

## Keep-Alive (Stable Connections)

For long-running tunnels, add a keep-alive interval to prevent disconnection:

```bash
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 -R 80:localhost:<PORT> tinyfi.sh
```

---

## Usage Guidelines

When starting a tunnel for the user:

1. **Ask which port** to expose if not already specified
2. **Run the SSH command** in the background so the agent can continue working
3. **Report the public URL** back to the user once the tunnel is established
4. The tunnel stays open as long as the SSH connection is alive

## Common Ports

| Framework / Tool     | Default Port |
|----------------------|-------------|
| Next.js / React / Express | 3000   |
| Vite                 | 5173        |
| Django               | 8000        |
| Flask                | 5000        |
| Go (net/http)        | 8080        |
| Ruby on Rails        | 3000        |
| PHP (built-in)       | 8000        |

## Rate Limits

- 5 SSH connections per minute per IP
- 100 HTTP requests per minute per IP
- 50 concurrent connections max
- 48-hour idle timeout

$ARGUMENTS
