interface ProgressBarProps {
    value: number;
    showLabel?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

const heights = {
    sm: 'h-1',
    md: 'h-2',
};

export function ProgressBar({ value, showLabel = false, size = 'sm', className = '' }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, value));

    return (
        <div className={`w-full ${className}`}>
            <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${heights[size]}`}>
                <div
                    className="bg-blue-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className="text-xs text-gray-400 mt-1">{Math.round(percentage)}%</span>
            )}
        </div>
    );
}
