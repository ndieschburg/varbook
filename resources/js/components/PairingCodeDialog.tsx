import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/api/client';
import { Button } from '@/components/ui';

interface PairingCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PairingCodeData {
    code: string;
    expires_at: string;
    expires_in_seconds: number;
    device_name: string;
}

export function PairingCodeDialog({ isOpen, onClose }: PairingCodeDialogProps) {
    const { t } = useTranslation();
    const [deviceName, setDeviceName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [pairingData, setPairingData] = useState<PairingCodeData | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (pairingData && secondsLeft > 0) {
            timerRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [pairingData, secondsLeft > 0]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deviceName.trim()) return;

        setIsGenerating(true);
        try {
            const { data } = await api.post('/tokens/pairing-code', { name: deviceName.trim() });
            setPairingData(data.data);
            setSecondsLeft(data.data.expires_in_seconds);
            toast.success(t('Pairing code generated'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('Failed to generate pairing code'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setDeviceName('');
        setPairingData(null);
        setSecondsLeft(0);
        onClose();
    };

    if (!isOpen) return null;

    const isExpired = pairingData && secondsLeft === 0;
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={handleClose}
                />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {t('Pair a device')}
                    </h3>

                    {!pairingData ? (
                        <form onSubmit={handleGenerate}>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                                {t('Enter a name for this device')}
                            </p>
                            <input
                                type="text"
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                                placeholder={t('e.g. Kobo Libra, Kindle')}
                                className="w-full px-3 py-2 mb-4 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                autoFocus
                                required
                            />
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={handleClose}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" isLoading={isGenerating}>
                                    {t('Generate')}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                                {t('Enter this code on your e-reader')}
                            </p>

                            {/* Code display */}
                            <div className="flex justify-center mb-4">
                                <div className="flex gap-2">
                                    {pairingData.code.split('').map((digit, i) => (
                                        <div
                                            key={i}
                                            className={`w-12 h-14 flex items-center justify-center rounded-lg text-2xl font-mono font-bold border-2 ${
                                                isExpired
                                                    ? 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                                                    : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                            }`}
                                        >
                                            {digit}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timer / Expired */}
                            <div className="text-center mb-4">
                                {isExpired ? (
                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                        {t('Code expired')}
                                    </span>
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-slate-400">
                                        {t('Code expires in')}{' '}
                                        <span className="font-mono font-medium text-gray-700 dark:text-slate-300">
                                            {minutes}:{seconds.toString().padStart(2, '0')}
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Progress bar */}
                            {!isExpired && (
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1 mb-4">
                                    <div
                                        className="bg-indigo-500 h-1 rounded-full transition-all duration-1000"
                                        style={{ width: `${(secondsLeft / 120) * 100}%` }}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button variant="secondary" onClick={handleClose}>
                                    {t('Close')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
