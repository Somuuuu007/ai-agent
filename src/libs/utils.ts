import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { GeneratedContent, ExtractedFile } from "@/types"
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
    // Extract all file blocks (/// file: blocks)
    const fileBlockRegex = /\/\/\/ file: [\s\S]*?(?=\/\/\/ (?:file:|endfile)|$)/g
    
    let cleanedResponse = response
    let allCode = ''
    
    // Find all file blocks
    const fileBlocks = response.match(fileBlockRegex) || []
    
    // Separate code blocks (excluding preview.html) from description text
    const codeBlocks: string[] = []
    
    fileBlocks.forEach(block => {
      // Remove all file blocks from description
      cleanedResponse = cleanedResponse.replace(block, '')
      
      // Add non-preview file blocks to code
      if (!block.includes('/// file: preview.html')) {
        codeBlocks.push(block)
      }
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
    
    // If no code blocks found, return the full response as code (fallback)
    return {
      code: code || response,
      description: description || response
    }
  } catch (error) {
    console.error('Error separating code and text:', error)
    return {
      code: response,
      description: response
    }
  }
}

export const extractFilesFromResponse = (response: string): ExtractedFile[] => {
  try {
    const files: ExtractedFile[] = []
    
    // Split response by /// file: markers to handle them individually
    const fileSections = response.split(/\/\/\/ file: /)
    
    // Skip the first section (everything before the first /// file:)
    for (let i = 1; i < fileSections.length; i++) {
      const section = fileSections[i]
      
      // Find the end of the filename (first newline)
      const firstNewlineIndex = section.indexOf('\n')
      if (firstNewlineIndex === -1) continue
      
      const filePath = section.substring(0, firstNewlineIndex).trim()
      let content = section.substring(firstNewlineIndex + 1)
      
      // Skip preview.html files as they're handled separately
      if (filePath === 'preview.html') {
        continue
      }
      
      // Clean up content by removing /// endfile if present
      content = content.replace(/\/\/\/ endfile[\s\S]*$/, '').trim()
      
      // Remove markdown code block markers (more comprehensive)
      // Remove opening markers: ```json, ```tsx, ```js, etc.
      content = content.replace(/^```\w*\s*/g, '').trim()
      
      // Remove closing markers: ``` at end
      content = content.replace(/\s*```\s*$/g, '').trim()
      
      // Remove any remaining standalone ``` lines
      content = content.replace(/^\s*```\s*$/gm, '').trim()
      
      if (filePath && content) {
        files.push({
          path: filePath,
          content: content
        })
      }
    }
    
    return files
  } catch (error) {
    console.error('Error extracting files from response:', error)
    return []
  }
}

export const generateProjectId = (): string => {
  return `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export interface SaveProjectResponse {
  success: boolean
  projectId: string
  savedFiles: number
  projectPath: string
  livePreview?: {
    port: number
    previewUrl: string
    status: string
  } | null
  instructions: string
}

export const saveProjectFiles = async (projectId: string, files: ExtractedFile[]): Promise<SaveProjectResponse | null> => {
  try {
    const response = await fetch('/api/save-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        files
      })
    })
    
    if (response.ok) {
      return await response.json()
    }
    
    return null
  } catch (error) {
    console.error('Error saving project files:', error)
    return null
  }
}

export const getLivePreview = async (projectId: string): Promise<{ previewUrl?: string, status: string } | null> => {
  try {
    const response = await fetch(`/api/live-preview/${projectId}`)
    
    if (response.ok) {
      return await response.json()
    }
    
    return null
  } catch (error) {
    console.error('Error getting live preview:', error)
    return null
  }
}