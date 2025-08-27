import { Eye, Code, Copy, Check } from 'lucide-react'
import { GeneratedContent } from '@/types'

interface ResultsSectionProps {
  generatedContent: GeneratedContent | null
  isLoading: boolean
  activeTab: 'preview' | 'code'
  copiedCode: boolean
  onTabChange: (tab: 'preview' | 'code') => void
  onCopyCode: () => void
}

export const ResultsSection = ({
  generatedContent,
  isLoading,
  activeTab,
  copiedCode,
  onTabChange,
  onCopyCode
}: ResultsSectionProps) => {
  if (!generatedContent || isLoading) return null

  return (
    <div>
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => onTabChange('preview')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
            activeTab === 'preview'
              ? 'bg-white/15 text-white border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </button>
        <button
          onClick={() => onTabChange('code')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
            activeTab === 'code'
              ? 'bg-white/15 text-white border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <Code className="h-4 w-4 mr-2" />
          Code
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.35)] h-[calc(100vh-400px)]">
        {activeTab === 'preview' ? (
          <div className="p-6 h-full overflow-auto">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-purple-400" />
              Live Preview
              {isLoading && (
                <div className="ml-2 animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
              )}
            </h3>
            <div className="bg-white rounded-lg p-4 shadow-lg min-h-[200px]">
              {generatedContent.preview ? (
                <div dangerouslySetInnerHTML={{ __html: generatedContent.preview }} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {isLoading ? (
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Generating preview...</p>
                    </div>
                  ) : (
                    <p>No preview available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Code className="h-5 w-5 mr-2 text-purple-400" />
                Generated Code
              </h3>
              <button
                onClick={onCopyCode}
                className="flex items-center px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors duration-200 text-sm"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <pre className="text-xs text-gray-300 bg-black/30 rounded-lg p-4 h-full overflow-auto">
                <code>{generatedContent.code}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}