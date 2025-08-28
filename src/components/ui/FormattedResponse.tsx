import React, { useMemo } from 'react'
import { stripAllHTMLContent } from '@/libs/utils'

interface FormattedResponseProps {
  content: string
}

// Project structure rendering removed - now handled in code display section

export const FormattedResponse: React.FC<FormattedResponseProps> = ({ content }) => {
  
  const formattedContent = useMemo(() => {
    try {
      // Early return for empty content
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return null
      }
      
      // Aggressive cleanup - remove ALL HTML content and technical markers
      const cleanedText = stripAllHTMLContent(content)

    if (!cleanedText) return null

    // More robust heading detection patterns (removed project structure)
    const headingPatterns = [
      'project overview', 'then project overview', 'setup instructions', 
      'key features', 'requirements', 'dependencies', 'usage', 'installation', 
      'getting started', 'tech stack', 'features', 'components', 'configuration', 
      'api', 'examples', 'scripts', 'summary', 'conclusion', 'overview', 
      'description', 'about', 'how to use', 'next steps', 'deployment'
    ]
    
    // Create a more flexible regex pattern
    const headingRegex = new RegExp(
      `\\n\\n|\\n(?=(?:${headingPatterns.join('|')})(?:[\\s]*:?[\\s]*$|[\\s]+))`, 
      'gi'
    )
    
    const parts = cleanedText.split(headingRegex)
    
    return parts.map((part, index) => {
      const trimmedPart = part.trim()
      if (!trimmedPart) return null

      const lines = trimmedPart.split('\n')
      const firstLine = lines[0].trim()
      
      // Check if first line is a heading (enhanced detection)
      const isHeadingPattern = new RegExp(
        `^(${headingPatterns.join('|')})(?:[\\s]*:?[\\s]*$|[\\s]+)`, 
        'i'
      )
      const isHeading = isHeadingPattern.test(firstLine) || 
                       /^#{1,6}\s/.test(firstLine) ||
                       /^\*\*.*\*\*$/.test(firstLine) || // Bold markdown headers
                       /^\d+\.\s*\*\*.*\*\*:?\s*$/.test(firstLine) // Numbered bold headers
      
      // Removed project structure handling
      
      // Skip empty or unwanted sections
      const isUnwantedSection = /^(files?|file\s+list|files\s+list|generated\s+files|project\s+files)[\s]*:?[\s]*$/i.test(firstLine)
      
      if (isUnwantedSection) {
        return null // Skip these sections entirely
      }
      
      if (isHeading) {
        const headingText = firstLine
          .replace(/^#{1,6}\s*/, '') // Remove markdown headers
          .replace(/^\d+\.\s*/, '') // Remove numbering (1., 2., etc.)
          .replace(/^\*\*(.*?)\*\*:?/, '$1') // Remove bold markdown with optional colon
          .replace(/:?\s*$/, '') // Remove trailing colon and spaces
          .replace(/^then\s+/i, '') // Remove "then" prefix from AI responses
          .trim()
        const contentLines = lines.slice(1)
        
        // Only skip headings that are specifically unwanted AND have no content
        // This is a fallback check - the main filtering happens above with isUnwantedSection
        const isEmptyFileSection = /^files?$/i.test(headingText) && contentLines.every(line => line.trim().length === 0)
        if (isEmptyFileSection) {
          return null
        }
        
        return (
          <div key={index} className="mb-6 mt-8">
            <h3 className="text-white font-bold text-2xl mb-4">
              {headingText}
            </h3>
            <hr className="border-gray-500 mb-6" />
            <div className="text-gray-200 leading-relaxed space-y-2 text-base">
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
                })
              }
            </div>
          </div>
        )
      }

      // Regular content block
      return (
        <div key={index} className="mb-4 text-gray-200 leading-relaxed text-base">
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
    } catch (error) {
      console.error('Error formatting response:', error)
      // Fallback: return basic formatted content with aggressive cleanup
      const cleanedFallbackContent = stripAllHTMLContent(content || '')
        
      const fallbackParts = cleanedFallbackContent.split('\n\n').filter(part => part.trim())
      return fallbackParts.map((part, index) => (
        <div key={index} className="mb-4 text-gray-200 leading-relaxed text-base">
          {part.split('\n').map((line, lineIndex) => {
            const cleanLine = line.trim()
            return (
              <div key={lineIndex} className="mb-2">
                {cleanLine}
              </div>
            )
          })}
        </div>
      ))
    }
  }, [content])

  if (!formattedContent || formattedContent.length === 0) {
    return (
      <div className="max-w-3xl text-gray-400 text-sm italic">
        No content to display
      </div>
    )
  }

  return (
    <div className="max-w-3xl text-gray-200 text-base">
      {formattedContent}
    </div>
  )
}