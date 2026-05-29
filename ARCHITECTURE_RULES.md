# What The Prompt - Architecture Rules

## Tech Stack
* Next.js App Router
* TypeScript (`.tsx` for components, `.ts` for utils/services)
* Tailwind CSS
* Supabase (Database + Realtime State)

## Strict Rules
* **No WebSockets/Socket.io:** Use basic HTTP polling (every 1-2 seconds) against Supabase.
* **No Redux:** Use standard React `useState` and `useEffect`.
* **Client Components:** Place `'use client'` at the very top of any file using React hooks or browser APIs (`localStorage`).
* **Modular Logic:** Components handle UI ONLY. Services (`/services`) handle API/DB calls. Utils (`/utils`) handle pure logic.

## Specific Implementations
* **API Security:** The `/api/generate/route.ts` file MUST execute the Pollinations fetch server-side using `POLLINATIONS_API_KEY` from `.env.local` to bypass rate limits.
* **Image Quality:** The fetch to Pollinations MUST hardcode `width=1024`, `height=1024`, and `nologo=true`. Do NOT use the turbo model.
* **Scoring Engine:** Use pure array intersection (`indexOf` + `splice` on a copied array) to handle duplicate words accurately. Return an array of objects for the UI: `[{word: "dog", matched: true}]`.
* **MVP Scope:** No auth, no chat, no reconnect logic. If a host leaves, the game breaking is acceptable. Keep the UI clean, dark-themed, and minimal.