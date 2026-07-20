# Component Tree

## Routing

Hash-based routing with React Router 7:

| Route | Page | Auth Required |
|-------|------|---------------|
| `/login` | LoginPage | No |
| `/reset-password` | ResetPasswordPage | No |
| `/` | App (layout) | Yes |
| `/` (index) | PresetList | Yes |
| `/preset/:id` | PresetEditPage | Yes |
| `/settings` | SettingsPage | Yes |
| `/logs` | LogsPage (debug only) | Yes |
| `/account` | AccountPage | Yes |

## Component Hierarchy

```
<StrictMode>
  <AuthProvider>                            ← Supabase auth context
    <RouterProvider>                        ← HashRouter
      <LoginPage />                         ← /login
      <ResetPasswordPage />                 ← /reset-password
      <RequireAuth>                         ← Route guard → /login
        <App>                               ← / (root layout)
          <QueryClientProvider>             ← TanStack React Query
            <TooltipProvider>
              <AudioPlayer />               ← Hidden <audio> element
              <Sidebar />                   ← Nav + connection status + user
              <Outlet>
                <PresetList />              ← / (index)
                <PresetEditPage>            ← /preset/:id
                  <PresetForm>
                    <Tabs>
                      <GeneralTab />        ← Name, speaking rate
                      <VoiceOverridesTab /> ← Character → voice mappings
                        <OverrideRow />     ← Individual override row
                      <LexiconTab />        ← Term → pronunciation replacements
                    </Tabs>
                  </PresetForm>
                </PresetEditPage>
                <SettingsPage />            ← /settings
                <RequireDebug>
                  <LogsPage />              ← /logs
                </RequireDebug>
                <AccountPage />             ← /account
              </Outlet>
            </TooltipProvider>
          </QueryClientProvider>
        </App>
      </RequireAuth>
    </RouterProvider>
    <PolicyAcceptanceDialog />              ← Modal overlay
  </AuthProvider>
</StrictMode>
```

## Key Components

- **Sidebar**: Navigation links, connection indicator (connected/connecting/disconnected), user info, system tray icon integration
- **PresetList**: Grid of saved presets, active preset selector, create/delete actions
- **PresetForm**: Tabbed form for editing a preset's general settings, voice overrides, and lexicon
- **AudioPlayer**: Hidden component managing TTS audio streaming and playback via `MediaSource` + `AudioContext`
- **PolicyAcceptanceDialog**: Enforces TOS/Privacy policy acceptance before app use
- **LoginPage**: Email/password login, signup, social auth buttons (Google, Discord, Twitch)