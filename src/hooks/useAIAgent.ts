import { useState, useEffect } from 'react'
import { GeneratedContent, AIAgentState, ConversationMessage } from '@/types'
import { extractPreviewFromHTML, separateCodeAndText } from '@/libs/utils'


export const useAIAgent = () => {
  const [state, setState] = useState<AIAgentState>({
    input: '',
    isLoading: false,
    generatedContent: null,
    activeTab: 'code',
    copiedCode: false,
    lastPrompt: '',
    conversationHistory: [],
    isFirstRequest: true,
    viewingPreviousResponse: null,
    responseHistory: [],
    projectId: null,
    livePreviewUrl: null
  })



  const handleInputChange = (value: string) => {
    setState(prev => ({ ...prev, input: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.input.trim()) return

    const currentPrompt = state.input

    setState(prev => ({
      ...prev,
      isLoading: true,
      generatedContent: null,
      lastPrompt: currentPrompt
    }))

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentPrompt,
          conversationHistory: state.conversationHistory,
          isFirstRequest: state.isFirstRequest
        })
      })
      if (!res.ok || !res.body) {
        throw new Error('Failed to generate')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let aggregated = ''
      let finalContent: GeneratedContent | null = null
      let hasPreviewStarted = false

      // Set initial loading state showing both preview and code are being generated
      setState(prev => ({
        ...prev,
        generatedContent: {
          preview: '',
          code: '',
          description: 'Generating your project...'
        }
      }))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aggregated += decoder.decode(value, { stream: true })

        // Extract both preview and code simultaneously as content streams in
        const preview = extractPreviewFromHTML(aggregated)
        const { code, description } = separateCodeAndText(aggregated)
        
        // Show loading placeholders while content is being generated
        const currentPreview = preview || (aggregated.includes('/// file: preview.html') 
          ? '<div style="padding: 20px; text-align: center; color: #666;">🎨 Building your preview...</div>' 
          : '')
        
        const currentCode = code || (aggregated.includes('/// file:') && !aggregated.includes('/// file: preview.html') 
          ? '// Generating code files...\n// Please wait while your project is being created...' 
          : '')
        
        finalContent = { 
          preview: currentPreview,
          code: currentCode,
          description: description || 'Generating your project...' 
        }
        
        // Update state with both preview and code as they become available
        setState(prev => ({
          ...prev,
          generatedContent: finalContent
        }))
      }


      // Add messages to conversation history
      const newUserMessage: ConversationMessage = {
        role: 'user',
        content: currentPrompt,
        timestamp: Date.now()
      }

      const newAssistantMessage: ConversationMessage = {
        role: 'assistant', 
        content: finalContent?.description || 'Content generated successfully!',
        timestamp: Date.now(),
        generatedContent: finalContent || undefined
      }

      setState(prev => {
        // Generate project ID for first request or maintain existing one
        const currentProjectId = prev.projectId || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        return { 
          ...prev, 
          isLoading: false,
          input: '', // Clear input after successful submission
          conversationHistory: [...prev.conversationHistory, newUserMessage, newAssistantMessage],
          responseHistory: finalContent ? [...prev.responseHistory, finalContent] : prev.responseHistory,
          isFirstRequest: false, // No longer the first request
          viewingPreviousResponse: null, // Reset to current response
          projectId: currentProjectId
        }
      })
    } catch (error) {
      console.error('Error generating content:', error)
      
      // Determine error message based on response status
      let errorMessage = 'Failed to generate content. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Your request has been queued and will be processed automatically. Please wait a moment.'
        } else if (error.message.includes('queue is full')) {
          errorMessage = 'System is currently overloaded. Please try again in a few minutes.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out due to high demand. Please try again.'
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error occurred. Please try again in a few minutes.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
      }
      
      // Set error state with user-friendly message
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        generatedContent: {
          preview: `<div style="padding: 20px; text-align: center; color: #e74c3c; background: #fdf2f2; border: 1px solid #e74c3c; border-radius: 8px; margin: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #c0392b;">⚠️ Generation Failed</h3>
            <p style="margin: 0; color: #e74c3c;">${errorMessage}</p>
          </div>`,
          code: '',
          description: errorMessage
        }
      }))
    }
  }

  const setActiveTab = (tab: 'preview' | 'code') => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }

  const copyToClipboard = async () => {
    const contentToCopy = state.viewingPreviousResponse !== null 
      ? state.responseHistory[state.viewingPreviousResponse]?.code
      : state.generatedContent?.code
      
    if (contentToCopy) {
      await navigator.clipboard.writeText(contentToCopy)
      setState(prev => ({ ...prev, copiedCode: true }))
      setTimeout(() => {
        setState(prev => ({ ...prev, copiedCode: false }))
      }, 2000)
    }
  }

  const viewPreviousResponse = (index: number) => {
    setState(prev => ({ ...prev, viewingPreviousResponse: index }))
  }

  const viewCurrentResponse = () => {
    setState(prev => ({ ...prev, viewingPreviousResponse: null }))
  }

  // Get the content to display (either current or previous)
  const getDisplayContent = (): GeneratedContent | null => {
    if (state.viewingPreviousResponse !== null) {
      return state.responseHistory[state.viewingPreviousResponse] || null
    }
    return state.generatedContent
  }

  return {
    ...state,
    handleInputChange,
    handleSubmit,
    setActiveTab,
    copyToClipboard,
    viewPreviousResponse,
    viewCurrentResponse,
    getDisplayContent
  }
}