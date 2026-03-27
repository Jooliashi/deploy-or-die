# Deploy or Die

Browser game scaffold for a multiplayer software deploy party game.

## Stack

- `Next.js` for the app shell, routes, and station UI
- `React` for the first-pass local mini-games
- `TypeScript` for shared game state modeling
- `Jazz` planned for realtime room sync
- `Phaser` optional later if specific mini-games outgrow React

## What is included

- landing page with project framing
- demo lobby flow
- room route: `/room/[roomCode]`
- typed role/prompt/deploy models
- mock multiplayer adapter that acts like a replaceable Jazz seam
- three MVP role stations:
  - frontend
  - backend
  - infra
- placeholder local mini-game panel for each role

## Recommended next steps

1. Install dependencies with `pnpm install`.
2. Replace `lib/multiplayer/mock-adapter.ts` with a Jazz room schema and presence model.
3. Split prompts into server-authoritative state and client-local mini-game state.
4. Decide which mini-games deserve Phaser instead of React.
5. Add actual room creation, joining, and role assignment flows.

## File map

- `app/page.tsx`: home and lobby shell
- `app/room/[roomCode]/page.tsx`: room entry
- `components/room-client.tsx`: primary station experience
- `components/minigames.tsx`: local mini-game placeholder implementations
- `lib/game/types.ts`: domain types
- `lib/game/data.ts`: demo content
- `lib/multiplayer/mock-adapter.ts`: Jazz replacement seam

## Notes

This repo does **not** include the real Jazz SDK yet because there was no verified local integration example available in the workspace. The scaffold is structured so that replacing the mock adapter is isolated and low-risk.
