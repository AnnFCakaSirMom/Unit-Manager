import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes safely.
 * It combines `clsx` for conditional classes and `tailwind-merge`
 * to resolve any conflicting Tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const washName = (name: string) => (name || "")
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f\ufe0e]/gu, "")
    .replace(/\[.*?\]|\(.*?\)|\<.*?\>|['\s]/g, '')
    .toLowerCase();
