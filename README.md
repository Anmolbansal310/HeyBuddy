# HeyBuddy

**A voice-first personal AI assistant that turns everyday thoughts into action.**

Double-tap your phone and say what's on your mind. HeyBuddy interprets the intent, takes the appropriate next steps, and keeps your information organised — from updating a grocery list to researching a gift for your sister's birthday. It handles the preparation for purchases and bookings, leaving the final approval to you.

Its memory connects everyday context to future tasks. Mention a restaurant you like, and it can surface when you later plan a date with your partner. Preferences and past choices inform future assistance, reducing repeated explanation.

**AI capabilities:** intent recognition, structured information extraction, contextual memory, personalised recommendations, and task execution with human approval for purchases and bookings.

**Product thesis:** effortless capture, contextual memory, and proactive assistance can reduce the effort between an intention and its outcome. Success means less work left for the user.

**Evaluation and iteration:** evaluated the pipeline using scenario-based tests, automated outcome checks, and LLM-as-a-judge assessments. Coverage included speech-to-text accuracy, note organisation, folder creation and merging, retrieval relevance, and research quality. Used the results to refine model behaviour and assess whether HeyBuddy completed the intended task.

**Engineering learning:** an early implementation used semantic search at query time, introducing latency, flickering results, and weaker matches than plain text search in my testing. Moving interpretation to capture time — using Gemini to structure incoming notes — made retrieval faster and deterministic. This shaped a core design principle: place AI where interpretation adds value, and keep frequent interactions responsive.

I'm a product manager, not an engineer. I built this using AI as my co-engineer, because I wanted to understand what it actually means to build AI-native products rather than just manage them. What follows is a record of what I learned.

---

## What it does today

Double-tap the back of your phone (Back Tap) and it starts recording immediately. Every note is processed in the background by Gemini: speech is cleaned, categorised, tagged, and made searchable. Zero friction capture — think, speak, done.

Features:
- Voice and text capture triggered instantly via Back Tap
- Wispr-style transcription (fillers removed, grammar fixed, speaker's voice preserved)
- AI-assigned categories with multi-category membership
- Full-text and metadata search via Fuse.js
- Edit, delete, category browsing with icons

Stack: React Native, Expo SDK 54, Gemini 2.5 Flash Lite, AsyncStorage.

---

## Running it

```bash
npm install
cp .env.example .env
npm start
```

You'll need your own Gemini API key — get one free at [Google AI Studio](https://aistudio.google.com/apikey) and put it in `.env`. No key ships with this repo, and the app will refuse to start without one.

Back Tap is an iOS accessibility setting: Settings → Accessibility → Touch → Back Tap → Double Tap → HeyBuddy.

---

## How I built it

I used Claude as my engineering partner throughout. Not as an autocomplete tool — as a collaborator I could reason with. I'd describe what I wanted, push back on its suggestions, ask it to critique its own proposals before implementing, and challenge it when a solution felt wrong even if I couldn't articulate why.

Every architectural decision went through a dialogue. I wasn't accepting the first answer — I was stress-testing it against the product I was trying to build.

---

## What broke, what I learned, and what changed

**Semantic search made the product worse**

The obvious AI-native move for search was embeddings. I built it. Technically impressive, practically awful — partial search terms like "GRO" produced meaningless vectors, and results flickered as Fuse.js answered instantly while the embedding API answered 800ms later, replacing results with emptiness. The product felt broken.

*Learning:* Intelligence at the wrong layer creates worse UX than no intelligence. The right answer was to put intelligence at capture time — have Gemini generate rich structured metadata (categories, topics, entities) when the note is saved, then search that metadata with fast, deterministic Fuse.js. No latency, no flicker, actually more useful.

---

**A silence timer that cut people off mid-thought**

I added a 1.5-second silence timer to auto-stop recording. Standard pattern. It fired constantly during natural speech pauses — inside sentences, not between them. 2 seconds was the same. 3 seconds was the same. There is no correct threshold.

*Learning:* Some UX assumptions from desktop or structured interaction don't transfer to voice. Removed the timer entirely. Manual stop only. Recording became the most reliable part of the app.

---

**Categories that multiplied into noise**

First version: every note gets an AI-assigned category. With 30 notes I had 28 categories — "Grocery list", "Groceries", "Food shopping" as three separate entries. Unusable.

*Learning:* AI generating open-ended labels at the individual item level optimises for specificity, not coherence. The fix was a two-phase design — bootstrap clusters all existing notes into a canonical category set first, then new notes classify against that set. Also moved to multi-category membership: a note about buying apples belongs to both "Grocery" and "Shopping" without creating a hybrid category.

---

**Prompts are product decisions**

The transcription prompt went through three versions. "Rewrite cleanly" — Gemini summarised and removed things users wanted to keep. "Keep everything verbatim" — near-raw transcriptions, unreadable. The right version: "polish like Wispr — remove fillers, fix grammar, but preserve the speaker's exact words and sentence structure."

*Learning:* The language you use in a prompt is the product spec. Abstract quality words ("clean", "concise") give the model latitude to optimise for the wrong thing. Concrete behavioural descriptions ("preserve the speaker's voice") do not. Every prompt iteration changed the user experience more than any UI change.

---

**A crash that looked like a code problem**

After a native crash in the speech recognition module, the app froze on the splash screen on every subsequent launch. No useful crash log, no JS error. I spent time debugging the build, the bundle, code signing. The actual fix: delete and reinstall. The native crash had left the app container in a state iOS wouldn't launch from.

*Learning:* When something breaks in a way that feels like a code problem but the code hasn't changed, the problem is usually state, not code.

---

## The bigger learning

I came into this knowing how to think about products. I left with a much more concrete understanding of where AI makes products genuinely better versus where it creates complexity that looks like value.

The pattern I kept seeing: AI is most powerful when it does the invisible work at the moment of capture — categorising, structuring, enriching — so that everything downstream (search, retrieval, synthesis) can be fast and dumb. When you put AI in the hot path of user interaction, you're betting on latency and reliability you usually don't have.

That's a product principle, not an engineering one. And I wouldn't have found it by reading about AI products — I had to build one and watch it fail the wrong way a few times.

---

## What's next

The legwork layer. Today it remembers and organises; next it does the work. Mention a gift you need to buy and it comes back with options worth considering; mention a haircut and it comes back with times that fit. It asks for what it can't know, confirms what it thinks it knows, and never asks the same thing twice — so it needs you less each time. It stops short of booking or buying: the final call stays with the user.

Capture stays free. The intelligence on top is the paid layer.

---

*Built with Claude (Anthropic) as engineering partner. Gemini 2.5 Flash Lite for note processing.*
