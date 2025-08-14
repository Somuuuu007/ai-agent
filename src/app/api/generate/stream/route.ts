import { NextRequest } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { prompt, conversationHistory = [], isFirstRequest = true } = await req.json()
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

  const firstRequestSystemInstruction = `You are an expert software engineer. Generate production-quality, runnable code for the user's requested website or web application.

Stack defaults (unless user specifies otherwise):
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Node.js 20+

**Response Structure:**
Start with a brief project overview and setup instructions, then provide the complete code implementation.

**Required Information to Include:**
1. **Project Overview**: Brief description of what you're building and key features
2. **Setup Instructions**: Step-by-step commands to run the project (npm install, npm run dev, etc.)
3. **Project Structure**: Overview of key files/folders and their purpose
4. **Key Features**: List of main functionality implemented
5. **Environment Setup**: Any required environment variables or configuration
6. **Usage Notes**: How to use or extend the implementation

**Rules:**
- Always output full runnable project code for the given stack.
- Always include a standalone preview HTML file at the end so the result can be instantly viewed in a browser.
- Prefer TypeScript over JavaScript whenever possible.
- Use modern, stable, idiomatic patterns.
- Include all files/config required for the project to run (\`next.config.js\`, \`tsconfig.json\`, \`package.json\`, routes, components, API handlers, etc.).
- Gate external API calls behind environment variables and provide sample values as comments.
- Keep code modular, strongly typed, and free from TODOs.
- Add minimal inline comments where necessary.
- Robust error handling is required for all async operations.

**Output format (strict):**
1. **Start with descriptive text** containing project overview, setup instructions, and structure
2. **Multi-file projects:** Output as virtual file tree using:
   /// file: path/to/file.ext
   <contents>
   /// endfile
3. **Single-file requests:** Output only that file's contents after the description.
4. **Preview (always include):**
   At the very end, output a complete standalone HTML fallback for instant viewing:
   /// file: preview.html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-case=1.0" />
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
- Clear setup and usage instructions provided.
- Deterministic and concise output without markdown fences.`

  const followUpSystemInstruction = `You are an expert software engineer continuing work on an existing project. The user is requesting modifications to code that already exists. Focus ONLY on the changes requested - do not regenerate project setup, overview, or boilerplate explanations.

**Rules:**
- Output ONLY the modified/new code files that need to change
- Do not include project setup, installation instructions, or detailed explanations
- Reference the conversation history to understand the current state of the project
- Make targeted changes that build upon the existing codebase
- Use the same patterns and structure as the existing code
- Keep responses concise and focused only on the requested changes

**Output format (strict):**
- For modified files, emit only the changed files using:
  /// file: path/to/file.ext
  <updated file contents>
  /// endfile

- Update the preview.html ONLY if the visual component needs to change:
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
    <!-- Updated preview reflecting the changes -->
  </body>
  </html>
  /// endfile

**Quality checklist:**
- Only output files that actually changed
- Maintain consistency with existing code structure
- No project setup or overview content`

  const systemInstruction = isFirstRequest ? firstRequestSystemInstruction : followUpSystemInstruction

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      // Build messages array with conversation history
      const messages = [
        { role: 'system', content: systemInstruction },
        ...conversationHistory.map((msg: any) => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: prompt }
      ]

      const stream = await openai.chat.completions.create({
        model: 'openai/gpt-oss-20b:free',
        messages,
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


