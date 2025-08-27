import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { ConversationMessage } from '@/types'
import { MODEL_CONFIG } from '@/libs/retry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { prompt, conversationHistory = [], isFirstRequest = true }: {
    prompt: string
    conversationHistory: ConversationMessage[]
    isFirstRequest: boolean
  } = await req.json()
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

  const firstRequestSystemInstruction = `Expert software engineer. Generate production-quality Vite projects.

**CRITICAL: PURE VITE PROJECTS ONLY. No Next.js files (next.config.js, app/layout.tsx, app/). Use src/ structure.**

Stack: React 18.3+, TypeScript, Tailwind CSS, Vite

**Response Structure:**
1. Project Overview (brief description)
2. Setup Instructions (detailed step-by-step guide)

**Setup Instructions Format:**
Always provide clear, numbered steps:
1. Create a new folder for your project
2. Copy all the generated files into their respective locations  
3. Open terminal in project folder
4. Run "npm install" to install dependencies
5. Run "npm run dev" to start development server
6. Open http://localhost:5173 in your browser

**Output Format:**
1. **preview.html first** (functional preview with Tailwind CDN)
2. **Project overview**
3. **Setup instructions** (step-by-step)
4. **Files using /// file: path/name format**

 **CRITICAL: Never add markdown code blocks around file contents. Use ONLY the /// file: format without any 
        
**Required Files:**
- package.json (React 18.3.1, deps/devDeps correct)
- tsconfig.json (@/* paths)
- vite.config.ts (@/ aliases)
- index.html (Vite entry)
- src/main.tsx (React entry)
- src/index.css (@tailwind directives if Tailwind)
- tailwind.config.js, postcss.config.js (if Tailwind)

**Critical Rules:**
- Use @/ imports, never ../
- React "^18.3.1", @types/react "^18.3.3"
- Build tools in devDependencies only
- No duplicate packages
- TypeScript everywhere
- All projects must run with npm install && npm run dev

**Templates:**
package.json: React 18.3.1, standard Vite scripts, correct dependencies
tsconfig.json: ES2020, @/* paths mapping
vite.config.ts: @/ alias configuration  
index.html: Standard Vite entry point
src/main.tsx: React.StrictMode wrapper
src/index.css: @tailwind directives if using Tailwind

**Error Prevention:**
- No Next.js files in Vite projects
- No relative imports, use @/
- Build tools only in devDependencies
- Match tsconfig paths with vite aliases
- Validate JSON syntax`

  const followUpSystemInstruction = `Expert software engineer continuing existing project modifications. FOLLOW-UP request.

**DO NOT generate:**
- Project overviews/descriptions
- Setup instructions  
- Project structure explanations
- File listings
- Introductory content

**FOCUS ONLY ON:**
- Specific requested changes
- Modified/new files only
- Updated preview.html if visual changes

**Output format:**
1. **preview.html** (if visual changes)
2. **Only changed files** using /// file: path/name format

**CRITICAL: Never add markdown code blocks around file contents. Use ONLY the /// file: format.**

**Rules:**
- Analyze conversation history for context
- Use existing patterns/consistency  
- Output ONLY modified files
- Keep responses concise
- Use @/ imports
- Maintain React 18.3+ compatibility

**Examples:**
- "Change button color" → preview.html + component file only
- "Add input field" → preview.html + component file only
- "Fix layout" → preview.html + CSS/component file only

This is a continuation - user has full project context from previous responses.`

  const systemInstruction = isFirstRequest ? firstRequestSystemInstruction : followUpSystemInstruction

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      console.log(`Using model: ${MODEL_CONFIG.name}`)
      
      // Build messages array with conversation history
      const messages = [
        { role: 'system' as const, content: systemInstruction },
        ...conversationHistory.map((msg: ConversationMessage) => ({ role: msg.role, content: msg.content })),
        { role: 'user' as const, content: prompt }
      ]

      // Direct API call without queue system
      const stream = await openai.chat.completions.create({
        model: MODEL_CONFIG.name,
        messages,
        stream: true,
        max_tokens: MODEL_CONFIG.maxTokens,
        temperature: MODEL_CONFIG.temperature
      })

      console.log(`Request processed successfully with model: ${MODEL_CONFIG.name}`)
      
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || ''
        if (delta) {
          try {
            await writer.write(encoder.encode(delta))
          } catch (writeError) {
            // Client disconnected, stop writing
            break
          }
        }
      }
      
    } catch (error: any) {
      console.error(`Request failed:`, {
        status: error?.status || error?.statusCode,
        message: error?.message
      })
      
      let errorMessage = 'Failed to generate response. '
      
      if (error?.status === 429 || error?.statusCode === 429) {
        errorMessage += 'Rate limit exceeded. Please wait a moment before trying again.'
      } else if (error?.status >= 500) {
        errorMessage += 'Server error occurred. Please try again later.'
      } else if (error?.message?.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.'
      } else {
        errorMessage += 'Please try again.'
      }
      
      try {
        await writer.write(encoder.encode(`Error: ${errorMessage}\n`))
      } catch (writeError) {
        // Ignore write errors when client disconnected
      }
    } finally {
      try {
        await writer.close()
      } catch (closeError) {
        // Stream already closed, ignore
      }
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


