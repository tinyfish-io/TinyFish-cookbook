import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { TinyFish } from '@tiny-fish/sdk'

// https://vite.dev/config/
function tinyFishDevProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'tinyfish-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tinyfish/stream', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing VITE_TINYFISH_API_KEY' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}') as { url?: string; goal?: string }
            if (!parsed.url || !parsed.goal) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing url or goal' }))
              return
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')
            // Send headers immediately so the browser sees the stream start.
            res.flushHeaders?.()

            const client = new TinyFish({ apiKey })
            const controller = new AbortController()
            let closed = false

            // Important: `req` "close" can fire after the request body ends even
            // though the client is still connected for the streaming response.
            // Abort only when the client actually disconnects.
            req.on('aborted', () => controller.abort())
            res.on('close', () => {
              closed = true
              controller.abort()
            })

            const stream = await client.agent.stream(
              { url: parsed.url, goal: parsed.goal },
              { signal: controller.signal },
            )

            for await (const event of stream as AsyncIterable<unknown>) {
              if (closed || res.writableEnded) break
              try {
                res.write(`data: ${JSON.stringify(event)}\n\n`)
              } catch {
                break
              }
            }
            if (!res.writableEnded) res.end()
          } catch (e) {
            if (!res.writableEnded) {
              try {
                res.write(
                  `data: ${JSON.stringify({
                    type: 'ERROR',
                    message: e instanceof Error ? e.message : String(e),
                  })}\n\n`,
                )
              } catch {
                // ignore
              }
              res.end()
            }
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), tinyFishDevProxy(env.VITE_TINYFISH_API_KEY)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
