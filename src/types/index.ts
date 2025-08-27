export interface GeneratedContent {
    preview: string
    code: string
    description: string
  }

  export interface ConversationMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    generatedContent?: GeneratedContent // Store full response data for assistant messages
  }
  
  export interface AIAgentState {
    input: string
    isLoading: boolean
    generatedContent: GeneratedContent | null
    activeTab: 'preview' | 'code'
    copiedCode: boolean
    lastPrompt: string
    conversationHistory: ConversationMessage[]
    isFirstRequest: boolean
    viewingPreviousResponse: number | null // Index of previous response being viewed
    responseHistory: GeneratedContent[] // Store all previous complete responses
    projectId: string | null // For live preview functionality
    livePreviewUrl: string | null // Live preview URL when available
  }

