import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Mic, MicOff, Loader2, Bot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat, useVoiceQuery } from '@/hooks/useAI';
import { ChatMessage } from '@/services/ai';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ChatbotWidget: React.FC = () => {
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: language === 'mr' ? 'नमस्कार! मी जनसेवा AI सहाय्यक आहे. मी तुम्हाला कशी मदत करू शकतो?' : 'Hello! I am JanSeva AI Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const chatMutation = useChat();
    const voiceMutation = useVoiceQuery();

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        try {
            // Optimistic update or waiting state could be added here
            const response = await chatMutation.mutateAsync({
                messages: [...messages, userMsg], // Send context
                language
            });

            // Handle standard response
            // The useChat hook now returns { reply: string }
            const reply = response.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

        } catch (error: any) {
            console.error(error);
            const errorMessage = error.message || error.toString() || "Unknown error";
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}. Please try again.` }]);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                handleVoiceQuery(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleVoiceQuery = async (audioBlob: Blob) => {
        const userMsg: ChatMessage = { role: 'user', content: '🎤 Audio Query...' };
        setMessages(prev => [...prev, userMsg]);

        try {
            const data: any = await voiceMutation.mutateAsync({ audioBlob, language });

            // Update the placeholder with actual transcribed text
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = `🎤 ${data.query}`;
                return newMsgs;
            });

            // Add response
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process the audio." }]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
            {isOpen && (
                <Card className="w-[350px] h-[500px] shadow-2xl animate-in slide-in-from-bottom-10 fade-in flex flex-col border-primary/20">
                    <CardHeader className="p-4 bg-primary text-primary-foreground rounded-t-xl flex flex-row justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full">
                                <span className="text-xl">🤖</span>
                            </div>
                            <div>
                                <CardTitle className="text-base">JanSeva Assistant</CardTitle>
                                <p className="text-xs opacity-90 text-primary-foreground/80">
                                    {language === 'mr' ? 'शासकीय सेवांबाबत विचारा' : 'Ask about services'}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/20 text-primary-foreground" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/30">
                        <div className="absolute inset-0 overflow-y-auto p-4 space-y-4" ref={scrollAreaRef}>
                            {messages.map((msg, i) => (
                                <div key={i} className={cn(
                                    "flex w-full mb-4",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}>
                                    <div className={cn(
                                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-background border border-border rounded-bl-none"
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {(chatMutation.isPending || voiceMutation.isPending) && (
                                <div className="flex justify-start">
                                    <div className="bg-background border border-border rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-3 bg-background border-t">
                        <form
                            className="flex w-full items-center gap-2"
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        >
                            <Button
                                type="button"
                                size="icon"
                                variant={isRecording ? "destructive" : "outline"}
                                className="shrink-0 rounded-full"
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                            >
                                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>

                            <Input
                                placeholder={language === 'mr' ? 'येथे टाईप करा...' : 'Type a message...'}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="flex-1 rounded-full bg-muted/50 focus:bg-background"
                            />

                            <Button type="button" onClick={handleSend} size="icon" className="shrink-0 rounded-full" disabled={!input.trim() || chatMutation.isPending}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {!isOpen && (
                <div className="absolute right-16 bottom-16 bg-background px-3 py-2 rounded-xl shadow-lg border animate-fade-in flex items-center gap-2 whitespace-nowrap">
                    <span className="text-sm font-medium">{language === 'mr' ? 'मी मदत करू?' : 'May I help you?'}</span>
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[8px] border-l-background border-b-[6px] border-b-transparent absolute -right-2 top-1/2 -translate-y-1/2" />
                </div>
            )}

            <Button
                size="lg"
                className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-violet-600 to-indigo-600 border-2 border-white/20 hover:scale-110 transition-transform overflow-hidden p-0"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <X className="h-6 w-6 text-white" />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-white text-2xl">
                        {/* Avatar Figure */}
                        🤖
                    </div>
                )}
            </Button>
        </div>
    );
};

export default ChatbotWidget;
