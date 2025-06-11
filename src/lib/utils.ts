import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `INV-${timestamp}-${random}`
}

export function generatePaymentReference(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PAY-${timestamp}-${random}`
}

export function capitalizeWords(str: string): string {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

export function classLevelToDisplay(level: string): string {
  const mapping: Record<string, string> = {
    'pre_creche': 'Pre-Creche',
    'nursery_1': 'Nursery 1',
    'nursery_2': 'Nursery 2',
    'primary_1': 'Primary 1',
    'primary_2': 'Primary 2',
    'primary_3': 'Primary 3',
    'primary_4': 'Primary 4',
    'primary_5': 'Primary 5',
    'primary_6': 'Primary 6',
    'jss_1': 'JSS 1',
    'jss_2': 'JSS 2',
    'jss_3': 'JSS 3',
    'sss_1': 'SSS 1',
    'sss_2': 'SSS 2',
    'sss_3': 'SSS 3'
  }
  return mapping[level] || level
}
