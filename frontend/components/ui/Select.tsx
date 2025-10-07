import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helper?: string
  options?: { value: string | number; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helper, options, placeholder, children, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-[var(--text-primary)] block">
            {label}
            {props.required && <span className="text-[var(--danger)] ml-1">*</span>}
          </label>
        )}
        
        <select
          className={cn(
            'flex h-10 w-full rounded-[var(--radius-input)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--danger)] focus:ring-[var(--danger)]',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        
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

Select.displayName = 'Select'

export { Select }
export default Select
