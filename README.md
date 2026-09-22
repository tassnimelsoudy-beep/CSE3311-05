# CSE3311-05
CSE 3311 Group 5 

## Running the app

1. Create a `.env` file next to `package.json` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISH_KEY`.
2. `npm install`
3. `npm run dev`, then open the local address it prints.

## Running tests

`npm test` runs every test once (Vitest). `npm run test:watch` re-runs them as files change.

Tests live in `src/tests/` and never contact the real database; Supabase is replaced with a fake (`src/tests/fakeSupabase.js`).

| File | What it covers |
| --- | --- |
| `rotationLogic.test.js` | Who goes next, wrapping around, due-date math (including month ends) |
| `rotationService.test.js` | Advancing a turn and saving it; advancing only when overdue |
| `dataServices.test.js` | Rejecting blank names; saving resources; reading a resource's members |
| `authService.test.js` | Sign-up sends the user's name; readable login/sign-up errors |
| `avatar.test.js` | Initials and which name is displayed |
| `screens.test.jsx` | Sign-up form requires a name; login screen vs. home page |
