import { ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'danger' | 'primary';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    variant = 'danger',
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                    <div className="text-gray-300 mb-6">{message}</div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                            {cancelText}
                        </Button>
                        <Button
                            variant={variant}
                            onClick={onConfirm}
                            isLoading={isLoading}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
