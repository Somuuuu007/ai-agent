import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { GeneratedContent} from "@/types"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const mockGenerateContent = async (): Promise<GeneratedContent> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Mock response based on input
  return {
    preview: `
      <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">My Todo List</h2>
        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <input type="checkbox" class="h-5 w-5 text-blue-500">
            <span class="text-gray-700">Complete the project documentation</span>
          </div>
          <div class="flex items-center space-x-3">
            <input type="checkbox" class="h-5 w-5 text-blue-500" checked>
            <span class="text-gray-700 line-through">Set up development environment</span>
          </div>
          <div class="flex items-center space-x-3">
            <input type="checkbox" class="h-5 w-5 text-blue-500">
            <span class="text-gray-700">Review code with team</span>
          </div>
        </div>
        <button class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Add New Task
        </button>
      </div>
    `,
    description: 'Simple todo list component with checkboxes and add functionality.',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo List</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 py-8">
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">My Todo List</h2>
        <div id="todoList" class="space-y-3">
            <div class="flex items-center space-x-3">
                <input type="checkbox" class="h-5 w-5 text-blue-500">
                <span class="text-gray-700">Complete the project documentation</span>
            </div>
            <div class="flex items-center space-x-3">
                <input type="checkbox" class="h-5 w-5 text-blue-500" checked>
                <span class="text-gray-700 line-through">Set up development environment</span>
            </div>
            <div class="flex items-center space-x-3">
                <input type="checkbox" class="h-5 w-5 text-blue-500">
                <span class="text-gray-700">Review code with team</span>
            </div>
        </div>
        <button onclick="addTask()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Add New Task
        </button>
    </div>

    <script>
        function addTask() {
            const task = prompt("Enter a new task:");
            if (task) {
                const todoList = document.getElementById('todoList');
                const taskDiv = document.createElement('div');
                taskDiv.className = 'flex items-center space-x-3';
                taskDiv.innerHTML = \`
                    <input type="checkbox" class="h-5 w-5 text-blue-500">
                    <span class="text-gray-700">\${task}</span>
                \`;
                todoList.appendChild(taskDiv);
            }
        }
    </script>
</body>
</html>`
  }
}

// Utility function to completely remove any HTML-like content from text
export const stripAllHTMLContent = (text: string): string => {
  if (!text) return ''
  
  return text
    // Remove thinking blocks from models like Nemotron/DeepSeek
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    // Remove preview.html file blocks first (most aggressive) - flexible spacing
    .replace(/\/\/\/\s*file:\s*preview\.html[\s\S]*?(?=\n\/\/\/\s*(?:endfile|file:)|$)/gi, '')
    // Remove markdown code blocks with html language specifier
    .replace(/```html[\s\S]*?```/gi, '')
    .replace(/```HTML[\s\S]*?```/gi, '')
    // Remove any other markdown code blocks
    .replace(/```[\w]*[\s\S]*?```/g, '')
    // Remove standalone ``` markers
    .replace(/```html?\s*$/gmi, '')
    .replace(/```\s*$/gm, '')
    .replace(/^```html?\s*$/gmi, '')
    .replace(/^```\s*$/gm, '')
    // Remove any complete HTML documents
    .replace(/<!DOCTYPE html>[\s\S]*?<\/html>/gi, '')
    .replace(/<html[\s\S]*?<\/html>/gi, '')
    // Remove HTML document parts
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<body[\s\S]*?<\/body>/gi, '')
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove HTML entities
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    // Remove file markers
    .replace(/\/\/\/ endfile/g, '')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

// Special utility function for cleaning code sections - preserves legitimate code files but removes preview.html
export const stripPreviewFromCode = (code: string): string => {
  if (!code) return ''
  
  // Split by file blocks - flexible spacing
  const fileBlocks = code.split(/(?=\/\/\/\s*file:\s*)/).filter(block => block.trim())

  // Filter out ONLY preview.html blocks, keep all other files
  const filteredBlocks = fileBlocks.filter(block => {
    return !/\/\/\/\s*file:\s*preview\.html/.test(block)
  })
  
  // Join back and clean up
  let result = filteredBlocks.join('\n\n').trim()
  
  // Remove any stray HTML documents that might have escaped
  result = result
    .replace(/<!DOCTYPE html>[\s\S]*?<\/html>/gi, '')
    .replace(/<html[\s\S]*?<\/html>/gi, '')
    // Remove markdown code blocks that contain HTML
    .replace(/```html[\s\S]*?```/gi, '')
    .replace(/```HTML[\s\S]*?```/gi, '')
    // Remove standalone ``` html markers
    .replace(/```html?\s*$/gmi, '')
    .replace(/^```html?\s*$/gmi, '')
  
  return result
}

// Strip <think>...</think> blocks that some models (Nemotron, DeepSeek) emit
const stripThinkingBlocks = (text: string): string => {
  if (!text) return ''
  // Remove complete <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  // Remove unclosed <think> blocks (still streaming)
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '')
  return cleaned.trim()
}

export const extractPreviewFromHTML = (response: string): string => {
  try {
    // Strip thinking blocks before parsing
    const cleanedResponse = stripThinkingBlocks(response)
    const response_clean = cleanedResponse

    // Strategy 1: Extract from /// file: preview.html block
    // Use a lookahead that handles both mid-stream (next /// file:) and end-of-response
    const previewFileRegex = /\/\/\/\s*file:\s*preview\.html\s*\n([\s\S]*?)(?=\n\/\/\/\s*(?:endfile|file:)|$)/i
    const previewMatch = response_clean.match(previewFileRegex)

    if (previewMatch && previewMatch[1]) {
      let htmlContent = previewMatch[1].trim()

      // Remove any markdown code block markers
      htmlContent = htmlContent
        .replace(/^```html?\s*/gim, '')
        .replace(/^```\s*/gim, '')
        .replace(/```\s*$/gim, '')
        .trim()

      // Find DOCTYPE and extract full HTML doc
      const docTypeIndex = htmlContent.indexOf('<!DOCTYPE html>')
      const htmlTagIndex = htmlContent.indexOf('<html')
      const startIndex = docTypeIndex >= 0 ? docTypeIndex : htmlTagIndex

      if (startIndex >= 0) {
        htmlContent = htmlContent.substring(startIndex)

        // If we have a complete </html>, trim to it
        const htmlEndIndex = htmlContent.lastIndexOf('</html>')
        if (htmlEndIndex > 0) {
          htmlContent = htmlContent.substring(0, htmlEndIndex + 7)
        }

        // Return the full HTML doc (iframe will handle rendering)
        if (htmlContent.includes('<html') && htmlContent.includes('<body')) {
          return htmlContent
        }
      }

      // If no DOCTYPE/html tag yet but we have some content, it might still be streaming
      // Return raw content if it has HTML-like content
      if (htmlContent.length > 50 && (htmlContent.includes('<') || htmlContent.includes('{'))) {
        return htmlContent
      }
    }

    // Strategy 2: Find any complete HTML document anywhere in the response
    const htmlDocRegex = /<!DOCTYPE html>[\s\S]*?<\/html>/i
    const htmlMatches = response_clean.match(htmlDocRegex)
    if (htmlMatches) {
      return htmlMatches[0]
    }

    // Strategy 3: Find opening <html> tag even without DOCTYPE
    const htmlTagRegex = /<html[\s\S]*?<\/html>/i
    const htmlTagMatch = response_clean.match(htmlTagRegex)
    if (htmlTagMatch) {
      return htmlTagMatch[0]
    }

    return ''
  } catch (error) {
    console.error('Error extracting preview:', error)
    return ''
  }
}

export const separateCodeAndText = (response: string): { code: string; description: string } => {
  try {
    // Strip thinking blocks first
    const text = stripThinkingBlocks(response).trim()
    if (!text) return { code: '', description: '' }

    // FILE BLOCK REGEX - matches any "/// file: filename" block
    // Boundary: next /// file: OR end of string
    const FILE_BLOCK_RE = /\/\/\/\s*file:\s*([^\n]+)\n([\s\S]*?)(?=\n\/\/\/\s*file:|\s*$)/g

    // --- Step 1: Split response into all file blocks ---
    const allBlocks: { filename: string; content: string; raw: string }[] = []
    let match
    FILE_BLOCK_RE.lastIndex = 0
    while ((match = FILE_BLOCK_RE.exec(text)) !== null) {
      const filename = match[1].trim()
      const content = match[2]
        .replace(/```[a-zA-Z]*\s*\n?/g, '') // strip markdown fences
        .replace(/```\s*$/gm, '')
        .trim()
      allBlocks.push({ filename, content, raw: match[0] })
    }

    // --- Step 2: Separate preview.html from code files ---
    const codeBlocks = allBlocks.filter(b => b.filename !== 'preview.html')

    // --- Step 3: Build clean code string ---
    const code = codeBlocks
      .map(b => `/// file: ${b.filename}\n${b.content}`)
      .join('\n\n')
      .trim()

    // --- Step 4: Build description ---
    // The AI response structure is:
    //   /// file: preview.html ...
    //   === PROJECT OVERVIEW === ...
    //   === SETUP INSTRUCTIONS === ...
    //   /// file: package.json ...
    //   /// file: src/App.tsx ...
    //
    // Extract the === PROJECT OVERVIEW === and === SETUP INSTRUCTIONS === sections

    let description = ''

    // Try to extract using the exact markers we defined in the system prompt
    const overviewMatch = text.match(/===\s*PROJECT OVERVIEW\s*===([\s\S]*?)(?====\s*SETUP INSTRUCTIONS\s*===|\/\/\/\s*file:|$)/i)
    const setupMatch = text.match(/===\s*SETUP INSTRUCTIONS\s*===([\s\S]*?)(?=={3,}|\/\/\/\s*file:|STEP\s+3|$)/i)

    if (overviewMatch || setupMatch) {
      const overviewText = overviewMatch ? overviewMatch[1].trim() : ''
      // Strip any trailing separator lines or STEP markers from setup text
      const rawSetup = setupMatch ? setupMatch[1] : ''
      const setupText = rawSetup
        .replace(/={3,}[\s\S]*$/m, '')   // remove ===...=== separator and everything after
        .replace(/STEP\s+\d+[\s\S]*$/im, '') // remove STEP N lines and everything after
        .trim()
      description = [
        overviewText ? `Project Overview\n\n${overviewText}` : '',
        setupText ? `Setup Instructions\n\n${setupText}` : ''
      ].filter(Boolean).join('\n\n')
    }

    // Fallback: grab any text between preview.html block and first code file
    if (!description) {
      const previewEnd = text.search(/\/\/\/\s*file:\s*(?!preview\.html)/)
      const previewStart = text.search(/\/\/\/\s*file:\s*preview\.html/)
      if (previewStart >= 0 && previewEnd > previewStart) {
        // text between end of preview block and first code file
        const previewBlock = text.match(/\/\/\/\s*file:\s*preview\.html[\s\S]*?(?=\n\/\/\/\s*file:(?!\s*preview)|\s*$)/)
        if (previewBlock) {
          const afterPreview = text.slice(previewStart + previewBlock[0].length, previewEnd).trim()
          if (afterPreview.length > 20) description = afterPreview
        }
      }
    }

    // Last resort
    if (!description) {
      description = 'Project generated successfully!'
    }

    return {
      code,
      description: stripAllHTMLContent(description)
    }

  } catch (error) {
    console.error('Error separating code and text:', error)
    return { code: '', description: 'Error processing content' }
  }
}


