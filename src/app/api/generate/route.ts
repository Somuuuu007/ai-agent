import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
    }

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'AI Agent'
      }
    })

    const systemInstruction = `You are an expert software engineer. Generate production-quality code that directly fulfills the user's request. Prefer TypeScript when possible. Use modern, stable patterns for the specified stack (e.g., Next.js 15 App Router, React 19, Node 20+).

Rules:
- Output only code and minimal inline comments. Avoid prose explanations unless explicitly requested.
- Match the user’s stack and versions. If unspecified, default to: Next.js 15, React 19, TypeScript 5, Node 20.
- Include all required files/config for a runnable result (routes, components, server files, env usage notes as comments).
- Do not invent unavailable APIs or secrets. Gate external calls behind env variables and show sample usage.
- Keep code clear, modular, and strongly typed. No TODOs.

Output format (strict):
- For multi-file results, emit a virtual file tree using repeating blocks:
  /// file: path/to/file.ext
  <file contents>
  /// endfile

- For single-file results, output just that file’s contents.

- If (and only if) the user asks for a live web UI/previewable page, also include a complete HTML fallback at the end that can be opened standalone:
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
    <!-- Minimal preview using the user’s request -->
  </body>
  </html>
  /// endfile

Quality checklist:
- Strong typing, proper error handling, and clear folder structure.
- Include any required config (e.g., next.config, tsconfig, package.json scripts) if the project needs them.
- Keep responses deterministic and concise; no markdown fences around the virtual file blocks.`

    // Retry logic for API failures
    let contentText = ''
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts) {
      try {
        const completion = await openai.chat.completions.create({
          model: '"openai/gpt-oss-20b:free"',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ]
        })
        contentText = completion.choices?.[0]?.message?.content || ''
        break
      } catch (apiError: unknown) {
        attempts++
        console.log(`Attempt ${attempts} failed:`, apiError)
        
        if (attempts === maxAttempts) {
          throw apiError
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempts) * 1000
        console.log(`Retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    const text = contentText.trim()

    console.log('Raw Gemini response:', text)

    let preview = ''
    let code = ''
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(text || '{}')
      preview = parsed.preview || ''
      code = parsed.code || ''
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      
      // If JSON parsing fails, try to extract from markdown-like format
      if (text && text.includes('```json')) {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1])
            preview = parsed.preview || ''
            code = parsed.code || ''
          } catch {
            throw new Error('Failed to parse JSON from markdown format')
          }
        } else {
          throw new Error('No valid JSON found in response')
        }
      } else {
        // Last resort: use raw text as preview
        preview = text || ''
        code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated UI</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    ${text}
</body>
</html>`
      }
    }

    return NextResponse.json({ preview, code })
  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({ 
      error: 'Failed to generate', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}


