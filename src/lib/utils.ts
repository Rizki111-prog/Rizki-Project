import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: string | number): string {
  const stringValue = String(value);
  if (!stringValue || isNaN(Number(stringValue.replace(/\./g, '')))) {
    return '';
  }
  const number = Number(stringValue.replace(/\./g, ''));
  return new Intl.NumberFormat('id-ID').format(number);
}

export function cleanRupiah(value: string): number {
  if (!value) return 0;
  return Number(value.replace(/\./g, ''));
}
