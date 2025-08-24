import React, { useMemo } from 'react'

interface FormattedResponseProps {
  content: string
}

export const FormattedResponse: React.FC<FormattedResponseProps> = ({ content }) => {
  
  const formattedContent = useMemo(() => {
    // Quick cleanup - remove code blocks and file markers
    const cleanedText = content
      .replace(/\/\/\/ file: [\s\S]*?(?=\/\/\/ (?:file:|endfile)|$)/g, '')
      .replace(/\/\/\/ endfile/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim()

    if (!cleanedText) return null

    // Simple split by double newlines or common headings
    const parts = cleanedText.split(/\n\n|\n(?=(?:project overview|setup instructions|key features|project structure|requirements|dependencies|usage|installation|getting started|tech stack|features|components|configuration|api|examples|scripts|summary|conclusion)[\s]*:?[\s]*$)/i)
    
    return parts.map((part, index) => {
      const trimmedPart = part.trim()
      if (!trimmedPart) return null

      const lines = trimmedPart.split('\n')
      const firstLine = lines[0].trim()
      
      // Check if first line is a heading
      const isHeading = /^(project overview|setup instructions|key features|project structure|requirements|dependencies|usage|installation|getting started|tech stack|features|components|configuration|api|examples|scripts|summary|conclusion)[\s]*:?[\s]*$/i.test(firstLine) || 
                       /^#{1,6}\s/.test(firstLine)
      
      if (isHeading) {
        const headingText = firstLine.replace(/^#{1,6}\s*/, '').replace(/:?\s*$/, '')
        const contentLines = lines.slice(1)
        
        return (
          <div key={index} className="mb-6">
            <h3 className="text-white font-bold text-lg mb-3">
              {headingText}
            </h3>
            <hr className="border-gray-600 mb-4" />
            <div className="text-gray-200 leading-relaxed space-y-2">
              {contentLines.map((line, lineIndex) => {
                const trimmedLine = line.trim()
                if (!trimmedLine) return <div key={lineIndex} className="mb-2" />
                
                if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ')) {
                  return (
                    <div key={lineIndex} className="flex mb-1">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{trimmedLine.replace(/^[-*+]\s*/, '')}</span>
                    </div>
                  )
                }
                
                if (/^\d+\.\s/.test(trimmedLine)) {
                  const match = trimmedLine.match(/^(\d+)\.\s(.*)/)
                  return (
                    <div key={lineIndex} className="flex mb-1">
                      <span className="text-blue-400 mr-2">{match?.[1]}.</span>
                      <span>{match?.[2] || trimmedLine}</span>
                    </div>
                  )
                }
                
                return (
                  <div key={lineIndex} className="mb-2">
                    {trimmedLine}
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      // Regular content block
      return (
        <div key={index} className="mb-4 text-gray-200 leading-relaxed">
          {lines.map((line, lineIndex) => {
            const trimmedLine = line.trim()
            if (!trimmedLine) return <div key={lineIndex} className="mb-2" />
            
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ')) {
              return (
                <div key={lineIndex} className="flex mb-1">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{trimmedLine.replace(/^[-*+]\s*/, '')}</span>
                </div>
              )
            }
            
            return (
              <div key={lineIndex} className="mb-2">
                {trimmedLine}
              </div>
            )
          })}
        </div>
      )
    }).filter(Boolean)
  }, [content])

  if (!formattedContent || formattedContent.length === 0) {
    return (
      <div className="max-w-3xl text-gray-400 text-sm italic">
        No content to display
      </div>
    )
  }

  return (
    <div className="max-w-3xl text-gray-200 text-sm">
      {formattedContent}
    </div>
  )
}