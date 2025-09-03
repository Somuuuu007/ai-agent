
import { Send, Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

interface InputSectionProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  variant?: 'centered' | 'full'
  compact?: boolean
}

export const InputSection = forwardRef<HTMLDivElement, InputSectionProps>(({ 
  input, 
  isLoading, 
  onInputChange, 
  onSubmit,
  variant = 'centered'
  // compact = false
}, ref) => {
  const containerClass = variant === 'centered'
    ? `mx-auto mb-6 px-4 transition-all duration-500 max-w-3xl`
    : `mb-6 px-4 transition-all duration-500`
  
  return (
    <div ref={ref} className={containerClass}>
      <form onSubmit={onSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Describe what you want to create... (e.g., 'Create a todo list with checkboxes')"
          className={`w-full p-6 pr-16 text-base bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white/8 resize-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] scrollbar-thin transition-all`}
          rows={4}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`absolute right-4 bottom-4 p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:transform hover:-translate-y-0.5`}
        >
          {isLoading ? (
            <Loader2 className={`h-5 w-5 animate-spin`} />
          ) : (
            <Send className={`h-5 w-5`} />
          )}
        </button>
      </form>
    </div>
  )
})

InputSection.displayName = 'InputSection'