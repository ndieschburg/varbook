import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useUploadBook } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { UploadIcon } from '@/components/icons';

interface BookUploaderProps {
    onUploadComplete?: () => void;
}

export function BookUploader({ onUploadComplete }: BookUploaderProps) {
    const { t } = useTranslation();
    const uploadMutation = useUploadBook();
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const epubFiles = acceptedFiles.filter(file =>
            file.name.toLowerCase().endsWith('.epub')
        );

        if (epubFiles.length === 0) {
            toast.error(t('Only EPUB files are allowed'));
            return;
        }

        for (const file of epubFiles) {
            setUploadingFiles(prev => [...prev, file.name]);

            try {
                await uploadMutation.mutateAsync(file);
                toast.success(`${file.name}: ${t('Upload Successful')}`);
            } catch (error) {
                toast.error(`${file.name}: ${t('Upload Failed')}`);
            } finally {
                setUploadingFiles(prev => prev.filter(name => name !== file.name));
            }
        }

        onUploadComplete?.();
    }, [uploadMutation, t, onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/epub+zip': ['.epub'],
        },
        multiple: true,
    });

    const isUploading = uploadingFiles.length > 0;

    return (
        <div
            {...getRootProps()}
            className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isDragActive
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }
                ${isUploading ? 'opacity-75 pointer-events-none' : ''}
            `}
        >
            <input {...getInputProps()} />

            {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                    <LoadingSpinner size="lg" />
                    <p className="text-gray-700 dark:text-slate-300">{t('Uploading...')}</p>
                    <div className="text-sm text-gray-500 dark:text-slate-500">
                        {uploadingFiles.map(name => (
                            <div key={name}>{name}</div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <UploadIcon className="h-12 w-12 text-gray-400 dark:text-slate-500" />
                    <div>
                        <p className="text-gray-700 dark:text-slate-300 font-medium">
                            {t('Drag & drop EPUB files here')}
                        </p>
                        <p className="text-gray-500 dark:text-slate-500 text-sm mt-1">
                            {t('or click to browse')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
