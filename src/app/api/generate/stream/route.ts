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

  // Gemini is the default/primary provider. OpenRouter is fallback only.
  const geminiKey = process.env.GEMINI_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const isGemini = !!geminiKey
  const apiKey = geminiKey || openrouterKey

  if (!apiKey) {
    return new Response('Missing API key. Set GEMINI_API_KEY in .env.local', { status: 500 })
  }

  console.log(`Provider: ${isGemini ? 'Google Gemini (primary)' : 'OpenRouter (fallback)'}`)

  const openai = new OpenAI({
    baseURL: isGemini
      ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
      : 'https://openrouter.ai/api/v1',
    apiKey,
    ...(isGemini ? {} : {
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'AI Agent'
      }
    })
  })

  const firstRequestSystemInstruction = `You are an expert software engineer. Generate production-quality Vite + React + TypeScript + Tailwind CSS projects.

STRICT OUTPUT FORMAT — follow this EXACTLY, in this order:

==================================================
STEP 1 — Write the preview file using this marker:
/// file: preview.html
<!DOCTYPE html>
... (complete self-contained HTML using Tailwind CDN, no external dependencies)
</html>

==================================================
STEP 2 — Write project overview and setup using these exact markers:

=== PROJECT OVERVIEW ===
(2-4 sentences describing what the project does and its tech stack)

=== SETUP INSTRUCTIONS ===
1. Create a new folder and open terminal inside it
2. Run: npm create vite@latest . -- --template react-ts
3. Delete the src folder contents, then paste all generated files into their locations
4. Run: npm install
5. Run: npm run dev
6. Open: http://localhost:5173

==================================================
STEP 3 — Write ALL project files using this marker format:
/// file: path/filename.ext
(raw file content — NO triple backticks, NO markdown fences, just plain text)

/// file: next-file.ext
(raw file content)

==================================================

ABSOLUTE RULES:
- NEVER use triple backticks anywhere in the response
- NEVER wrap file contents in markdown code fences
- Every file MUST start with /// file: marker
- preview.html MUST come first, before overview and code files
- === PROJECT OVERVIEW === and === SETUP INSTRUCTIONS === markers are REQUIRED
- Use PURE VITE structure only — NO Next.js files (no next.config.js, no app/ folder)
- Use @/ imports everywhere, never use ../
- React "^18.3.1", @types/react "^18.3.3"
- Build tools in devDependencies only

Required files to generate:
- package.json
- tsconfig.json
- vite.config.ts
- index.html
- src/main.tsx
- src/index.css
- src/App.tsx
- tailwind.config.js + postcss.config.js (always include Tailwind)
- All component files needed for the project`

  const followUpSystemInstruction = `Expert software engineer continuing existing project modifications. FOLLOW-UP request.

**🚨 ABSOLUTE RULE: NO MARKDOWN CODE BLOCKS EVER 🚨**
NEVER use triple backticks with json, typescript, html, css or ANY code blocks around file contents.
ONLY use /// file: format with plain text content.

**CONTEXT ANALYSIS:** Analyze the conversation history to understand:
- What files currently exist in the project
- Current project structure and components  
- Previous styling/functionality that was implemented
- Technologies and patterns being used

**CRITICAL OUTPUT REQUIREMENTS:**
1. **ALWAYS generate preview.html first** - Updated preview showing the requested changes
2. **ONLY generate files that need modification** - Never regenerate unchanged files
3. **Use exact same file paths** as in conversation history
4. **Maintain all existing functionality** while applying requested changes

**DO NOT generate:**
- Project overviews/descriptions
- Setup instructions  
- File listings or project explanations
- Complete project regeneration

**Output format (STRICT):**
/// file: preview.html
<!DOCTYPE html>
[Updated preview with changes applied]
</html>

/// file: path/to/changed/file.ext
[Only the modified file content]

**ABSOLUTELY CRITICAL - NO MARKDOWN CODE BLOCKS EVER:**
- NO triple backticks json, javascript, typescript, html, css, markdown
- NO code block wrapping of ANY kind
- ONLY use /// file: format with raw content
- File content must be unwrapped plain text

**Context-Aware Rules:**
- Reference existing components/files from conversation history
- Keep same import patterns and file structure  
- Apply changes while preserving existing functionality
- Update preview to reflect the exact requested changes
- Use same tech stack (React 18.3+, TypeScript, Tailwind, etc.)

**Token Efficiency:** 
- Focus only on the specific requested change
- Don't repeat unchanged code
- Reference existing patterns from conversation history`

  // Function to create token-efficient context for follow-up requests
  const createFollowUpContext = (conversationHistory: ConversationMessage[]): ConversationMessage[] => {
    if (conversationHistory.length === 0) return []
    
    // Find the last assistant response (contains the generated project)
    const lastAssistantResponse = [...conversationHistory].reverse().find(msg => msg.role === 'assistant')
    
    if (!lastAssistantResponse) return conversationHistory
    
    // Extract comprehensive project context from the last response
    const extractProjectContext = (response: string) => {
      const fileBlocks = response.match(/\/\/\/ file: [^\n]+/g) || []
      const existingFiles = fileBlocks.map(block => block.replace('/// file: ', '')).filter(file => file !== 'preview.html')
      
      // Detect project type and technologies with more precision
      const hasTailwind = response.includes('tailwind') || response.includes('Tailwind') || response.includes('@tailwind')
      // const hasTypeScript = response.includes('.tsx') || response.includes('.ts')
      const hasRouter = response.includes('react-router') || response.includes('router')
      const hasStateManagement = response.includes('useState') || response.includes('useReducer') || response.includes('Context')
      
      // Extract component names and structure
      const components = existingFiles
        .filter(f => f.includes('components/') || f.includes('src/') && f.includes('.tsx'))
        .map(f => f.split('/').pop()?.replace('.tsx', '') || f)
      
      // Detect main application patterns
      const projectType = response.toLowerCase().includes('todo') ? 'Todo List App' : 
                         response.toLowerCase().includes('portfolio') ? 'Portfolio Website' :
                         response.toLowerCase().includes('dashboard') ? 'Dashboard' :
                         response.toLowerCase().includes('ecommerce') ? 'E-commerce Site' :
                         response.toLowerCase().includes('blog') ? 'Blog' :
                         'React Application'
      
      // Extract key functionality patterns
      const features = []
      if (response.includes('useState') || response.includes('state')) features.push('State Management')
      if (response.includes('useEffect')) features.push('Effects/API Calls')
      if (response.includes('onClick') || response.includes('event')) features.push('User Interactions')
      if (response.includes('form') || response.includes('input')) features.push('Forms')
      if (response.includes('map(') || response.includes('list')) features.push('Dynamic Lists')
      
      return {
        projectType,
        existingFiles,
        components,
        features,
        technologies: ['React 18.3+', 'TypeScript', hasTailwind ? 'Tailwind CSS' : 'CSS', 'Vite'].filter(Boolean),
        hasComponents: existingFiles.some(f => f.includes('components/')),
        hasRouter,
        hasStateManagement
      }
    }
    
    const context = extractProjectContext(lastAssistantResponse.content)
    
    // Create enhanced condensed context message
    const condensedContext: ConversationMessage = {
      role: 'assistant',
      content: `PROJECT STATE CONTEXT:
Type: ${context.projectType}
Stack: ${context.technologies.join(', ')}
Files: ${context.existingFiles.join(', ')}
Components: [${context.components.join(', ')}]
Features: ${context.features.length > 0 ? context.features.join(', ') : 'Basic React App'}
State Management: ${context.hasStateManagement ? 'Yes (useState/hooks)' : 'No'}

CURRENT ARCHITECTURE:
- ${context.hasComponents ? 'Component-based structure' : 'Simple single-file structure'}
- ${context.hasRouter ? 'Multi-page routing enabled' : 'Single-page application'}
- ${context.technologies.includes('Tailwind CSS') ? 'Tailwind CSS for styling' : 'Regular CSS styling'}

LAST USER REQUEST: "${conversationHistory[conversationHistory.length - 2]?.content || 'Initial project creation'}"

For follow-up modifications, maintain existing patterns and only modify necessary files.`,
      timestamp: Date.now()
    }
    
    // Return only the last user message and condensed context (saves significant tokens)
    const lastUserMessage = conversationHistory[conversationHistory.length - 2]
    return lastUserMessage ? [condensedContext] : []
  }

  const systemInstruction = isFirstRequest ? firstRequestSystemInstruction : followUpSystemInstruction

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      console.log(`Using model: ${MODEL_CONFIG.name}`)
      console.log(`Request type: ${isFirstRequest ? 'First Request' : 'Follow-up Request'}`)
      
      // Build messages array with context-aware conversation history
      const contextualHistory = isFirstRequest ? 
        conversationHistory.map((msg: ConversationMessage) => ({ role: msg.role, content: msg.content })) :
        createFollowUpContext(conversationHistory)
        
      if (!isFirstRequest) {
        console.log(`Context history length: ${conversationHistory.length}`)
        console.log(`Contextual history length: ${contextualHistory.length}`)
      }
        
      const messages = [
        { role: 'system' as const, content: systemInstruction },
        ...contextualHistory,
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
      
      // Track thinking state to filter out <think>...</think> blocks
      // Some models (e.g., Nemotron, DeepSeek) emit reasoning/thinking tokens
      // that should not be sent to the client
      let isInsideThinkBlock = false
      let thinkBuffer = ''

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || ''
        if (!delta) continue

        try {
          // Process the delta to filter out <think> blocks
          let remaining = delta
          let outputBuffer = ''

          while (remaining.length > 0) {
            if (isInsideThinkBlock) {
              // We're inside a <think> block, look for closing tag
              const closeIndex = remaining.indexOf('</think>')
              if (closeIndex !== -1) {
                // Found closing tag, skip everything up to and including </think>
                isInsideThinkBlock = false
                thinkBuffer = ''
                remaining = remaining.substring(closeIndex + 8) // 8 = '</think>'.length
              } else {
                // Still inside think block, discard all remaining content
                remaining = ''
              }
            } else {
              // We're outside a <think> block, look for opening tag
              const openIndex = remaining.indexOf('<think>')
              if (openIndex !== -1) {
                // Found opening tag, output everything before it
                outputBuffer += remaining.substring(0, openIndex)
                isInsideThinkBlock = true
                thinkBuffer = ''
                remaining = remaining.substring(openIndex + 7) // 7 = '<think>'.length
              } else {
                // Check for partial <think> tag at the end of chunk
                // e.g., delta ends with "<thi" which could be start of "<think>"
                const partialMatch = remaining.match(/<t(?:h(?:i(?:n(?:k)?)?)?)?$/)
                if (partialMatch) {
                  // Buffer the potential partial tag
                  outputBuffer += remaining.substring(0, partialMatch.index)
                  thinkBuffer = partialMatch[0]
                  remaining = ''
                } else {
                  // No think tags found, flush any buffered partial tag and output everything
                  if (thinkBuffer) {
                    outputBuffer += thinkBuffer
                    thinkBuffer = ''
                  }
                  outputBuffer += remaining
                  remaining = ''
                }
              }
            }
          }

          // Write filtered output to client
          if (outputBuffer) {
            await writer.write(encoder.encode(outputBuffer))
          }
        } catch {
          // Client disconnected, stop writing
          break
        }
      }

      // Flush any remaining buffered content (partial tag that never completed)
      if (thinkBuffer && !isInsideThinkBlock) {
        try {
          await writer.write(encoder.encode(thinkBuffer))
        } catch {
          // Client disconnected, ignore
        }
      }
      
    } catch (error: unknown) {
      const errorObj = error as { status?: number; statusCode?: number; message?: string }
      console.error(`Request failed:`, {
        status: errorObj?.status || errorObj?.statusCode,
        message: errorObj?.message
      })
      
      let errorMessage = 'Failed to generate response. '
      
      if (errorObj?.status === 429 || errorObj?.statusCode === 429) {
        errorMessage += 'Rate limit exceeded. Please wait a moment before trying again.'
      } else if (errorObj?.status && errorObj.status >= 500) {
        errorMessage += 'Server error occurred. Please try again later.'
      } else if (errorObj?.message?.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.'
      } else {
        errorMessage += 'Please try again.'
      }
      
      try {
        await writer.write(encoder.encode(`Error: ${errorMessage}\n`))
      } catch {
        // Ignore write errors when client disconnected
      }
    } finally {
      try {
        await writer.close()
      } catch {
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


