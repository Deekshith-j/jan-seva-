import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Start of Selection
serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { audio, language, context } = await req.json();
        const currentPage = context?.page || '/';

        if (!audio) {
            throw new Error('No audio data provided');
        }

        // Use the provided key from secrets
        const openAIKey = Deno.env.get('OPENAI_API_KEY');

        if (!openAIKey) {
            throw new Error('Server Configuration Error: Missing OpenAI API Key in Secrets.');
        }

        // 1. Convert Base64 to Blob
        const binaryString = atob(audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const file = new Blob([bytes], { type: "audio/webm" });

        // 2. Prepare FormData for Whisper
        const formData = new FormData();
        formData.append("file", file, "recording.webm");
        formData.append("model", "whisper-1");
        if (language && language !== 'en') {
            formData.append("language", language);
        }

        // 3. Call Whisper API
        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAIKey}`,
            },
            body: formData,
        });

        if (!whisperResponse.ok) {
            const err = await whisperResponse.json();
            console.error('Whisper Error:', err);
            throw new Error(`Whisper API Error: ${err.error?.message}`);
        }

        const whisperData = await whisperResponse.json();
        const transcribedText = whisperData.text;

        console.log("Transcribed Text:", transcribedText);

        // 4. Call Chat API with the transcribed text & Context
        const systemPrompt = `
        You are JanSeva AI, the intelligent voice assistant for the Government of Maharashtra's "SevaPali" portal.
        You have FULL CONTROL over the application. Your goal is to help citizens and officials navigate and execute tasks.
        
        CURRENT CONTEXT:
        - User is on page: "${currentPage}"
        - Language Preference: "${language || 'en'}"

        APP MAP (Known Routes):
        [Citizen]
        - Dashboard: /citizen/dashboard (Overview of tokens & services)
        - Book Token: /citizen/book-token (New appointment)
        - My Tokens: /citizen/my-tokens (Check status/history)
        - AI Advisor: /citizen/advisor (Eligibility check wizard)
        - AI Assistant: /citizen/assistant (General help)
        - Notifications: /citizen/notifications
        - Profile/Settings: /citizen/profile

        [Official]
        - Dashboard: /official/dashboard (Counter overview)
        - Queue Management: /official/queue (Manage active tokens)
        - Live Queue: /official/live-queue
        - Scan QR: /official/scan (Verify citizen token)
        - Analytics: /official/analytics (Reports)
        - Verification: /official/verify/:id

        [General]
        - Home: /
        - Login: /login
        - Register: /register
        - Schemes: /schemes

        AVAILABLE ACTIONS (JSON Format):
        1. NAVIGATE: { type: "NAVIGATE", payload: { path: "/exact/path" } }
           - Use this when the user wants to go somewhere.
        
        2. FILL_FORM: { type: "FILL_FORM", payload: { field: "field_id", value: "inferred_value" } }
           - Use this to fill inputs on the CURRENT page.
           - Inference: If user says "My name is Rahul" and you are on /book-token, infer field "name".

        3. CLICK: { type: "CLICK", payload: { target: "element_id" } }
           - Use strictly for buttons like "submit", "next", "confirm".

        INSTRUCTIONS:
        - Analyze the user's voice command + current page context.
        - Return a JSON object with:
          - "text_response": A helpful, natural response (max 2 sentences). If the user asks a question about the app, answer it based on the App Map.
          - "action": One of the actions above, or null.
          - If the user speaks a local language (Marathi, Hindi, Kannada, Telugu, Tamil), REPLY IN THAT LANGUAGE, but keep "action" fields in English.
          - Be proactive. If on Dashboard and user says "Book token", navigate them.
        `;

        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAIKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 500,
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcribedText }
                ],
            }),
        });

        if (!chatResponse.ok) {
            const err = await chatResponse.json();
            throw new Error(`Chat API Error: ${err.error?.message}`);
        }

        const chatData = await chatResponse.json();
        const rawContent = chatData.choices[0].message.content;
        let pResult;
        try {
            pResult = JSON.parse(rawContent);
        } catch (e) {
            console.error("Failed to parse LLM JSON:", rawContent);
            pResult = { text_response: rawContent, action: null }; // Fallback
        }

        return new Response(JSON.stringify({
            query: transcribedText,
            response: pResult.text_response,
            action: pResult.action
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
