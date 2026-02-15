import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Check, AlertCircle, Camera } from 'lucide-react';
import { DocumentVerifier, VerificationResult } from '@/services/DocumentVerifier';
import { toast } from 'sonner';

interface DocumentUploaderProps {
    label: string;
    onVerified: (file: File) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ label, onVerified }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        // Create preview
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(null);
        }

        // Verify
        setIsVerifying(true);
        setResult(null);

        try {
            const verificationResult = await DocumentVerifier.verify(selectedFile);
            setResult(verificationResult);

            if (verificationResult.isValid) {
                onVerified(selectedFile);
                toast.success("Document verified successfully!");
            } else {
                toast.error("Document verification failed.");
            }
        } catch (error) {
            toast.error("Error verifying document");
        } finally {
            setIsVerifying(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>

            {!file ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            ) : (
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                            {preview ? (
                                <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded" />
                            ) : (
                                <div className="h-16 w-16 bg-muted flex items-center justify-center rounded">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>

                                {isVerifying && <p className="text-xs text-blue-500 animate-pulse">Verifying...</p>}

                                {!isVerifying && result && (
                                    <div className="flex items-center gap-1 mt-1">
                                        {result.isValid ? (
                                            <span className="text-xs text-green-600 flex items-center gap-1">
                                                <Check className="h-3 w-3" /> Verified
                                            </span>
                                        ) : (
                                            <span className="text-xs text-red-600 flex items-center gap-1">
                                                <X className="h-3 w-3" /> Invalid
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" size="icon" onClick={clearFile}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {result && !result.isValid && (
                            <div className="bg-red-50 p-2 text-xs text-red-600 border-t border-red-100">
                                <p className="font-semibold flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Issues found:
                                </p>
                                <ul className="list-disc list-inside">
                                    {result.issues.map((issue, idx) => (
                                        <li key={idx}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
