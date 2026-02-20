import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 focus:ring-gray-500',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`
                    inline-flex items-center justify-center font-medium rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200
                    ${variants[variant]}
                    ${sizes[size]}
                    ${className}
                `}
                {...props}
            >
                {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
