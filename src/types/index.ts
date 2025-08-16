export interface GeneratedContent {
    preview: string
    code: string
    description: string
  }

  export interface ConversationMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
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
    livePreviewUrl?: string
    projectId?: string
  }

  export interface ExtractedFile {
    path: string
    content: string
  }

  export interface LivePreviewData {
    port: number
    previewUrl: string
    status: string
  }