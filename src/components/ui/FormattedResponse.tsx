import React from 'react'

interface FormattedResponseProps {
  content: string
}

export const FormattedResponse: React.FC<FormattedResponseProps> = ({ content }) => {
  // Clean markdown symbols from text content
  const cleanMarkdownSymbols = (text: string) => {
    return text
      // Remove code blocks first (multi-line)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code backticks
      .replace(/`([^`\n]+)`/g, '$1')
      // Remove stray backticks
      .replace(/`/g, '')
      // Remove heading markers but keep content
      .replace(/^#{1,6}\s*/gm, '')
      // Remove bold/italic markers
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove strikethrough
      .replace(/~~(.*?)~~/g, '$1')
      // Convert markdown lists to clean bullets
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '• ')
      // Remove link syntax but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove reference links
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove blockquote markers
      .replace(/^>\s*/gm, '')
      // Clean up multiple spaces and normalize whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim()
  }

  const formatContent = (text: string) => {
    // Clean markdown symbols first
    const cleanedText = cleanMarkdownSymbols(text)
    
    // Split content by lines
    const lines = cleanedText.split('\n')
    const formatted: (string | JSX.Element)[] = []
    let inProjectStructure = false
    let projectStructureLines: string[] = []
    
    lines.forEach((line, index) => {
      // Check if line is a potential heading based on original content before cleaning
      const originalLine = text.split('\n')[index] || ''
      const isOriginalHeading = /^#{1,6}\s*/.test(originalLine)
      
      // Also check for common heading patterns in cleaned text
      const isPotentialHeading = /^(project overview|setup instructions|key features|project structure|features|overview|installation|usage|requirements|dependencies|getting started|how to|configuration|api|examples|conclusion|summary)/i.test(line.trim())
      
      // Check if we're entering a project structure section
      const isStructureLine = /^[│├└\s]*[├└]?──?\s*[\w.-]+\/?\s*/.test(line) || 
                             /^[│\s]*[├└]──?\s*[\w.-]+\/?\s*/.test(line) ||
                             /^\s*[├└│]\s*[\w.-]+\/?\s*/.test(line) ||
                             /^[\s│├└─]*[\w.-]+\/\s*$/.test(line) ||
                             /^[\s]*src\//.test(line) ||
                             /^[\s]*[\w-]+\//.test(line.trim()) && line.includes('/') && !line.includes('http')
      
      if (isOriginalHeading || isPotentialHeading) {
        // If we were in project structure, end it first
        if (inProjectStructure && projectStructureLines.length > 0) {
          formatted.push(
            <div key={`structure-${index}`} className="mb-4">
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm">
                {projectStructureLines.map((structLine, structIndex) => (
                  <div key={structIndex} className="leading-relaxed">
                    {formatStructureLine(structLine)}
                  </div>
                ))}
              </div>
            </div>
          )
          projectStructureLines = []
          inProjectStructure = false
        }
        
        const headingText = line.trim()
        // Only process if heading has actual content
        if (headingText) {
          formatted.push(
            <div key={`heading-${index}`} className="mb-4 mt-6 first:mt-0">
              <h3 className="text-white font-semibold text-lg mb-2">
                {headingText}
              </h3>
              <hr className="border-gray-600 border-t mb-4" />
            </div>
          )
        }
      } else if (isStructureLine) {
        // Start or continue project structure
        if (!inProjectStructure) {
          inProjectStructure = true
        }
        projectStructureLines.push(line)
      } else {
        // If we were in project structure, end it
        if (inProjectStructure && projectStructureLines.length > 0) {
          formatted.push(
            <div key={`structure-${index}`} className="mb-4">
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm">
                {projectStructureLines.map((structLine, structIndex) => (
                  <div key={structIndex} className="leading-relaxed">
                    {formatStructureLine(structLine)}
                  </div>
                ))}
              </div>
            </div>
          )
          projectStructureLines = []
          inProjectStructure = false
        }
        
        // Regular text line
        if (line.trim()) {
          // Clean any remaining markdown artifacts and format nicely
          const cleanLine = line.trim()
          formatted.push(
            <div key={`line-${index}`} className="mb-1 leading-relaxed">
              {cleanLine}
            </div>
          )
        } else {
          // Empty line - add spacing
          formatted.push(
            <div key={`space-${index}`} className="mb-2"></div>
          )
        }
      }
    })
    
    // Handle case where project structure is at the end
    if (inProjectStructure && projectStructureLines.length > 0) {
      formatted.push(
        <div key={`structure-end`} className="mb-4">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 font-mono text-sm">
            {projectStructureLines.map((structLine, structIndex) => (
              <div key={structIndex} className="leading-relaxed">
                {formatStructureLine(structLine)}
              </div>
            ))}
          </div>
        </div>
      )
    }
    
    return formatted
  }

  const formatStructureLine = (line: string) => {
    // Extract tree symbols, filename, and comment
    const match = line.match(/^(\s*[│├└─\s]*)([\w.-]+\/?)(\s*#?\s*(.*))?$/)
    
    if (match) {
      const [, treeSymbols, filename, , comment] = match
      const isDirectory = filename.endsWith('/')
      
      return (
        <span>
          <span className="text-gray-500">{treeSymbols}</span>
          <span className={isDirectory ? "text-blue-400" : "text-white"}>
            {filename}
          </span>
          {comment && (
            <span className="text-gray-500 ml-4"># {comment}</span>
          )}
        </span>
      )
    }
    
    return <span className="text-gray-300">{line}</span>
  }

  return (
    <div className="max-w-3xl text-gray-200 text-sm">
      <div className="leading-relaxed">
        {formatContent(content)}
      </div>
    </div>
  )
}