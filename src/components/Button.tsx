import React from 'react';
import { cn } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'success' | 'danger' | 'ghost' | 'secondary';
    size?: 'sm' | 'default' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'default', children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "font-semibold rounded-md transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
                    // Variants
                    {
                        'bg-black/60 border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:border-amber-400 hover:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] backdrop-blur-sm': variant === 'primary',
                        'bg-black/60 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-400 hover:text-emerald-400 backdrop-blur-sm': variant === 'success',
                        'bg-black/60 border border-rose-500/50 text-rose-500 hover:bg-rose-500/10 hover:border-rose-400 hover:text-rose-400 backdrop-blur-sm': variant === 'danger',
                        'bg-black/40 border border-white/10 text-gray-300 hover:bg-black/60 hover:border-amber-500/30 hover:text-amber-500 backdrop-blur-sm': variant === 'secondary',
                        'bg-transparent hover:bg-black/40 text-gray-400 hover:text-amber-500': variant === 'ghost',
                    },
                    {
                        'py-1.5 px-3 gap-1.5': size === 'default',
                        'py-1 px-2 text-xs gap-1': size === 'sm',
                        'p-1.5': size === 'icon', 
                    },
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
