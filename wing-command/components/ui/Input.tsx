'use client';

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    function Input({ label, error, icon, className = '', ...props }, ref) {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full px-4 py-3 
              bg-gridiron-bg-secondary border border-gridiron-border 
              rounded-lg text-gray-100 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-wing-green focus:border-transparent
              transition-all duration-200
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-wing-red focus:ring-wing-red' : ''}
              ${className}
            `}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-wing-red">{error}</p>
                )}
            </div>
        );
    }
);
