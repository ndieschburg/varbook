import { ReactNode } from 'react';

interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'info';
    children: ReactNode;
    className?: string;
}

const variants = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    info: 'bg-blue-900/50 text-blue-400',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${variants[variant]}
                ${className}
            `}
        >
            {children}
        </span>
    );
}
