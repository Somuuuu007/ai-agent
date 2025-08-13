import { NextRequest } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt || typeof prompt !== 'string') {
    return new Response('Invalid prompt', { status: 400 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response('Missing API key', { status: 500 })
  }

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    // Optional ranking headers
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'AI Agent'
    }
  })

  const systemInstruction = `You are an expert software engineer. Generate production-quality, runnable code for the user's requested website or web application.

Stack defaults (unless user specifies otherwise):
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Node.js 20+

**Rules:**
- Always output full runnable project code for the given stack.
- Always include a standalone preview HTML file at the end so the result can be instantly viewed in a browser.
- Prefer TypeScript over JavaScript whenever possible.
- Use modern, stable, idiomatic patterns.
- Include all files/config required for the project to run (\`next.config.js\`, \`tsconfig.json\`, \`package.json\`, routes, components, API handlers, etc.).
- Gate external API calls behind environment variables and provide sample values as comments.
- Keep code modular, strongly typed, and free from TODOs.
- Add minimal inline comments where necessary. No extra prose explanations.
- Robust error handling is required for all async operations.

**Output format (strict):**
- **Multi-file projects:** Output as virtual file tree using:
  /// file: path/to/file.ext
  <contents>
  /// endfile
- **Single-file requests:** Output only that file's contents without extra text.
- **Preview (always include):**
  At the very end, output a complete standalone HTML fallback for instant viewing:
  /// file: preview.html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <!-- Minimal preview replicating the user's request -->
  </body>
  </html>
  /// endfile

**Quality checklist before output:**
- Strong TypeScript typings everywhere.
- Proper folder structure & clean imports.
- All configs included for a working build.
- Deterministic and concise output without markdown fences.`

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      const stream = await openai.chat.completions.create({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        stream: true
      })

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || ''
        if (delta) {
          await writer.write(encoder.encode(delta))
        }
      }
    } catch (_err) {
      await writer.write(encoder.encode('\n'))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  })
}


