export enum VoiceIntent {
    NAVIGATE = 'NAVIGATE',
    BOOK_TOKEN = 'BOOK_TOKEN',
    CHECK_STATUS = 'CHECK_STATUS',
    UNKNOWN = 'UNKNOWN',
}

export interface VoiceCommand {
    intent: VoiceIntent;
    payload?: any;
    confidence: number;
}

export const KEYWORDS = {
    [VoiceIntent.NAVIGATE]: ['go to', 'open', 'show', 'navigate'],
    [VoiceIntent.BOOK_TOKEN]: ['book', 'schedule', 'appointment', 'token'],
    [VoiceIntent.CHECK_STATUS]: ['status', 'check', 'where is', 'track'],
};

export const ROUTES_MAP: Record<string, string> = {
    'dashboard': '/citizen/dashboard',
    'home': '/citizen/dashboard',
    'book': '/citizen/book-token',
    'tokens': '/citizen/my-tokens',
    'my tokens': '/citizen/my-tokens',
    'assistant': '/citizen/assistant',
    'help': '/citizen/assistant',
    'notifications': '/citizen/notifications',
};
