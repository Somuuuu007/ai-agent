'use client'

import { Eye, Code, Copy, Check, Loader2, Sparkles } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { InputSection } from '@/components/ui/InputSection'
import { LoadingState } from '@/components/ui/LoadingState'

 
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
    // Animate input field container width when output panel shows/hides
    if (inputWrapRef.current && lastPrompt) {
      gsap.to(inputWrapRef.current, {
        duration,
        ease,
        right: showOutput ? 'calc(50vw + 12px)' : '12px'
      })
      
      // Add horizontal slide animation to the input section
      if (inputSectionRef.current) {
        if (showOutput) {
          // When showing output: slide left then back
          gsap.to(inputSectionRef.current, {
            x: -40,
            duration: duration * 0.4,
            ease: 'power2.out',
            onComplete: () => {
              gsap.to(inputSectionRef.current, {
                x: 0,
                duration: duration * 0.6,
                ease: 'power3.out'
              })
            }
          })
        } else {
          // When hiding output: slide right then back
          gsap.to(inputSectionRef.current, {
            x: 40,
            duration: duration * 0.4,
            ease: 'power2.out',
            onComplete: () => {
              gsap.to(inputSectionRef.current, {
                x: 0,
                duration: duration * 0.6,
                ease: 'power3.out'
              })
            }
          })
        }
      }
    }
  }, [showOutput, lastPrompt])

  // Animate layout changes when first request is made
  useEffect(() => {
    if (lastPrompt && headerRef.current && inputWrapRef.current && mainContainerRef.current) {
      const tl = gsap.timeline()
      
      // Set initial properties for input field when transitioning
      gsap.set(inputWrapRef.current, { 
        opacity: 0, 
        right: 12
      })
      
      // Animate container and header layout change
      tl.to(mainContainerRef.current, {
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        minHeight: 'auto',
        duration: 0.8,
        ease: 'power3.out'
      })
      
      // Animate input field to bottom with smooth transition
      tl.fromTo(inputWrapRef.current, 
        { y: -40, opacity: 0, scale: 0.95 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' },
        0.3
      )
    }
  }, [lastPrompt, showOutput])

  return (
    <div className="min-h-screen">
      <div
        ref={gridRef}
        className="container mx-auto px-4 py-6 grid gap-6"
        style={{ gridTemplateColumns: '1fr 0fr' }}
      >
        <div ref={leftRef}>
          <div 
            ref={mainContainerRef}
            className={`flex flex-col min-h-[80vh] ${!lastPrompt ? 'justify-center items-center' : 'justify-start items-start'}`}
          >
            <Header 
              ref={headerRef}
              showSubtitle={!generatedContent && !isLoading} 
              align={generatedContent || isLoading ? 'left' : 'center'} 
            />

            {(isLoading || generatedContent) && (
              <div className="space-y-2 max-w-3xl mx-auto w-full">
                <div className="flex justify-end pr-1">
                  <div className="max-w-lg bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white text-sm">
                    {lastPrompt}
                  </div>
                </div>
                <div className="flex justify-start pl-1">
                  <div className="max-w-lg inline-flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-200 text-sm">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        Generating output...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-2 text-purple-400" />
                        {generatedContent?.description || 'Output generated. Show output to view.'}
                      </>
                    )}
                  </div>
                </div>
                {generatedContent && (
                  <div className="flex justify-start pl-2">
                    <button
                      onClick={() => setShowOutput(v => !v)}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors"
                    >
                      {showOutput ? 'Hide output' : 'Show output'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!lastPrompt && (
              <div className="mt-8 w-full max-w-3xl">
                <InputSection
                  ref={inputSectionRef}
                  input={input}
                  isLoading={isLoading}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                />
              </div>
            )}
          </div>

          {lastPrompt && (
            <div
              ref={inputWrapRef}
              className="fixed z-40"
              style={{ left: 12, right: 12, bottom: 12 }}
            >
              <InputSection
                ref={inputSectionRef}
                input={input}
                isLoading={isLoading}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />
            </div>
          )}

          <Footer />
        </div>

        <div ref={rightRef} className="opacity-0 min-w-0">
          {generatedContent && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.35)] w-full">
               <div className="p-3 border-b border-white/10 flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('preview')}
                   className={`flex items-center px-3 py-1 rounded-lg text-xs ${
                    activeTab === 'preview'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                   className={`flex items-center px-3 py-1 rounded-lg text-xs ${
                    activeTab === 'code'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Code className="h-3.5 w-3.5 mr-2" />
                  Code
                </button>
                {activeTab === 'code' && (
                  <button
                    onClick={copyToClipboard}
                     className="ml-auto flex items-center px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs"
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
              {activeTab === 'preview' ? (
                <div className="p-6">
                  <div className="bg-white rounded-lg p-4 shadow-lg">
                    {generatedContent?.preview ? (
                      generatedContent.preview.includes('<!DOCTYPE html>') ? (
                        // Complete HTML document - use iframe
                        <iframe
                          srcDoc={generatedContent.preview}
                          className="w-full h-[75vh] border border-gray-300 rounded"
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
                <div className="p-6 min-w-0">
                  <div className="bg-white rounded-lg p-4 shadow-lg min-w-0">
                    <pre className="text-xs text-gray-800 bg-black/5 rounded-md p-4 max-h-[75vh] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words">
                      <code>{generatedContent?.code || ''}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}