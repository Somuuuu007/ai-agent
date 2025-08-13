import { Sparkles } from 'lucide-react'
import { forwardRef } from 'react'

interface HeaderProps {
  showSubtitle?: boolean
  align?: 'left' | 'center'
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ showSubtitle = true, align = 'center' }, ref) => {
    const isLeft = align === 'left'
    return (
      <header ref={ref} className={`${isLeft ? 'mb-8' : 'text-center mb-12'}`}>
        <div className={`flex items-center ${isLeft ? 'justify-start' : 'justify-center'} mb-3`}>
          <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center mr-3 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
            <Sparkles className="h-6 w-6 text-purple-400" />
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-bold tracking-tight">Vidon</h1>
          </div>
        </div>
        {showSubtitle && (
          <div className={`max-w-3xl ${isLeft ? '' : 'mx-auto'}`}>
            <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-sky-500/10 border border-white/10 p-[1px]">
              <div className="rounded-2xl bg-slate-900/40 p-4">
                <p className="text-gray-300 text-base">
                  Describe what you want to build. Get an instant live preview and production-ready code.
                </p>
              </div>
            </div>
          </div>
        )}
      </header>
    )
  }
)

Header.displayName = 'Header'