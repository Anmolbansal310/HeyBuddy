import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

export type NoteCategory = {
  name: string;
  icon: string;
};

export type NoteMetadata = {
  cleanedText: string;
  categories: NoteCategory[];
  tags: string[];
  topics: string[];
  entities: string[];
};

const AVAILABLE_ICONS = [
  'cart-outline', 'bag-handle-outline', 'briefcase-outline', 'heart-outline',
  'airplane-outline', 'diamond-outline', 'bulb-outline', 'restaurant-outline',
  'home-outline', 'people-outline', 'book-outline', 'fitness-outline',
  'car-outline', 'cash-outline', 'phone-portrait-outline', 'camera-outline',
  'musical-notes-outline', 'game-controller-outline', 'school-outline',
  'medkit-outline', 'paw-outline', 'leaf-outline', 'construct-outline',
  'calendar-outline', 'star-outline', 'newspaper-outline', 'barbell-outline',
  'wallet-outline', 'gift-outline', 'film-outline', 'bicycle-outline',
  'pizza-outline', 'bed-outline', 'code-slash-outline', 'document-text-outline',
  'flask-outline', 'globe-outline', 'receipt-outline', 'shirt-outline',
];

export async function processNote(text: string, source: 'voice' | 'text' = 'voice'): Promise<NoteMetadata> {
  const cleanedTextInstruction = source === 'voice'
    ? `- "cleanedText": polish the transcription like Wispr — remove filler words (uh, um, like, you know, so, basically) and fix grammar and punctuation, but do NOT rephrase, restructure, or change the speaker's words or sentence structure. The result should sound exactly like the person, just readable. Keep all names, abbreviations, numbers, brands, and technical terms exactly as spoken. If you don't recognise a word, keep it verbatim. Never summarise or rewrite.`
    : `- "cleanedText": return the text exactly as provided, unchanged.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    config: { responseMimeType: 'application/json' },
    contents: `You are processing a note captured on a phone. Return a JSON object with:
${cleanedTextInstruction}
- "categories": array of 1-3 category objects this note belongs to. A note can belong to multiple overlapping categories (e.g. a shopping list could be both "Grocery" and "Shopping"). Each object has:
  - "name": short specific category name (e.g. "Grocery", "Work", "Health", "Wedding", "Travel", "Ideas")
  - "icon": pick the most fitting icon from this list: ${AVAILABLE_ICONS.join(', ')}
- "tags": array of 1-3 short lowercase tags
- "topics": array of 1-3 topic phrases that describe what this note is about. These help with search.
- "entities": array of specific people, places, or things mentioned. Empty array if none.

Note: "${text}"`,
  });

  try {
    const json = JSON.parse(response.text ?? '{}');
    return {
      cleanedText: json.cleanedText ?? text,
      categories: Array.isArray(json.categories) ? json.categories : [],
      tags: json.tags ?? [],
      topics: json.topics ?? [],
      entities: json.entities ?? [],
    };
  } catch {
    return { cleanedText: text, categories: [], tags: [], topics: [], entities: [] };
  }
}
