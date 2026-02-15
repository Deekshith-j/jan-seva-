import React, { useEffect, useState } from 'react';
import { useVoice } from '@/contexts/VoiceContext';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * VoiceController Component
 * Handles voice interaction, visual feedback, and command processing.
 * Positioned above the Chatbot widget to avoid overlap.
 */
const VoiceController = () => {
    const { isListening, stopListening, startListening, transcript, isSpeaking, speak, isProcessing } = useVoice();
    const [error, setError] = useState<string | null>(null);

    // Check for browser support on mount
    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Voice recording is not supported in this browser.");
        }
    }, []);

    const toggleListening = () => {
        if (error) {
            toast.error(error);
            return;
        }
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        // Positioned at bottom-24 to sit above the chatbot (which is at bottom-6)
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
            <AnimatePresence>
                {(isListening || isProcessing || (transcript && !isSpeaking)) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="bg-background/90 backdrop-blur-md border border-primary/20 p-4 rounded-xl shadow-2xl mb-2 max-w-xs pointer-events-auto relative overflow-hidden"
                    >
                        {/* Pulse/Progress decoration */}
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/10 via-primary to-primary/10 ${isProcessing ? 'animate-progress' : 'animate-pulse'}`} />

                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-full shrink-0">
                                <span className="text-2xl" role="img" aria-label="robot">🤖</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">JanSeva AI</p>
                                <p className="text-sm font-medium text-foreground leading-snug break-words">
                                    {isProcessing ? "Processing..." : (transcript || "Listening...")}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pointer-events-auto relative group">
                {/* Visual Ring Animation when speaking/listening */}
                {(isListening || isSpeaking || isProcessing) && (
                    <span className={`absolute inset-0 rounded-full bg-primary opacity-20 ${isProcessing ? 'animate-pulse' : 'animate-ping'}`}></span>
                )}

                <Button
                    size="icon"
                    className={`h-16 w-16 rounded-full shadow-2xl transition-all duration-300 border-4 relative overflow-hidden ${isListening
                            ? 'bg-gradient-to-br from-red-500 to-pink-600 border-white/30 scale-110'
                            : isProcessing
                                ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-white/30 scale-105'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-700 border-white/20 hover:scale-105'
                        }`}
                    onClick={toggleListening}
                    disabled={isProcessing}
                >
                    {/* Avatar Figure / Icon */}
                    <div className="relative z-10 flex items-center justify-center w-full h-full">
                        {isListening ? (
                            <div className="flex gap-1 items-center justify-center h-6">
                                <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-white rounded-full" />
                                <motion.div animate={{ height: [12, 24, 12] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-white rounded-full" />
                                <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-white rounded-full" />
                            </div>
                        ) : isProcessing ? (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="text-2xl"
                            >
                                ⏳
                            </motion.span>
                        ) : (
                            <span className="text-3xl filter drop-shadow-md transform group-hover:scale-110 transition-transform">🎙️</span>
                        )}
                    </div>
                </Button>

                {/* Error Badge */}
                {error && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                        <AlertCircle className="h-3 w-3" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceController;
