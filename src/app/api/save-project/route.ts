import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SaveProjectRequest {
  projectId: string
  files: Array<{
    path: string
    content: string
  }>
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, files }: SaveProjectRequest = await req.json()

    if (!projectId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Create base directory path (Windows compatible)
    const baseDir = process.platform === 'win32' 
      ? path.join(process.cwd(), 'ai-previews', projectId)
      : path.join('/srv', 'ai-previews', projectId)
    
    // Ensure the base directory exists
    await fs.mkdir(baseDir, { recursive: true })

    // Save each file
    for (const file of files) {
      const filePath = path.join(baseDir, file.path)
      const fileDir = path.dirname(filePath)
      
      // Ensure the directory exists
      await fs.mkdir(fileDir, { recursive: true })
      
      // Write the file
      await fs.writeFile(filePath, file.content, 'utf8')
    }

    // Docker files removed - using Node.js preview only

    // Create a README for running the project
    const readmeContent = `# Generated Project: ${projectId}

## Quick Start

### Run with Node.js
\`\`\`bash
npm install
npm run dev
\`\`\`

The application will be available at http://localhost:3000

## Project Structure
${files.map(f => `- ${f.path}`).join('\n')}

## Generated Files
- Total files: ${files.length}
- Generated: ${new Date().toISOString()}
`

    await fs.writeFile(path.join(baseDir, 'README.md'), readmeContent, 'utf8')

    // Fix any markdown code block markers in the saved files
    try {
      const fixResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fix-markdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      
      if (fixResponse.ok) {
        const fixResult = await fixResponse.json()
        console.log(`Fixed markdown in ${fixResult.fixedFiles?.length || 0} files`)
      }
    } catch (fixError) {
      console.warn('Failed to fix markdown markers:', fixError)
    }

    // Validate and fix project structure, dependencies, and code issues
    try {
      const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/validate-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      
      if (validateResponse.ok) {
        const validateResult = await validateResponse.json()
        const validation = validateResult.validation
        console.log(`Project validation completed: ${validation.fixes.length} fixes applied`)
        if (validation.errors.length > 0) {
          console.warn(`Project has ${validation.errors.length} remaining errors`)
        }
      }
    } catch (validateError) {
      console.warn('Failed to validate project:', validateError)
    }

    // Auto-start the Node.js preview
    try {
      let previewInfo = null
      
      try {
        const nodeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/node-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', projectId })
        })

        if (nodeResponse.ok) {
          previewInfo = await nodeResponse.json()
          if (previewInfo?.success) {
            console.log(`Node.js preview started for ${projectId}`)
          }
        }
      } catch (nodeError) {
        console.warn('Node.js preview failed:', nodeError)
      }

      return NextResponse.json({ 
        success: true, 
        projectId,
        savedFiles: files.length + 1, // +1 for README.md
        projectPath: baseDir,
        livePreview: previewInfo?.success ? {
          port: previewInfo.port,
          previewUrl: previewInfo.previewUrl,
          status: previewInfo.status
        } : null,
        instructions: `Project saved to ${baseDir}. ${previewInfo?.success ? `Live preview: ${previewInfo.previewUrl}` : 'Run with: npm install && npm run dev'}`
      })

    } catch (previewError) {
      console.warn('Failed to auto-start preview:', previewError)
      
      return NextResponse.json({ 
        success: true, 
        projectId,
        savedFiles: files.length + 1,
        projectPath: baseDir,
        livePreview: null,
        instructions: `Project saved to ${baseDir}. Run with: cd "${baseDir}" && npm install && npm run dev`
      })
    }

  } catch (error) {
    console.error('Error saving project files:', error)
    return NextResponse.json({ 
      error: 'Failed to save project files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}