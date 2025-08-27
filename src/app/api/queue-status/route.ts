import { NextResponse } from 'next/server'
import { getQueueInfo } from '@/libs/retry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const queueInfo = getQueueInfo()
    
    return NextResponse.json({
      queueLength: queueInfo.queueLength,
      isProcessing: queueInfo.isProcessing,
      estimatedWaitTime: queueInfo.estimatedWaitTime,
      estimatedWaitTimeFormatted: formatWaitTime(queueInfo.estimatedWaitTime),
      status: getQueueStatus(queueInfo)
    })
  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' }, 
      { status: 500 }
    )
  }
}

function formatWaitTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.ceil((seconds % 3600) / 60)
    return `${hours}h ${remainingMinutes}m`
  }
}

function getQueueStatus(queueInfo: any): string {
  if (queueInfo.queueLength === 0 && !queueInfo.isProcessing) {
    return 'ready'
  } else if (queueInfo.queueLength === 0 && queueInfo.isProcessing) {
    return 'processing'
  } else if (queueInfo.queueLength <= 5) {
    return 'normal'
  } else if (queueInfo.queueLength <= 20) {
    return 'busy'
  } else {
    return 'overloaded'
  }
}
