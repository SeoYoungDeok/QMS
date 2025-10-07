import React from 'react'
import { cn } from '@/lib/utils'

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
)
Table.displayName = 'Table'

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props}>
      {children}
    </thead>
  )
)
TableHeader.displayName = 'TableHeader'

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    >
      {children}
    </tbody>
  )
)
TableBody.displayName = 'TableBody'

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-[var(--border-subtle)] transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
)
TableRow.displayName = 'TableRow'

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-[var(--text-secondary)] [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
)
TableHead.displayName = 'TableHead'

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'p-4 align-middle [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
)
TableCell.displayName = 'TableCell'

// 간단한 Table 컴포넌트 (headers와 data를 받아서 테이블 렌더링)
interface SimpleTableProps {
  headers: string[]
  data: React.ReactNode[][]
  className?: string
}

const SimpleTable: React.FC<SimpleTableProps> = ({ headers, data, className }) => {
  const safeHeaders = headers || []
  const safeData = data || []
  
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)}>
        <thead className="[&_tr]:border-b">
          <tr>
            {safeHeaders.map((header, index) => (
              <th
                key={index}
                className="h-12 px-4 text-left align-middle font-medium text-[var(--text-secondary)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {safeData.map((row, rowIndex) => {
            const safeRow = row || []
            return (
              <tr
                key={rowIndex}
                className="border-b border-[var(--border-subtle)] transition-colors hover:bg-gray-50/50"
              >
                {safeRow.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="p-4 align-middle"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  SimpleTable,
}

export default SimpleTable
