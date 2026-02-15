import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { VoiceProcessor } from '@/services/VoiceProcessor';

interface VoiceAction {
    type: 'NAVIGATE' | 'FILL_FORM' | 'CLICK';
    payload: any;
}

interface VoiceContextType {
    isListening: boolean;
    startListening: () => void;
    stopListening: () => void;
    transcript: string;
    isSpeaking: boolean;
    speak: (text: string) => void;
    toggleListening: () => void;
    error: string | null;
    isProcessing: boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { language } = useLanguage();
    const navigate = useNavigate();

    // Switch from SpeechRecognition to MediaRecorder for OpenAI integration
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startListening = async () => {
        setError(null);
        setTranscript('');
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop()); // Stop mic to release resource
                processAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsListening(true);
            toast.info("Listening...");
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone.");
            toast.error("Microphone access denied.");
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        setTranscript("Processing AI...");

        try {
            const data = await VoiceProcessor.processAudioBlob(audioBlob, language);

            console.log("AI Response:", data);

            setTranscript(data.query); // Set transcript to what AI heard
            if (data.response) {
                speak(data.response); // AI speaks back
            }

            if (data.action) {
                handleAction(data.action);
            }

        } catch (err: any) {
            console.error("Voice Processing Error:", err);
            setError(err.message || "Failed to process voice.");
            toast.error("Failed to process command.");
            setTranscript("Error processing...");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAction = (action: VoiceAction) => {
        console.log("Executing Action:", action);

        if (action.type === 'NAVIGATE') {
            if (action.payload?.path) {
                toast.success(`Navigating to ${action.payload.path}`);
                navigate(action.payload.path);
            }
        }
        else if (action.type === 'FILL_FORM') {
            toast.success(`Filling form: ${action.payload.field}`);
            // Dispatch event for components to listen
            const event = new CustomEvent('voice-fill-form', { detail: action.payload });
            window.dispatchEvent(event);
        }
        else if (action.type === 'CLICK') {
            toast.success(`Clicking: ${action.payload.target}`);
            // Simple ID based clicking
            const element = document.getElementById(action.payload.target);
            if (element) {
                element.click();
            }
        }
    };

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'en-US';
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = (e) => {
                console.error("TTS Error:", e);
                setIsSpeaking(false);
            }
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Text-to-Speech not supported.");
        }
    };

    return (
        <VoiceContext.Provider value={{
            isListening,
            startListening,
            stopListening,
            transcript,
            isSpeaking,
            speak,
            toggleListening,
            error,
            isProcessing
        }}>
            {children}
        </VoiceContext.Provider>
    );
};

export const useVoice = () => {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider');
    }
    return context;
};
