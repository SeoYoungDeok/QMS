import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'guest' | 'practitioner' | 'admin' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default', 
  size = 'sm', 
  children, 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center rounded-[var(--radius-chip)] font-medium'
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-700',
    secondary: 'bg-purple-100 text-purple-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
    guest: 'badge-guest',
    practitioner: 'badge-practitioner',
    admin: 'badge-admin',
    destructive: 'bg-red-100 text-red-700',
    outline: 'border border-gray-300 text-gray-700'
  }
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge }
export default Badge
