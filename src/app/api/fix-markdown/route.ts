import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Get project path
    const projectPath = process.platform === 'win32' 
      ? path.join(process.cwd(), 'ai-previews', projectId)
      : path.join('/srv', 'ai-previews', projectId)

    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const filesToFix = [
      'package.json',
      'next.config.js',
      'tsconfig.json',
      'tailwind.config.js',
      'tailwind.config.cjs',
      'postcss.config.js',
      'postcss.config.cjs'
    ]

    const fixedFiles = []

    for (const fileName of filesToFix) {
      const filePath = path.join(projectPath, fileName)
      
      try {
        const content = await fs.readFile(filePath, 'utf8')
        
        // Check if it has markdown markers or content
        if (content.includes('```') || content.includes('##') || content.includes('# ')) {
          let cleanContent = content
          
          // Remove markdown code block markers (comprehensive)
          cleanContent = cleanContent.replace(/^```\w*\s*/g, '').trim()
          cleanContent = cleanContent.replace(/\s*```\s*$/g, '').trim()
          cleanContent = cleanContent.replace(/^\s*```\s*$/gm, '').trim()
          
          // Remove markdown headers and content after them (only for config files)
          if (fileName.endsWith('.js') || fileName.endsWith('.json') || fileName.endsWith('.ts')) {
            // Remove everything from markdown headers onwards
            cleanContent = cleanContent.split(/^##\s+/m)[0].trim()
            cleanContent = cleanContent.split(/^#\s+/m)[0].trim()
            
            // Remove any stray markdown syntax
            cleanContent = cleanContent.replace(/^\s*##?\s+.*$/gm, '').trim()
            cleanContent = cleanContent.replace(/^\s*\*\s+.*$/gm, '').trim()
            cleanContent = cleanContent.replace(/^\s*-\s+.*$/gm, '').trim()
          }
          
          // Write the cleaned content back
          await fs.writeFile(filePath, cleanContent, 'utf8')
          fixedFiles.push(fileName)
        }
      } catch {
        // File doesn't exist or can't be read, skip
        continue
      }
    }

    // Also fix any files in subdirectories
    const subDirs = ['app', 'components', 'pages', 'src', 'styles', 'types']
    
    for (const subDir of subDirs) {
      const subDirPath = path.join(projectPath, subDir)
      
      try {
        const entries = await fs.readdir(subDirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.css'))) {
            const filePath = path.join(subDirPath, entry.name)
            
            try {
              const content = await fs.readFile(filePath, 'utf8')
              
              if (content.includes('```') || content.includes('##') || content.includes('# ')) {
                let cleanContent = content
                
                // Remove markdown code block markers
                cleanContent = cleanContent.replace(/^```\w*\s*/g, '').trim()
                cleanContent = cleanContent.replace(/\s*```\s*$/g, '').trim()
                cleanContent = cleanContent.replace(/^\s*```\s*$/gm, '').trim()
                
                // Remove markdown headers and content after them (only for config files)
                if (entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name.endsWith('.ts')) {
                  // Remove everything from markdown headers onwards
                  cleanContent = cleanContent.split(/^##\s+/m)[0].trim()
                  cleanContent = cleanContent.split(/^#\s+/m)[0].trim()
                  
                  // Remove any stray markdown syntax
                  cleanContent = cleanContent.replace(/^\s*##?\s+.*$/gm, '').trim()
                  cleanContent = cleanContent.replace(/^\s*\*\s+.*$/gm, '').trim()
                  cleanContent = cleanContent.replace(/^\s*-\s+.*$/gm, '').trim()
                }
                
                await fs.writeFile(filePath, cleanContent, 'utf8')
                fixedFiles.push(`${subDir}/${entry.name}`)
              }
            } catch {
              continue
            }
          }
        }
      } catch {
        // Directory doesn't exist, skip
        continue
      }
    }

    return NextResponse.json({ 
      success: true, 
      projectId,
      fixedFiles,
      message: `Fixed ${fixedFiles.length} files`
    })

  } catch (error) {
    console.error('Error fixing markdown:', error)
    return NextResponse.json({ 
      error: 'Failed to fix markdown',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}