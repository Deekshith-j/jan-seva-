import { supabase } from '@/integrations/supabase/client';

export interface VoiceCommandResponse {
    query: string;
    response: string;
    action: {
        type: 'NAVIGATE' | 'FILL_FORM' | 'CLICK';
        payload: any;
    } | null;
}

export class VoiceProcessor {
    static async processAudioBlob(audioBlob: Blob, language: string): Promise<VoiceCommandResponse> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                try {
                    const base64String = reader.result as string;
                    // Remove data URL prefix (e.g., "data:audio/webm;base64,")
                    const base64Audio = base64String.split(',')[1];

                    // Get current page to send as context
                    const currentPage = window.location.pathname;

                    const { data, error } = await supabase.functions.invoke('handle-voice-query', {
                        body: {
                            audio: base64Audio,
                            language,
                            context: { page: currentPage }
                        }
                    });

                    if (error) throw error;
                    resolve(data as VoiceCommandResponse);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
        });
    }
}
