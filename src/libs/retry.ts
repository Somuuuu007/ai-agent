// Single-model rate limiting and queue management system
interface ErrorWithStatus {
  status?: number
  statusCode?: number  
  message?: string
  headers?: { [key: string]: string }
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: unknown) => boolean
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

// Request queue management for single model
class RequestQueue {
  private queue: Array<{
    id: string
    resolve: (value: unknown) => void
    reject: (error: unknown) => void
    request: () => Promise<unknown>
    timestamp: number
  }> = []
  private processing = false
  private lastRequestTime = 0
  private consecutiveFailures = 0
  private backoffUntil = 0

  // Rate limiting configuration for qwen3-coder:free
  private readonly MIN_REQUEST_INTERVAL = 3000 // 3 seconds between requests
  private readonly MAX_QUEUE_SIZE = 50
  private readonly MAX_WAIT_TIME = 5 * 60 * 1000 // 5 minutes max wait

  async addRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      
      // Check if queue is full
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        reject(new Error('Request queue is full. Please try again later.'))
        return
      }

      // Add to queue
      this.queue.push({
        id: requestId,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: unknown) => void,
        request: request as () => Promise<unknown>,
        timestamp: Date.now()
      })

      // Start processing if not already running
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const currentRequest = this.queue[0]
      
      // Check if request has been waiting too long
      if (Date.now() - currentRequest.timestamp > this.MAX_WAIT_TIME) {
        this.queue.shift()
        currentRequest.reject(new Error('Request timeout. The queue was too busy.'))
        continue
      }

      // Check if we need to wait due to backoff
      const now = Date.now()
      if (now < this.backoffUntil) {
        await sleep(this.backoffUntil - now)
      }

      // Ensure minimum interval between requests
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await sleep(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      }

      try {
        // Execute the request
        this.lastRequestTime = Date.now()
        const result = await this.executeWithRetry(currentRequest.request)
        
        // Success - reset failure count and resolve
        this.consecutiveFailures = 0
        this.queue.shift()
        currentRequest.resolve(result)
        
      } catch (error: unknown) {
        this.queue.shift()
        const errorObj = error as ErrorWithStatus
        
        if (errorObj?.status === 429 || errorObj?.statusCode === 429) {
          this.consecutiveFailures++
          
          // Calculate exponential backoff
          const backoffMs = Math.min(
            1000 * Math.pow(2, this.consecutiveFailures),
            30000 // Max 30 seconds
          )
          
          // Use retry-after header if available
          const retryAfter = errorObj?.headers?.['retry-after']
          const finalBackoff = retryAfter ? parseInt(retryAfter) * 1000 : backoffMs
          
          this.backoffUntil = Date.now() + finalBackoff
          
          console.log(`Rate limited. Backing off for ${finalBackoff}ms. Queue position for failed request: will retry`)
          
          // Re-add request to front of queue for retry
          this.queue.unshift(currentRequest)
        } else {
          // Non-rate-limit error, reject the request
          currentRequest.reject(error)
        }
      }

      // Small delay between processing requests
      await sleep(100)
    }

    this.processing = false
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const options: RetryOptions = {
      maxRetries: 2, // Reduced retries since queue handles the logic
      baseDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 2,
      retryCondition: (error: unknown) => {
        const errorObj = error as ErrorWithStatus
        return !!(errorObj?.status === 429 || 
          errorObj?.statusCode === 429 ||
          (errorObj?.status && errorObj.status >= 500 && errorObj.status < 600))
      }
    }

    return withRetry(fn, options)
  }

  getQueueInfo() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      consecutiveFailures: this.consecutiveFailures,
      backoffUntil: this.backoffUntil,
      estimatedWaitTime: this.queue.length * this.MIN_REQUEST_INTERVAL
    }
  }
}

// Global queue instance
const globalRequestQueue = new RequestQueue()

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    backoffFactor,
    retryCondition = (error: unknown) => {
      const errorObj = error as ErrorWithStatus
      return !!(errorObj?.status === 429 || 
        errorObj?.statusCode === 429 ||
        (errorObj?.status && errorObj.status >= 500 && errorObj.status < 600))
    }
  } = options

  let lastError: unknown
  let delay = baseDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error
      
      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error
      }

      // Extract retry delay from rate limit headers if available
      const errorObj = error as ErrorWithStatus
      const retryAfterHeader = errorObj?.headers?.['retry-after']
      const retryAfterMs = retryAfterHeader ? 
        parseInt(retryAfterHeader) * 1000 : 
        Math.min(delay, maxDelay)

      await sleep(retryAfterMs)
      delay = Math.min(delay * backoffFactor, maxDelay)
    }
  }

  throw lastError
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Queue request function for external use
export async function queueRequest<T>(request: () => Promise<T>): Promise<T> {
  return globalRequestQueue.addRequest(request)
}

// Get queue information
export function getQueueInfo() {
  return globalRequestQueue.getQueueInfo()
}

// Single model configuration
export const MODEL_CONFIG = {
  name: 'qwen/qwen3-coder:free',
  maxTokens: 15000,
  temperature: 0.7,
  rateLimitInfo: {
    requestsPerMinute: 1000,
    requestsPerHour: 10000,
    burstLimit: 100
  }
}