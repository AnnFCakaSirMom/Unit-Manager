import React, { forwardRef } from 'react';
import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "bg-black/40 border border-amber-500/10 rounded-md px-2 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/40 backdrop-blur-sm transition-all focus:bg-black/60",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";
