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
                    "font-semibold rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
                    // Variants
                    {
                        'bg-blue-600 hover:bg-blue-700 text-white': variant === 'primary',
                        'bg-green-600 hover:bg-green-700 text-white': variant === 'success',
                        'bg-red-600 hover:bg-red-700 text-white': variant === 'danger',
                        'bg-gray-600 hover:bg-gray-500 text-white': variant === 'secondary',
                        'bg-transparent hover:bg-gray-600': variant === 'ghost',
                    },
                    {
                        'py-1.5 px-3 gap-1.5': size === 'default',
                        'py-1 px-2 text-xs gap-1': size === 'sm',
                        'p-1': size === 'icon', // No extra padding and gap for icon only buttons
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
