# TinyFish Search for Raycast

Search the web from Raycast with TinyFish and return formatted result URLs, titles, and snippets.

## Setup

1. Install and authenticate the TinyFish CLI:

   ```bash
   npm install -g @tiny-fish/cli
   tinyfish auth login
   ```

2. Copy `tinyfish-search.sh` into your Raycast Script Commands folder.

3. Make the script executable:

   ```bash
   chmod +x tinyfish-search.sh
   ```

4. Open Raycast, run **TinyFish Search**, and type any query.

## Script

The script calls:

```bash
tinyfish search query "<your query>"
```

It formats the JSON response into readable search results:

```text
Results for: raycast extensions

1. Raycast - Your shortcut to everything
https://www.raycast.com/
Raycast lets you control your tools with a few keystrokes...
```

