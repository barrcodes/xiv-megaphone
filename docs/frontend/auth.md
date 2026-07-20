# Authentication

## Provider

Supabase Auth with email/password and social providers.

## Auth Flow

1. `AuthProvider` wraps the entire app and listens to `onAuthStateChange`
2. Unauthenticated users are redirected to `/login` by `RequireAuth` route guard
3. On login, session is persisted in Supabase and stored in the Zustand store
4. `PolicyAcceptanceDialog` checks policy acceptance status via `GET /policies/status` — if the user hasn't accepted the latest TOS/Privacy Policy, a modal blocks further use

## Social Auth

Three providers are configured:

| Provider | Setup |
|----------|-------|
| Google | Google Auth Platform project |
| Discord | Discord OAuth app |
| Twitch | Twitch OAuth app |

Social auth uses the custom protocol `xiv-megaphone://`:
- `xiv-megaphone://auth/callback?code=...` — OAuth code exchange
- `xiv-megaphone://auth/callback#access_token=...&refresh_token=...` — OAuth implicit flow

The Electron main process registers as the default handler for this protocol and forwards callbacks to the renderer via IPC (`authCallback`).

## Deep Link Protocol

The app registers `xiv-megaphone://` as a custom protocol handler during installation. Handles:
- `auth/callback` — OAuth flow completion
- `checkout/success` — payment provider checkout success
- `checkout/cancel` — payment provider checkout cancellation

## Password Flow

- **Signup**: Email/password with strength validation (`use-password-validation.ts`)
- **Reset**: Email-based password reset via Supabase, rendered in a dedicated page
- **Email templates**: Custom HTML templates in `svc/backend/supabase/templates/`