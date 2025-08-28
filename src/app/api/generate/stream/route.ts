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
2. Create a new Vite project using "npm create vite@latest"
3. Copy all the generated files into their respective locations  
4. Open terminal in project folder
5. Run "npm install" to install dependencies
6. Run "npm run dev" to start development server
7. Open http://localhost:5173 in your browser

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

**CRITICAL: Never add markdown code blocks around file contents. Use ONLY the /// file: format.**

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
      const hasTypeScript = response.includes('.tsx') || response.includes('.ts')
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
      
      // Rate limiting: Only allow first request, block follow-ups
      if (!isFirstRequest) {
        console.log('Follow-up request blocked due to rate limiting')
        const rateLimitMessage = `## Rate Limit Exceeded

You have reached the request limit for this session. To make a new request wait for some time :

*Refresh the page to start a new session*

This limit helps us manage API costs while providing the best experience. Thank you for understanding!

*Note: Follow-up functionality will be available in future updates.*`

        await writer.write(encoder.encode(rateLimitMessage))
        return
      }
      
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


