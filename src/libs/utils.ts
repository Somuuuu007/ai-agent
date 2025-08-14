import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { GeneratedContent } from "@/types"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const mockGenerateContent = async (input: string): Promise<GeneratedContent> => {
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

export const extractPreviewFromHTML = (response: string): string => {
  try {
    // First, try to extract from /// file: preview.html format
    const previewFileRegex = /\/\/\/ file: preview\.html\s*([\s\S]*?)(?=\/\/\/ endfile|$)/
    const previewMatch = response.match(previewFileRegex)
    
    if (previewMatch && previewMatch[1]) {
      const htmlContent = previewMatch[1].trim()
      // Return the complete HTML for iframe rendering
      return htmlContent
    }
    
    // Fallback: try to extract from regular HTML content (legacy support)
    const bodyStart = response.indexOf('<body')
    if (bodyStart === -1) return ''
    const openTagEnd = response.indexOf('>', bodyStart)
    if (openTagEnd === -1) return ''
    const bodyEnd = response.indexOf('</body>')
    if (bodyEnd === -1) return response.slice(openTagEnd + 1)
    const inner = response.slice(openTagEnd + 1, bodyEnd)
    return inner
  } catch (error) {
    console.error('Error extracting preview:', error)
    return ''
  }
}

export const separateCodeAndText = (response: string): { code: string; description: string } => {
  try {
    // Extract all code blocks (both ``` and /// file: blocks)
    const codeBlockRegex = /```[\s\S]*?```/g
    const fileBlockRegex = /\/\/\/ file: [\s\S]*?(?=\/\/\/ (?:file:|endfile)|$)/g
    
    const codeBlocks: string[] = []
    let cleanedResponse = response
    
    // Find all code blocks with ```
    const markdownCodeBlocks = response.match(codeBlockRegex) || []
    codeBlocks.push(...markdownCodeBlocks)
    
    // Find all file blocks with /// file: (excluding preview.html)
    const fileBlocks = response.match(fileBlockRegex) || []
    const filteredFileBlocks = fileBlocks.filter(block => !block.includes('/// file: preview.html'))
    codeBlocks.push(...filteredFileBlocks)
    
    // Remove code blocks from response to get description text
    markdownCodeBlocks.forEach(block => {
      cleanedResponse = cleanedResponse.replace(block, '')
    })
    
    // Remove all file blocks (including preview.html) from description
    fileBlocks.forEach(block => {
      cleanedResponse = cleanedResponse.replace(block, '')
    })
    
    // Clean up the description text
    const description = cleanedResponse
      .replace(/\/\/\/ endfile/g, '')
      .replace(/^\s*[\r\n]/gm, '') // Remove empty lines
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold formatting
      .replace(/- /g, '• ') // Replace dashes with bullets
      .replace(/(?:\r\n|\r|\n)/g, '\n') // Normalize line endings
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
      .trim()
    
    // Join all code blocks
    const code = codeBlocks.join('\n\n').trim()
    
    return {
      code: code || response, // Fallback to original if no code blocks found
      description: description || ''
    }
  } catch (error) {
    console.error('Error separating code and text:', error)
    return {
      code: response,
      description: ''
    }
  }
}