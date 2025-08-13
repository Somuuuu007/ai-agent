import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  isLoading: boolean
}

export const LoadingState = ({ isLoading }: LoadingStateProps) => {
  if (!isLoading) return null

  return (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mr-3" />
          <span className="text-white text-lg">Generating your creation...</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" 
            style={{width: '60%'}}
          />
        </div>
      </div>
    </div>
  )
}
