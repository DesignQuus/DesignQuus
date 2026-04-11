import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Dev-only plugin: POST /api/dev-save-offsets → writes src/config/partOffsets.json
const devSavePlugin = {
  name: 'dev-save-offsets',
  configureServer(server) {
    server.middlewares.use('/api/dev-save-offsets', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end('Method Not Allowed')
        return
      }
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', () => {
        try {
          JSON.parse(body) // validate JSON before writing
          const filePath = path.resolve('src/config/partOffsets.json')
          fs.writeFileSync(filePath, body, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    })
  },
}

export default defineConfig({
  plugins: [react(), devSavePlugin],
})
