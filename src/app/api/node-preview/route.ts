import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

// Persistent port mapping file
const PORT_MAPPING_FILE = path.join(process.cwd(), '.port-mapping.json')

// Load and save port mappings from/to disk
async function loadPortMappings(): Promise<Record<string, number>> {
  try {
    const content = await fs.readFile(PORT_MAPPING_FILE, 'utf8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

async function savePortMappings(mappings: Record<string, number>): Promise<void> {
  try {
    await fs.writeFile(PORT_MAPPING_FILE, JSON.stringify(mappings, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to save port mappings:', error)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory store for running Node.js processes
const runningProcesses = new Map<string, {
  port: number
  process: any
  status: 'starting' | 'running' | 'failed'
  createdAt: number
}>()

// Port management - start from 3002 and increment
let nextAvailablePort = 3002

function getNextPort(): number {
  return nextAvailablePort++
}

export async function POST(req: NextRequest) {
  try {
    const { action, projectId } = await req.json()

    switch (action) {
      case 'start':
        return await startNodePreview(projectId)
      case 'stop':
        return await stopNodePreview(projectId)
      case 'status':
        return await getNodePreviewStatus(projectId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Node preview error:', error)
    return NextResponse.json({ 
      error: 'Node preview failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function startNodePreview(projectId: string) {
  try {
    // Check if already running
    if (runningProcesses.has(projectId)) {
      const process = runningProcesses.get(projectId)!
      return NextResponse.json({ 
        success: true, 
        projectId,
        port: process.port,
        status: process.status,
        previewUrl: `http://localhost:${process.port}`,
        message: 'Project already running'
      })
    }

    // Get project path
    const projectPath = process.platform === 'win32' 
      ? path.join(process.cwd(), 'ai-previews', projectId)
      : path.join('/srv', 'ai-previews', projectId)

    // Check if project exists and has package.json
    try {
      await fs.access(path.join(projectPath, 'package.json'))
    } catch {
      return NextResponse.json({ error: 'Project not found or missing package.json' }, { status: 404 })
    }

    // Assign port
    const port = getNextPort()
    
    console.log(`Starting Node.js preview for ${projectId} on port ${port}...`)

    // Install dependencies and start the development server
    const npmProcess = spawn('npm', ['install'], {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true
    })

    npmProcess.on('close', async (code) => {
      if (code === 0) {
        console.log(`Dependencies installed for ${projectId}, starting dev server...`)
        
        // Start the development server with specific port
        const devProcess = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
          cwd: projectPath,
          stdio: 'pipe',
          shell: true,
          env: {
            ...process.env,
            PORT: port.toString()
          }
        })

        // Mark as running
        runningProcesses.set(projectId, {
          port,
          process: devProcess,
          status: 'running',
          createdAt: Date.now()
        })

        // Save port mapping to persistent storage
        try {
          const portMappings = await loadPortMappings()
          portMappings[projectId] = port
          await savePortMappings(portMappings)
        } catch (error) {
          console.error('Failed to save port mapping:', error)
        }

        devProcess.stdout?.on('data', (data) => {
          const output = data.toString()
          console.log(`[${projectId}] ${output}`)
          
          // Check if Vite is ready and update port if needed
          const viteReadyMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/)
          if (viteReadyMatch) {
            const actualPort = parseInt(viteReadyMatch[1])
            const processInfo = runningProcesses.get(projectId)
            if (processInfo && actualPort !== processInfo.port) {
              console.log(`Port mismatch detected for ${projectId}. Expected: ${processInfo.port}, Actual: ${actualPort}`)
              // Update the stored port to match reality
              processInfo.port = actualPort
              
              // Update persistent mapping
              loadPortMappings().then(mappings => {
                mappings[projectId] = actualPort
                savePortMappings(mappings).catch(console.error)
              }).catch(console.error)
            }
          }
        })

        devProcess.stderr?.on('data', (data) => {
          console.error(`[${projectId}] ${data.toString()}`)
        })

        devProcess.on('close', (code) => {
          console.log(`Dev server for ${projectId} exited with code ${code}`)
          runningProcesses.delete(projectId)
        })

        devProcess.on('error', (error) => {
          console.error(`Dev server error for ${projectId}:`, error)
          runningProcesses.delete(projectId)
        })

      } else {
        console.error(`npm install failed for ${projectId} with code ${code}`)
        runningProcesses.delete(projectId)
      }
    })

    npmProcess.on('error', (error) => {
      console.error(`npm install error for ${projectId}:`, error)
      runningProcesses.delete(projectId)
    })

    // Mark as starting
    runningProcesses.set(projectId, {
      port,
      process: npmProcess,
      status: 'starting',
      createdAt: Date.now()
    })

    // Wait a bit for the process to start
    setTimeout(() => {
      const processInfo = runningProcesses.get(projectId)
      if (processInfo && processInfo.status === 'starting') {
        processInfo.status = 'running'
      }
    }, 5000)

    return NextResponse.json({ 
      success: true, 
      projectId,
      port,
      status: 'starting',
      previewUrl: `http://localhost:${port}`,
      message: `Project starting on port ${port} (installing dependencies...)`
    })

  } catch (error) {
    runningProcesses.delete(projectId)
    return NextResponse.json({ 
      error: 'Failed to start Node.js preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function stopNodePreview(projectId: string) {
  try {
    const processInfo = runningProcesses.get(projectId)
    if (!processInfo) {
      return NextResponse.json({ error: 'Project not running' }, { status: 404 })
    }

    // Kill the process
    if (processInfo.process && !processInfo.process.killed) {
      processInfo.process.kill('SIGTERM')
      
      // Force kill after 5 seconds if it doesn't stop
      setTimeout(() => {
        if (processInfo.process && !processInfo.process.killed) {
          processInfo.process.kill('SIGKILL')
        }
      }, 5000)
    }
    
    // Remove from tracking
    runningProcesses.delete(projectId)

    // Remove port mapping
    const portMappings = await loadPortMappings()
    delete portMappings[projectId]
    await savePortMappings(portMappings)

    return NextResponse.json({ 
      success: true, 
      message: 'Node.js preview stopped successfully' 
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to stop Node.js preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getNodePreviewStatus(projectId: string) {
  const processInfo = runningProcesses.get(projectId)
  
  if (!processInfo) {
    // Check persistent port mappings
    const portMappings = await loadPortMappings()
    const mappedPort = portMappings[projectId]
    
    if (mappedPort) {
      // Verify the port is still active
      try {
        const response = await fetch(`http://localhost:${mappedPort}`, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(2000)
        })
        if (response.ok) {
          console.log(`Found project ${projectId} running on mapped port ${mappedPort}`)
          return NextResponse.json({
            projectId,
            port: mappedPort,
            status: 'running',
            running: true,
            previewUrl: `http://localhost:${mappedPort}`,
            source: 'persistent-mapping'
          })
        } else {
          // Port mapping is stale, remove it
          delete portMappings[projectId]
          await savePortMappings(portMappings)
        }
      } catch {
        // Port not responding, remove stale mapping
        delete portMappings[projectId]
        await savePortMappings(portMappings)
      }
    }

    // Try to find the project by scanning ports and checking project directory
    const projectPath = process.platform === 'win32' 
      ? path.join(process.cwd(), 'ai-previews', projectId)
      : path.join('/srv', 'ai-previews', projectId)
    
    // Check if project exists first
    try {
      await fs.access(projectPath)
    } catch {
      return NextResponse.json({ 
        projectId,
        status: 'stopped',
        running: false,
        error: 'Project directory not found'
      })
    }

    // Scan for any running project on common ports
    const testPorts = [3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010]
    
    for (const port of testPorts) {
      try {
        const response = await fetch(`http://localhost:${port}`, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(1000)
        })
        if (response.ok) {
          // Found a running server, create a mapping for this project
          const updatedMappings = await loadPortMappings()
          updatedMappings[projectId] = port
          await savePortMappings(updatedMappings)
          
          console.log(`Mapped project ${projectId} to port ${port}`)
          return NextResponse.json({
            projectId,
            port,
            status: 'running',
            running: true,
            previewUrl: `http://localhost:${port}`,
            source: 'detected-and-mapped'
          })
        }
      } catch {
        // Port not responding, continue checking
      }
    }
    
    return NextResponse.json({ 
      projectId,
      status: 'stopped',
      running: false
    })
  }

  return NextResponse.json({ 
    projectId,
    port: processInfo.port,
    status: processInfo.status,
    running: processInfo.status === 'running',
    previewUrl: processInfo.status === 'running' ? `http://localhost:${processInfo.port}` : null,
    createdAt: processInfo.createdAt,
    source: 'tracked-process'
  })
}