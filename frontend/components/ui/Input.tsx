import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, type = 'text', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-[var(--text-primary)] block">
            {label}
            {props.required && <span className="text-[var(--danger)] ml-1">*</span>}
          </label>
        )}
        
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-[var(--radius-input)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--danger)] focus:ring-[var(--danger)]',
            className
          )}
          ref={ref}
          {...props}
        />
        
        {error && (
          <p className="text-sm text-[var(--danger)] flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helper && !error && (
          <p className="text-sm text-[var(--text-muted)]">{helper}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export default Input
