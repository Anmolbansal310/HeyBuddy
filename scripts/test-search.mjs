import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

const NOTES = [
  // Grocery — some explicit, some implicit
  { id: '1', text: 'Grocery list: apples, bananas, milk, eggs, bread' },
  { id: '2', text: 'Need to pick up groceries this weekend' },
  { id: '3', text: 'Things to buy: olive oil, pasta, tomatoes, garlic' },
  { id: '4', text: 'Running low on coffee and oat milk, need to restock' },
  { id: '5', text: 'Get butter, cheese and yogurt from the store' },

  // Work / meetings
  { id: '6', text: 'Meeting with Rohan tomorrow at 3pm to discuss the project timeline' },
  { id: '7', text: 'Discussed product roadmap with the team, need to prioritize search feature' },
  { id: '8', text: 'Sync with design team on Monday about the new onboarding flow' },
  { id: '9', text: 'Follow up with Priya on the Q3 OKRs' },

  // Health
  { id: '10', text: 'Call the dentist and book an appointment for next week' },
  { id: '11', text: 'Start taking vitamin D supplements every morning' },
  { id: '12', text: 'Back has been hurting, need to see a physiotherapist' },

  // Travel
  { id: '13', text: 'Flight to Delhi on June 15th, PNR number AB1234' },
  { id: '14', text: 'Need to book a hotel in Bangalore for the offsite' },
  { id: '15', text: 'Check visa requirements for the Singapore trip' },

  // Wedding
  { id: '16', text: 'Wedding venue shortlist: The Grand, Bloom Garden, Riverside Hall' },
  { id: '17', text: 'Catering tasting session on Saturday with Meera' },
  { id: '18', text: 'Send invitations to extended family by end of month' },

  // Ideas / random
  { id: '19', text: 'Great idea for the app — add a sharing feature so users can export notes' },
  { id: '20', text: 'Book recommendation: Thinking Fast and Slow by Daniel Kahneman' },
  { id: '21', text: 'Interesting podcast episode about habit formation and dopamine' },
  { id: '22', text: 'Call mom this weekend, she mentioned the house repairs' },
];

const QUERIES = [
  { q: 'grocery', expected: ['1','2','3','4','5'] },
  { q: 'things to buy from the store', expected: ['1','2','3','4','5'] },
  { q: 'work meeting', expected: ['6','7','8','9'] },
  { q: 'health doctor', expected: ['10','11','12'] },
  { q: 'travel trip', expected: ['13','14','15'] },
  { q: 'wedding planning', expected: ['16','17','18'] },
];

async function embedText(text) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  return response.embeddings?.[0]?.values ?? [];
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  console.log('Generating embeddings for all notes...');
  const notesWithEmbeddings = [];
  for (const note of NOTES) {
    const embedding = await embedText(note.text);
    notesWithEmbeddings.push({ ...note, embedding });
    process.stdout.write('.');
  }
  console.log('\n');

  const THRESHOLD = 0.60;
  let totalExpected = 0, totalFound = 0, totalFalsePositives = 0;

  for (const { q, expected } of QUERIES) {
    const queryEmbedding = await embedText(q);
    const results = notesWithEmbeddings
      .map(n => ({ note: n, score: cosineSimilarity(queryEmbedding, n.embedding) }))
      .filter(r => r.score > THRESHOLD)
      .sort((a, b) => b.score - a.score);

    const foundIds = results.map(r => r.note.id);
    const truePositives = foundIds.filter(id => expected.includes(id));
    const falsePositives = foundIds.filter(id => !expected.includes(id));
    const missed = expected.filter(id => !foundIds.includes(id));

    totalExpected += expected.length;
    totalFound += truePositives.length;
    totalFalsePositives += falsePositives.length;

    console.log(`Query: "${q}"`);
    console.log(`  ✓ Found (${truePositives.length}/${expected.length}): ${truePositives.map(id => NOTES.find(n=>n.id===id).text.substring(0,45)).join(' | ')}`);
    if (missed.length) console.log(`  ✗ Missed: ${missed.map(id => NOTES.find(n=>n.id===id).text.substring(0,45)).join(' | ')}`);
    if (falsePositives.length) console.log(`  ⚠ False positives: ${falsePositives.map(id => `${id}(${results.find(r=>r.note.id===id).score.toFixed(2)})`).join(', ')}`);
    console.log();
  }

  const precision = totalFound / (totalFound + totalFalsePositives);
  const recall = totalFound / totalExpected;
  console.log(`\nThreshold: ${THRESHOLD}`);
  console.log(`Precision: ${(precision * 100).toFixed(0)}% (of results shown, how many were correct)`);
  console.log(`Recall:    ${(recall * 100).toFixed(0)}% (of correct notes, how many were found)`);
}

main().catch(console.error);
