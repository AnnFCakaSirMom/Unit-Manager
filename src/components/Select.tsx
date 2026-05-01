import React, { forwardRef } from 'react';
import { cn } from '../utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                className={cn(
                    "bg-black/40 border border-amber-500/10 rounded-md py-1.5 px-3 text-white focus:outline-none focus:border-amber-500/40 backdrop-blur-sm transition-all focus:bg-black/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </select>
        );
    }
);
Select.displayName = "Select";
