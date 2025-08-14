import { useState } from 'react'
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
    isFirstRequest: true
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