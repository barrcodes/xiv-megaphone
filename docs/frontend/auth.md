# Authentication

## Auth Flow

1. `AuthProvider` wraps the application and listens for session changes.
2. Unauthenticated users are redirected to `/login` by the `RequireAuth` route guard.
3. After login, the session is available through the frontend auth context and Zustand state.
4. `PolicyAcceptanceDialog` blocks app use when policy acceptance is required.

## Social Auth

The login page provides Google, Discord, and Twitch sign-in options. Browser-based sign-in returns to the desktop client through the registered deep-link protocol.

## Deep Link Protocol

The app registers `xiv-megaphone://` as a custom protocol handler during installation. The frontend handles:

- `auth/redirect` for authentication completion.
- `checkout/success` for completed checkout flows.
- `checkout/cancel` for cancelled checkout flows.

## Password Flow

- **Signup**: Email/password with strength validation.
- **Reset**: Email-based password reset rendered in a dedicated page.
