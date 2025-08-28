'use client'

import { Eye, Code, Copy, Check, Loader2, Sparkles } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { InputSection } from '@/components/ui/InputSection'
import { FormattedResponse } from '@/components/ui/FormattedResponse'
import { Footer } from '@/components/ui/Footer'
import { useAIAgent } from '@/hooks/useAIAgent'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'


export default function AIAgentPage() {
  const {
    input,
    isLoading,
    generatedContent,
    activeTab,
    copiedCode,
    handleInputChange,
    handleSubmit,
    setActiveTab,
    copyToClipboard,
    lastPrompt,
    conversationHistory,
    livePreviewUrl,
    projectId,
    viewPreviousResponse,
    viewCurrentResponse,
    getDisplayContent,
    viewingPreviousResponse,
    responseHistory
  } = useAIAgent()

  const [showOutput, setShowOutput] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const inputWrapRef = useRef<HTMLDivElement>(null)
  const inputSectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const mainContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const duration = 0.6
    const ease = 'power3.inOut'
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        duration,
        ease,
        gridTemplateColumns: showOutput ? '2fr 3fr' : '1fr 0fr'
      })
    }
    if (rightRef.current) {
      gsap.to(rightRef.current, { duration, ease, opacity: showOutput ? 1 : 0 })
    }
  }, [showOutput])

  // Smooth transition when first request is made
  useEffect(() => {
    if (lastPrompt && inputWrapRef.current) {
      // Simple fade-in animation for the input wrapper
      gsap.fromTo(inputWrapRef.current, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [lastPrompt])

  const handleLivePreview = async () => {
    if (!projectId) return
    
    try {
      console.log('Starting live preview for project:', projectId)
      
      // First try to get or start the live preview
      const response = await fetch(`/api/live-preview/${projectId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Live preview response:', data)
        
        if (data.previewUrl) {
          // Open live preview in new tab
          window.open(data.previewUrl, '_blank')
        } else {
          console.error('No preview URL available')
          alert('Live preview is starting... Please try again in a few seconds.')
        }
      } else {
        console.error('Failed to get live preview:', response.status, response.statusText)
        alert('Failed to start live preview. Please try again.')
      }
    } catch (error) {
      console.error('Error starting live preview:', error)
      alert('Error starting live preview. Please check the console for details.')
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-black">
      <div 
        className="galaxy-background"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/galaxy-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a1a2e',
          opacity: 10,
          zIndex: 1
        }}
      ></div>
      <div
        ref={gridRef}
        className="container mx-auto px-4 py-6 grid gap-6 h-full"
        style={{ gridTemplateColumns: '1fr 0fr' }}
      >
        <div ref={leftRef} className="flex flex-col h-screen overflow-hidden relative z-10">

          {!lastPrompt ? (
            <div 
              ref={mainContainerRef}
              className="flex-1 flex flex-col justify-center items-center overflow-hidden"
            >
              <div>
                <Header 
                  ref={headerRef}
                  showSubtitle={!generatedContent && !isLoading} 
                  align="center" 
                />
              </div>
              <div className="mt-8 w-full max-w-3xl">
                <InputSection
                  ref={inputSectionRef}
                  input={input}
                  isLoading={isLoading}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 px-4 pt-6">
                <Header 
                  ref={headerRef}
                  showSubtitle={false} 
                  align="left" 
                />
              </div>
              
              <div className="flex-1 overflow-y-auto pl-4 pr-0 pb-4 scrollbar-thin">
                <div className="space-y-8 max-w-3xl mx-auto w-full">
                  {/* Display conversation history */}
                  {conversationHistory.map((message, index) => {
                    const isAssistant = message.role === 'assistant'
                    const hasGeneratedContent = isAssistant && message.generatedContent
                    const responseIndex = isAssistant ? Math.floor(index / 2) : -1 // Calculate response index for assistant messages
                    
                    return (
                      <div key={index}>
                        <div className={`flex ${message.role === 'user' ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                          {message.role === 'user' ? (
                            <div className="max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                              {message.content}
                            </div>
                          ) : (
                            <FormattedResponse content={message.content} />
                          )}
                        </div>
                        
                        {/* Add "View Generated Project" button after rate limit message */}
                        {hasGeneratedContent && responseIndex >= 0 && message.content.includes('Rate Limit Exceeded') && (
                          <div className="flex justify-start pl-2 mt-2 space-x-3">
                            <button
                              onClick={() => {
                                viewPreviousResponse(0) // Always show the first (and only) request's content
                                setShowOutput(true)
                              }}
                              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg text-purple-300 hover:text-purple-200 text-xs font-medium transition-all hover:transform hover:-translate-y-0.5"
                            >
                              View Generated Project
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Loading state - show current request and loading */}
                  {isLoading && lastPrompt && !conversationHistory.some(msg => msg.content === lastPrompt) && (
                    <>
                      <div className="flex justify-end pr-1">
                        <div className="max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                          {lastPrompt}
                        </div>
                      </div>
                      <div className="flex justify-start pl-1">
                        <div className="max-w-3xl text-gray-200 text-sm">
                          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2 text-purple-400" />
                              <span className="text-white">Generating output...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Current streaming response - show only if not in history yet */}
                  {!isLoading && generatedContent && lastPrompt && !conversationHistory.some(msg => msg.content === lastPrompt) && (
                    <>
                      <div className="flex justify-end pr-1">
                        <div className="max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                          {lastPrompt}
                        </div>
                      </div>
                      <div className="flex justify-start pl-1">
                        <FormattedResponse content={generatedContent.description || 'Output generated. Show output to view.'} />
                      </div>
                    </>
                  )}
                  
                  {(generatedContent || viewingPreviousResponse !== null) && (
                    <div className="flex justify-start pl-2 space-x-3">
                      <button
                        onClick={() => {
                          if (viewingPreviousResponse !== null) {
                            // Currently viewing previous response - go back to current
                            viewCurrentResponse()
                            setShowOutput(true)
                          } else {
                            // Currently viewing current response - toggle output
                            setShowOutput(v => !v)
                          }
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white text-xs font-medium transition-all hover:transform hover:-translate-y-0.5"
                      >
                        {viewingPreviousResponse !== null 
                          ? 'Hide previous response'
                          : (showOutput ? 'Hide output' : 'Show output')
                        }
                      </button>
                      
                    </div>
                  )}
                </div>
              </div>
              
              <div 
                ref={inputWrapRef}
                className="flex-shrink-0 p-4"
              >
                <InputSection
                  ref={inputSectionRef}
                  input={input}
                  isLoading={isLoading}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                />
              </div>
            </>
          )}

          <Footer />
        </div>

        <div ref={rightRef} className="opacity-0 min-w-0 flex flex-col h-[calc(100vh-2rem)] overflow-hidden relative z-10">
          {getDisplayContent() && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-full h-full flex flex-col">
              <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center px-3 py-1 rounded-lg text-xs transition-all ${
                      activeTab === 'preview' 
                        ? 'bg-white/15 text-white border border-white/20' 
                        : 'bg-white/5 text-white/60 hover:text-white/80 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5 mr-2" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center px-3 py-1 rounded-lg text-xs transition-all ${
                      activeTab === 'code' 
                        ? 'bg-white/15 text-white border border-white/20' 
                        : 'bg-white/5 text-white/60 hover:text-white/80 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5 mr-2" />
                    Code
                  </button>
                </div>
                
                {/* Show indicator when viewing previous response */}
                {viewingPreviousResponse !== null && (
                  <div className="text-xs text-purple-300 bg-purple-600/20 px-2 py-1 rounded border border-purple-500/30">
                    Viewing Response #{viewingPreviousResponse + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden ">
                {activeTab === 'preview' ? (
                  <div className="h-full overflow-y-auto p-6 scrollbar-thin">
                    <div className="space-y-4">
                      {(() => {
                        const displayContent = getDisplayContent();
                        return displayContent?.preview ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg w-[114vh]">
                            <div className="flex items-center space-x-2 ">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span className="text-white text-sm font-medium">Static Preview</span>
                            </div>
                          </div>
                          {displayContent.preview && displayContent.preview.trim().length > 0 ? (
                            <>
                              {displayContent.preview?.includes('<!DOCTYPE html>') || displayContent.preview?.includes('<html') ? (
                                // Complete HTML document - use iframe
                                <iframe
                                  srcDoc={displayContent.preview}
                                  className="w-[114vh] h-[73vh] border border-white/20 rounded-lg bg-white "
                                  title="Static Preview"
                                  sandbox="allow-scripts allow-same-origin allow-forms"
                                />
                              ) : (
                                // HTML fragment - wrap in basic HTML and use iframe
                                <iframe
                                  srcDoc={`<!DOCTYPE html>
                                    <html lang="en">
                                    <head>
                                      <meta charset="UTF-8">
                                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                      <title>Preview</title>
                                      <script src="https://cdn.tailwindcss.com"></script>
                                      <style>body { padding: 1rem; }</style>
                                    </head>
                                    <body>${displayContent.preview || ''}</body>
                                    </html>`}
                                  className="w-[114vh] h-[73vh] border border-white/20 rounded-lg bg-white"
                                  title="Static Preview"
                                  sandbox="allow-scripts allow-same-origin allow-forms"
                                />
                              )}
                            </>
                          ) : (
                            <div className="text-white/60 text-center py-8 border border-white/10 rounded-lg bg-white/5">
                              <p>No preview content available</p>
                              <p className="text-xs mt-1 text-white/40">Content is being processed...</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-white/60 text-center py-8 bg-white/5 border border-white/10 rounded-lg">No preview available</div>
                      ); })()}
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto scrollbar-thin">
                    <div className="p-6">
                      {getDisplayContent()?.code ? (
                        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                          <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                            <span className="text-white text-sm font-medium">Generated Code</span>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                              <code>{getDisplayContent()?.code}</code>
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white/60 text-center py-8">
                          <Code className="h-8 w-8 mx-auto mb-3" />
                          <p>No code available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}