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
    // Remove preview.html file blocks first (most aggressive)
    .replace(/\/\/\/ file: preview\.html[\s\S]*?(?=\n\/\/\/ (?:endfile|file:)|$)/gi, '')
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
  
  // Split by file blocks
  const fileBlocks = code.split(/(?=\/\/\/ file: )/).filter(block => block.trim())
  
  // Filter out ONLY preview.html blocks, keep all other files
  const filteredBlocks = fileBlocks.filter(block => {
    return !block.includes('/// file: preview.html')
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

export const extractPreviewFromHTML = (response: string): string => {
  try {
    // First, try to extract from /// file: preview.html format with precise boundaries
    const previewFileRegex = /\/\/\/ file: preview\.html\s*\n([\s\S]*?)(?=\n\/\/\/ (?:endfile|file:)|$)/
    const previewMatch = response.match(previewFileRegex)
    
    if (previewMatch && previewMatch[1]) {
      let htmlContent = previewMatch[1].trim()
      
      // Remove any markdown code block markers
      htmlContent = htmlContent.replace(/^```html?\s*/gm, '').replace(/```\s*$/gm, '')
      
      // Look for the actual HTML document start
      const docTypeIndex = htmlContent.indexOf('<!DOCTYPE html>')
      if (docTypeIndex >= 0) {
        // Extract from DOCTYPE to end of HTML
        htmlContent = htmlContent.substring(docTypeIndex)
        
        // Find the end of the HTML document
        const htmlEndIndex = htmlContent.lastIndexOf('</html>')
        if (htmlEndIndex > 0) {
          htmlContent = htmlContent.substring(0, htmlEndIndex + 7)
        }
        
        // Validate this is actually HTML and not mixed with text
        if (htmlContent.includes('<!DOCTYPE html>') && 
            htmlContent.includes('<html') && 
            htmlContent.includes('<body') &&
            htmlContent.includes('</body>') &&
            htmlContent.includes('</html>')) {
          
          // Extract only the body content without HTML boilerplate
          const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          if (bodyMatch && bodyMatch[1]) {
            return bodyMatch[1].trim()
          }
          
          // Fallback: return full HTML if body extraction fails
          return htmlContent
        }
      }
    }
    
    // Fallback: Look for complete HTML document anywhere in response
    const htmlDocRegex = /<!DOCTYPE html>[\s\S]*?<\/html>/i
    const htmlMatches = response.match(htmlDocRegex)
    if (htmlMatches) {
      const htmlContent = htmlMatches[0]
      
      // Validate it's a complete HTML document
      if (htmlContent.includes('<body') && 
          htmlContent.includes('</body>') && 
          htmlContent.includes('<html') && 
          htmlContent.includes('</html>')) {
        
        // Extract only the body content without HTML boilerplate
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        if (bodyMatch && bodyMatch[1]) {
          return bodyMatch[1].trim()
        }
        
        // Fallback: return full HTML if body extraction fails
        return htmlContent
      }
    }
    
    // If no valid HTML found, return empty string (this prevents showing entire response)
    return ''
  } catch (error) {
    console.error('Error extracting preview:', error)
    return ''
  }
}

export const separateCodeAndText = (response: string): { code: string; description: string } => {
  try {
    // Normalize the response first
    const normalizedResponse = response.trim()
    if (!normalizedResponse) {
      return { code: '', description: '' }
    }
    
    // Quick extraction for streaming - get any file blocks immediately
    const quickCodeRegex = /\/\/\/ file: (?!preview\.html)[^\n]*[\s\S]*?(?=\/\/\/ file:|$)/g
    const quickCodeMatches = normalizedResponse.match(quickCodeRegex) || []
    
    // If we have any non-preview files, extract them immediately for streaming
    if (quickCodeMatches.length > 0) {
      const quickCode = quickCodeMatches.join('\n\n').trim()
      
      // More precise extraction - remove only preview.html block and actual file contents
      let quickDescription = normalizedResponse
        .replace(/\/\/\/ file: preview\.html[\s\S]*?(?=\n(?:[^\n]|$))/, '') // Remove preview.html block only
      
      // Remove actual file blocks but preserve descriptive text between them
      quickDescription = quickDescription.replace(/\/\/\/ file: (?!preview\.html)[^\n]+\n[\s\S]*?(?=\n\/\/\/ file:|$)/g, '')
      quickDescription = quickDescription.replace(/\/\/\/ endfile/g, '').trim()
      
      // Only use fallback if we truly have no descriptive content
      if (!quickDescription || quickDescription.length < 20) {
        quickDescription = 'Generated project files ready!'
      }
      
      if (quickCode && quickCode.length > 50) { // Only return if substantial
        return {
          code: quickCode,
          description: quickDescription || 'Generating your project...'
        }
      }
    }
    
    // Enhanced follow-up detection for better parsing
    const isLikelyFollowUp = normalizedResponse.includes('/// file:') && 
                            (!normalizedResponse.toLowerCase().includes('project overview') &&
                             !normalizedResponse.toLowerCase().includes('setup instructions') &&
                             !normalizedResponse.toLowerCase().includes('project structure')) ||
                            // Additional indicators of follow-up responses
                            (normalizedResponse.includes('/// file: preview.html') && 
                             normalizedResponse.split('/// file:').length <= 3 && // Preview + 1-2 files max
                             !normalizedResponse.includes('package.json'))
    
    // For follow-up responses, handle them differently
    if (isLikelyFollowUp) {
      // Get all file blocks with better boundary detection
      const allFileBlocks = normalizedResponse.match(/\/\/\/ file: [^\n]+[\s\S]*?(?=\n\/\/\/ (?:file:|endfile)|$)/g) || []
      const codeFileBlocks = allFileBlocks.filter(block => !block.includes('/// file: preview.html'))
      
      // Clean up code blocks by removing unwanted markdown markers  
      const cleanedCodeBlocks = codeFileBlocks.map((block: string) => {
        return block
          .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove trailing ``` markers with language specifiers
          .replace(/```\s*$/gm, '') // Remove trailing ``` markers without language specifiers
          .replace(/^```[a-zA-Z]*\s*\n/gm, '') // Remove starting ``` markers
          .replace(/```/g, '') // Remove any remaining ``` markers
          .trim()
      })
      
      // Extract any descriptive text (non-file content) for follow-ups
      let description = normalizedResponse
        .replace(/\/\/\/ file: [\s\S]*?(?=\n\/\/\/ (?:file:|endfile)|$)/g, '') // Remove all file blocks
        .replace(/\/\/\/ endfile/g, '')
        .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove markdown markers
        .replace(/```\s*$/gm, '')
        .replace(/^```[a-zA-Z]*\s*\n?/gm, '')
        .replace(/```/g, '')
        .replace(/<!DOCTYPE html>[\s\S]*?<\/html>/gi, '') // Remove any HTML content
        .replace(/<html[\s\S]*?<\/html>/gi, '') // Remove HTML documents
        .replace(/<body[\s\S]*?<\/body>/gi, '') // Remove body content
        .replace(/<head[\s\S]*?<\/head>/gi, '') // Remove head content
        .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim()
      
      // If no meaningful description, create one based on updated files
      if (!description || description.length < 10) {
        const updatedFiles: string[] = []
        codeFileBlocks.forEach(block => {
          const fileNameMatch = block.match(/\/\/\/ file: ([^\n]+)/)
          if (fileNameMatch) {
            updatedFiles.push(fileNameMatch[1])
          }
        })
        
        description = updatedFiles.length > 0 
          ? `Updated: ${updatedFiles.join(', ')}`
          : 'Files updated successfully'
      }
        
      // Apply specialized cleanup to follow-up responses too
      const finalFollowUpCode = stripPreviewFromCode(cleanedCodeBlocks.join('\n\n').trim())
      const finalFollowUpDescription = stripAllHTMLContent(description)
      
      return {
        code: finalFollowUpCode,
        description: finalFollowUpDescription || 'Files updated successfully'
      }
    }
    
    // Original logic for first-time requests
    // Since preview.html now comes first, we need to handle the structure differently
    // Look for the pattern: preview.html -> description -> code files
    
    let cleanedResponse = response
    let descriptionText = ''
    let projectStructureSection = ''
    
    // First, remove the preview.html block entirely (it shouldn't be in description or code)
    // Enhanced regex to catch preview.html blocks more reliably
    const previewBlockRegex = /\/\/\/ file: preview\.html[\s\S]*?(?=\n\/\/\/ (?:endfile|file:)|$)/g
    cleanedResponse = cleanedResponse.replace(previewBlockRegex, '')
    cleanedResponse = cleanedResponse.replace(/\/\/\/ endfile/g, '')
    
    // Additional cleanup: remove any remaining HTML content that might have leaked through
    cleanedResponse = cleanedResponse.replace(/<!DOCTYPE html>[\s\S]*?<\/html>/gi, '')
    cleanedResponse = cleanedResponse.replace(/<html[\s\S]*?<\/html>/gi, '')
    cleanedResponse = cleanedResponse.replace(/<body[\s\S]*?<\/body>/gi, '')
    cleanedResponse = cleanedResponse.replace(/<head[\s\S]*?<\/head>/gi, '')
    
    // Extract Project Structure section before processing code blocks
    const projectStructureRegex = /(?:^|\n)(?:\*\*)?(?:project structure|then project overview|project structure)(?:\*\*)?[:\s]*\n([\s\S]*?)(?=\n(?:\*\*)?(?:setup instructions|getting started|installation|usage|dependencies|tech stack|features|components|configuration|api|examples|scripts|summary|conclusion|overview about|\/\/\/ file:|$))/i
    const structureMatch = cleanedResponse.match(projectStructureRegex)
    
    if (structureMatch && structureMatch[1]) {
      projectStructureSection = `**Project Structure:**\n${structureMatch[1].trim()}`
      // Remove the structure section from cleanedResponse so it doesn't appear in description
      cleanedResponse = cleanedResponse.replace(structureMatch[0], '')
    }
    
    // Extract all remaining file blocks (these are the actual code files)
    // Only match blocks that are NOT preview.html and look like actual files
    const codeFileRegex = /\/\/\/ file: (?!preview\.html)[^\n]+\.(tsx?|jsx?|css|html|json|js|ts|py|go|rs|java|cpp|c)[\s\S]*?(?=\n\/\/\/ (?:file:|endfile)|$)/g
    let codeFileBlocks: RegExpMatchArray | string[] = cleanedResponse.match(codeFileRegex) || []
    
    // If no specific file extension matches, try broader pattern but with validation
    if (codeFileBlocks.length === 0) {
      const broadCodeRegex = /\/\/\/ file: (?!preview\.html)[^\n]+[\s\S]*?(?=\n\/\/\/ (?:file:|endfile)|$)/g
      const potentialBlocks = cleanedResponse.match(broadCodeRegex) || []
      
      // Filter to only include blocks that look like actual code files
      codeFileBlocks = potentialBlocks.filter((block: string) => {
        const fileNameMatch = block.match(/\/\/\/ file: ([^\n]+)/)
        if (!fileNameMatch) return false
        
        const fileName = fileNameMatch[1].trim()
        // Include if it has a file extension OR contains typical file patterns
        return fileName.includes('.') || 
               fileName.includes('/') && !fileName.toLowerCase().includes('overview') &&
               !fileName.toLowerCase().includes('description') &&
               !fileName.toLowerCase().includes('structure')
      })
    }
    
    // Remove code file blocks from the cleaned response to get description
    let descriptionOnly = cleanedResponse
    codeFileBlocks.forEach(block => {
      descriptionOnly = descriptionOnly.replace(block, '')
    })
    
    // Clean up the description text with comprehensive cleanup
    descriptionText = descriptionOnly
      .replace(/\/\/\/ endfile/g, '')
      .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove trailing ``` with language specifiers
      .replace(/```\s*$/gm, '') // Remove trailing ``` without language specifiers
      .replace(/^```[a-zA-Z]*\s*\n?/gm, '') // Remove starting ``` with language specifiers
      .replace(/^```\s*\n?/gm, '') // Remove starting ``` without language specifiers
      .replace(/```[a-zA-Z]*\s*/g, '') // Remove any remaining ``` with language in middle
      .replace(/```/g, '') // Remove any remaining standalone ```
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Normalize excessive line breaks
      .trim()
    
    // Clean up code blocks by removing unwanted markdown markers
    const cleanedCodeBlocks = codeFileBlocks.map((block: string) => {
      return block
        .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove trailing ``` markers with language specifiers
        .replace(/```\s*$/gm, '') // Remove trailing ``` markers without language specifiers
        .replace(/^```[a-zA-Z]*\s*\n/gm, '') // Remove starting ``` markers
        .trim()
    })
    
    // Join all code blocks (excluding preview.html)
    let code = cleanedCodeBlocks.join('\n\n').trim()
    
    // Prepend project structure section to code if it exists
    if (projectStructureSection) {
      code = projectStructureSection + (code ? '\n\n' + code : '')
    }
    
    // If we have no description text and no code, most likely this is just descriptive text
    // Don't try to extract code from purely descriptive responses
    if (!descriptionText && !code && response.length > 0) {
      // Only try markdown fallback if there are actual code blocks that look like code
      const markdownCodeBlockRegex = /```[\w]*\n[\s\S]*?```/g
      const markdownCodeBlocks = response.match(markdownCodeBlockRegex) || []
      
      // Validate that these are actual code blocks, not just formatted text
      const validCodeBlocks = markdownCodeBlocks.filter(block => {
        const content = block.replace(/```[\w]*\n?/g, '').replace(/```/g, '')
        // Check if it contains code-like patterns
        return content.includes('import ') || content.includes('function ') || 
               content.includes('const ') || content.includes('export ') ||
               content.includes('<') && content.includes('>') ||
               content.includes('{') && content.includes('}') && content.split('\n').length > 2
      })
      
      if (validCodeBlocks.length > 0) {
        let fallbackCleaned = response
        validCodeBlocks.forEach(block => {
          fallbackCleaned = fallbackCleaned.replace(block, '')
        })
        
        // Remove preview.html from fallback as well
        fallbackCleaned = fallbackCleaned.replace(previewBlockRegex, '')
        
        let fallbackCode = validCodeBlocks.join('\n\n')
          .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove trailing ``` with language
          .replace(/```\s*$/gm, '') // Remove trailing ```
          .replace(/^```[a-zA-Z]*\s*\n/gm, '') // Remove starting ``` with language
          .replace(/^```\s*\n/gm, '') // Remove starting ```
          .replace(/```/g, '') // Remove any remaining ```
          .trim()
        const fallbackDescription = fallbackCleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim()
        
        // Prepend project structure section to fallback code if it exists
        if (projectStructureSection) {
          fallbackCode = projectStructureSection + (fallbackCode ? '\n\n' + fallbackCode : '')
        }
        
        return { code: fallbackCode, description: fallbackDescription }
      }
    }
    
    // Only try intelligent split if we actually have code patterns AND file blocks
    if (!code && codeFileBlocks.length === 0 && response.includes('/// file:')) {
      // Look for common patterns that indicate start of actual code files
      const codeFilePattern = /\/\/\/ file: (?!preview\.html)/
      const match = response.match(codeFilePattern)
      
      if (match && match.index && match.index > 50) {
        const splitPoint = match.index
        let intelligentCode = response.slice(splitPoint).trim()
        
        // Prepend project structure section to intelligent split code if it exists
        if (projectStructureSection) {
          intelligentCode = projectStructureSection + (intelligentCode ? '\n\n' + intelligentCode : '')
        }
        
        return {
          code: intelligentCode,
          description: response.slice(0, splitPoint).trim()
        }
      }
    }
    
    // Return the separated content
    // If we have no description but the original response has content, use it
    if (!descriptionText && normalizedResponse.length > 0 && !code) {
      // Clean the response by removing only preview.html blocks
      descriptionText = normalizedResponse
        .replace(previewBlockRegex, '')
        .replace(/\/\/\/ endfile/g, '')
        .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove trailing ``` with language specifiers
        .replace(/```\s*$/gm, '') // Remove trailing ``` without language specifiers
        .replace(/^```[a-zA-Z]*\s*\n?/gm, '') // Remove starting ``` with language specifiers
        .replace(/^```\s*\n?/gm, '') // Remove starting ``` without language specifiers
        .replace(/```[a-zA-Z]*\s*/g, '') // Remove any remaining ``` with language in middle
        .replace(/```/g, '') // Remove any remaining standalone ```
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim()
    }
    
    // Final fallback - ensure we always return meaningful content but never the entire response
    if (!code && !descriptionText && normalizedResponse.length > 0) {
      // If nothing else worked, extract only descriptive text (not file content)
      descriptionText = normalizedResponse
        .replace(/\/\/\/ file: [\s\S]*?(?=\n\/\/\/ (?:file:|endfile)|$)/g, '') // Remove all file blocks
        .replace(/\/\/\/ endfile/g, '')
        .replace(/```[\s\S]*?```/g, '') // Remove markdown code blocks
        .replace(/```[a-zA-Z]*\s*$/gm, '') // Remove trailing ``` with language specifiers
        .replace(/```\s*$/gm, '') // Remove trailing ``` without language specifiers
        .replace(/^```[a-zA-Z]*\s*\n?/gm, '') // Remove starting ``` with language specifiers
        .replace(/^```\s*\n?/gm, '') // Remove starting ``` without language specifiers
        .replace(/```[a-zA-Z]*\s*/g, '') // Remove any remaining ``` with language in middle
        .replace(/```/g, '') // Remove any remaining standalone ```
        .replace(/<!DOCTYPE html>[\s\S]*?<\/html>/gi, '') // Remove any HTML content
        .replace(/<html[\s\S]*?<\/html>/gi, '') // Remove HTML documents
        .replace(/<body[\s\S]*?<\/body>/gi, '') // Remove body content
        .replace(/<head[\s\S]*?<\/head>/gi, '') // Remove head content
        .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim()
      
      // If the cleaned text is too long (likely contains unwanted content), truncate it
      if (descriptionText.length > 2000) {
        const sentences = descriptionText.split(/[.!?]\s+/)
        descriptionText = sentences.slice(0, 5).join('. ') + (sentences.length > 5 ? '.' : '')
      }
      
      // If still empty or very short, provide a default description
      if (!descriptionText || descriptionText.length < 10) {
        descriptionText = 'Project generated successfully!'
      }
    }
    
    // Final cleanup: use specialized cleaners for code vs description
    const finalCode = stripPreviewFromCode(code || '')
    const finalDescription = stripAllHTMLContent(descriptionText || '')
    
    return {
      code: finalCode || '',
      description: finalDescription || 'Content generated successfully!'
    }
  } catch (error) {
    console.error('Error separating code and text:', error)
    // Never return raw response - always clean it
    const cleanedResponse = stripAllHTMLContent(response)
    return {
      code: cleanedResponse || '',
      description: cleanedResponse || 'Error processing content'
    }
  }
}


