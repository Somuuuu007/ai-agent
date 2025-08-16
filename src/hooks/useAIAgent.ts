import { useState, useRef } from 'react'
import { GeneratedContent, AIAgentState, ConversationMessage } from '@/types'
import { extractPreviewFromHTML, separateCodeAndText, extractFilesFromResponse, generateProjectId, saveProjectFiles } from '@/libs/utils'

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
    livePreviewUrl: undefined,
    projectId: undefined
  })

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const pollForLivePreview = async (projectId: string) => {
    let attempts = 0
    const maxAttempts = 30 // Poll for up to 30 seconds
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/live-preview/${projectId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'running' && data.previewUrl) {
            setState(prev => ({
              ...prev,
              livePreviewUrl: data.previewUrl
            }))
            console.log(`Live preview available at: ${data.previewUrl}`)
            return
          }
        }
        
        attempts++
        if (attempts < maxAttempts) {
          pollingTimeoutRef.current = setTimeout(poll, 1000) // Poll every second
        } else {
          console.log('Live preview polling timeout')
        }
      } catch (error) {
        console.error('Error polling for live preview:', error)
        attempts++
        if (attempts < maxAttempts) {
          pollingTimeoutRef.current = setTimeout(poll, 1000)
        }
      }
    }
    
    // Clear any existing polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
    }
    
    poll()
  }

  const handleInputChange = (value: string) => {
    setState(prev => ({ ...prev, input: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.input.trim()) return

    const currentPrompt = state.input

    // Clear any existing polling when starting a new request
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      generatedContent: null,
      lastPrompt: currentPrompt,
      livePreviewUrl: undefined, // Reset live preview URL
      projectId: undefined // Reset project ID
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aggregated += decoder.decode(value, { stream: true })

        const preview = extractPreviewFromHTML(aggregated)
        const { code, description } = separateCodeAndText(aggregated)
        finalContent = { preview, code, description }
        
        setState(prev => ({
          ...prev,
          generatedContent: finalContent
        }))
      }

      // Extract files and save them to project folder (non-blocking)
      if (finalContent && aggregated) {
        const extractedFiles = extractFilesFromResponse(aggregated)
        if (extractedFiles.length > 0) {
          const projectId = generateProjectId()
          
          // Save files and get live preview info
          saveProjectFiles(projectId, extractedFiles)
            .then((result) => {
              if (result?.success) {
                console.log(`Project files saved to ai-previews/${projectId}`)
                
                // Update state with live preview info
                setState(prev => ({
                  ...prev,
                  projectId: projectId,
                  livePreviewUrl: result.livePreview?.previewUrl
                }))

                if (result.livePreview) {
                  console.log(`Live preview available at: ${result.livePreview.previewUrl}`)
                } else {
                  // Start polling for live preview if not immediately available
                  pollForLivePreview(projectId)
                }
              } else {
                console.warn('Failed to save project files')
              }
            })
            .catch((error) => {
              console.error('Error saving project files:', error)
            })
        }
      }

      // Add messages to conversation history
      const newUserMessage: ConversationMessage = {
        role: 'user',
        content: currentPrompt,
        timestamp: Date.now()
      }

      const newAssistantMessage: ConversationMessage = {
        role: 'assistant', 
        content: finalContent?.description || aggregated,
        timestamp: Date.now()
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        input: '', // Clear input after successful submission
        conversationHistory: [...prev.conversationHistory, newUserMessage, newAssistantMessage],
        isFirstRequest: false // No longer the first request
      }))
    } catch (error) {
      console.error('Error generating content:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const setActiveTab = (tab: 'preview' | 'code') => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }

  const copyToClipboard = async () => {
    if (state.generatedContent?.code) {
      await navigator.clipboard.writeText(state.generatedContent.code)
      setState(prev => ({ ...prev, copiedCode: true }))
      setTimeout(() => {
        setState(prev => ({ ...prev, copiedCode: false }))
      }, 2000)
    }
  }

  return {
    ...state,
    handleInputChange,
    handleSubmit,
    setActiveTab,
    copyToClipboard
  }
}