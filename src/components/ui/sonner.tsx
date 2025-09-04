"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors={true}
      closeButton={true}
      duration={4000}
      toastOptions={{
        style: {
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '1px solid #93c5fd',
          color: '#1e40af',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          style: {
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            border: '1px solid #86efac',
            color: '#166534',
          },
        },
        error: {
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
            border: '1px solid #fca5a5',
            color: '#dc2626',
          },
        },
        warning: {
          style: {
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fcd34d',
            color: '#d97706',
          },
        },
        info: {
          style: {
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            border: '1px solid #93c5fd',
            color: '#1e40af',
          },
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
