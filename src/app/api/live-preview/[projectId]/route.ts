import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    // Check node preview status (with port detection)
    const nodeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/node-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', projectId })
    })

    if (nodeResponse.ok) {
      const nodeData = await nodeResponse.json()
      if (nodeData.running) {
        return NextResponse.json({
          status: 'running',
          port: nodeData.port,
          previewUrl: nodeData.previewUrl,
          message: 'Live preview available',
          source: nodeData.detected ? 'detected' : 'node-preview'
        })
      }
    }

    // Project not running - try to start with node preview
    const nodeStartResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/node-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', projectId })
    })

    if (nodeStartResponse.ok) {
      const nodeStartData = await nodeStartResponse.json()
      if (nodeStartData.success) {
        return NextResponse.json({
          status: 'starting',
          message: 'Node.js preview is starting...',
          port: nodeStartData.port,
          previewUrl: nodeStartData.previewUrl,
          source: 'node-preview'
        })
      }
    }

    return NextResponse.json({ error: 'Failed to start preview' }, { status: 500 })

  } catch (error) {
    console.error('Live preview error:', error)
    return NextResponse.json({ 
      error: 'Failed to get live preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}