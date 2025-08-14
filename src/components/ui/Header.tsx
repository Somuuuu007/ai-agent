import { Sparkles } from 'lucide-react'
import { forwardRef } from 'react'
import Image from 'next/image'

interface HeaderProps {
  showSubtitle?: boolean
  align?: 'left' | 'center'
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ showSubtitle = true, align = 'center' }, ref) => {
    const isLeft = align === 'left'
    return (
      <header ref={ref} className={`${isLeft ? 'mb-4 -ml-4 -mt-6' : 'text-center mb-12'}`}>
        <div className={`flex items-center ${isLeft ? 'justify-start' : 'justify-center'} mb-3`}>
          <Image 
            src="/vidon-logo.png" 
            alt="Vidon Logo" 
            width={48} 
            height={48}
            className="rounded-md mr-3 shadow-[0_0_40px_rgba(99,102,241,0.3)] object-contain"
          />
          <div className="text-left">
            <h1 className="text-4xl font-bold tracking-tight text-white">Vidon</h1>
          </div>
        </div>
        {showSubtitle && (
          <div className={`max-w-3xl ${isLeft ? '' : 'mx-auto'}`}>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:bg-white/8">
              <p className="text-gray-300 text-base leading-relaxed">
                Describe what you want to build. Get an instant live preview and production-ready code.
              </p>
            </div>
      </div>
        )}
      </header>
    )
  }
)

Header.displayName = 'Header'