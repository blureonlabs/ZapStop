import React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Lightning Bolt Icon */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            fill="url(#lightningGradient)"
            stroke="#d97706"
            strokeWidth="0.5"
          />
        </svg>
      </div>
      
      {/* Zap Stop Text */}
      <div className={`font-bold ${textSizes[size]} text-blue-600`}>
        <span className="text-blue-600">Zap</span>
        <span className="text-blue-600 ml-1">Stop</span>
      </div>
    </div>
  )
}
