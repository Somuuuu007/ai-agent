'use client'

import { Eye, Code, Copy, Check, Loader2, Sparkles } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { InputSection } from '@/components/ui/InputSection'

 
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
    lastPrompt
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
        gridTemplateColumns: showOutput ? '1fr 1fr' : '1fr 0fr'
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
                <div className="space-y-3 max-w-3xl mx-auto w-full">
                  <div className="flex justify-end pr-1">
                    <div className="max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                      {lastPrompt}
                    </div>
                  </div>
                  
                  {(isLoading || generatedContent) && (
                    <div className="flex justify-start pl-1">
                      <div className="max-w-3xl text-gray-200 text-sm">
                        {isLoading ? (
                          <div className="inline-flex items-center">
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                            Generating output...
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center mb-2">
                              <Sparkles className="h-3.5 w-3.5 mr-2 text-purple-400" />
                              <span className="font-medium">AI Response</span>
                            </div>
                            <div className="prose prose-sm text-gray-200 max-w-none">
                              <div className="whitespace-pre-wrap leading-relaxed">
                                {generatedContent?.description || 'Output generated. Show output to view.'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {generatedContent && (
                    <div className="flex justify-start pl-2">
                      <button
                        onClick={() => setShowOutput(v => !v)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white text-xs font-medium transition-all hover:transform hover:-translate-y-0.5"
                      >
                        {showOutput ? 'Hide output' : 'Show output'}
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
          {generatedContent && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-full h-full flex flex-col">
               <div className="p-3 border-b border-white/10 flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('preview')}
                   className={`flex items-center px-3 py-1 rounded-lg text-xs transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20'
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
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <Code className="h-3.5 w-3.5 mr-2" />
                  Code
                </button>
                {activeTab === 'code' && (
                  <button
                    onClick={copyToClipboard}
                     className="ml-auto bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center px-3 py-1 rounded-lg text-white text-xs transition-all"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                {activeTab === 'preview' ? (
                  <div className="h-full overflow-y-auto p-6">
                    <div className="bg-white rounded-lg p-4 shadow-lg">
                      {generatedContent?.preview ? (
                        generatedContent.preview.includes('<!DOCTYPE html>') ? (
                          // Complete HTML document - use iframe
                          <iframe
                            srcDoc={generatedContent.preview}
                            className="w-full h-[60vh] border border-gray-300 rounded"
                            title="Preview"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        ) : (
                          // HTML fragment - use dangerouslySetInnerHTML
                          <div dangerouslySetInnerHTML={{ __html: generatedContent.preview }} />
                        )
                      ) : (
                        <div className="text-gray-500 text-center py-8">No preview available</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-6 min-w-0">
                    <div className="bg-white rounded-lg p-4 shadow-lg min-w-0">
                      <pre className="text-xs text-gray-800 bg-black/5 rounded-md p-4 overflow-x-auto whitespace-pre-wrap break-words">
                        <code>{(() => {
                          const code = generatedContent?.code || '';
                          // Filter out preview.html from the code display
                          if (code.includes('/// file: preview.html')) {
                            const beforePreview = code.split('/// file: preview.html')[0];
                            return beforePreview.trim();
                          }
                          return code;
                        })()}</code>
                  </pre>
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