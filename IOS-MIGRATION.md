# ChoreMax iOS (Capacitor) Migration Notes

## What changed

### Backend (`backend/`)

**`auth.py`** - `get_current_user()` now accepts an `Authorization: Bearer <token>` header in addition to the existing `access_token` cookie. Bearer takes priority. Cookie auth continues to work unchanged for web.

**`routers/auth.py`** - Login and register responses now include a `token` field in the JSON body. Web ignores it; the iOS app stores it in localStorage for subsequent requests.

**`config.py`** - `frontend_origins` always includes `capacitor://localhost` so CORS allows requests from the iOS app.

**`routers/calendar.py`** - Google OAuth flow now supports a `platform` query param (`web` or `ios`). On iOS, the OAuth callback redirects to `choremax://parent/calendar?...` instead of the web origin. The `state` parameter encodes `user_id|platform`.

### Frontend (`frontend/`)

**`src/api/client.js`** - Detects Capacitor via `window.Capacitor.isNativePlatform()`. On native:
- Uses absolute API URL (`VITE_API_BASE` env var, default `https://choremax.bltbox.com/api`)
- Stores JWT from login/register in localStorage, sends as `Authorization: Bearer` header
- Skips `credentials: 'include'` (no cookies needed)
- Image upload also sends Bearer token

**`src/App.jsx`** - Added `DeepLinkListener` component that uses `@capacitor/app` to catch `choremax://` URL opens and navigate to the correct route (used for Google OAuth return).

**`src/pages/ManageCalendar.jsx`** - Google OAuth button opens URL in system browser on iOS (`window.open(url, '_system')`) so the `choremax://` redirect can bring the user back to the app.

**`capacitor.config.ts`** - App config: `com.bltbox.choremax`, webDir `dist`, iOS scheme `choremax`.

**`ios/App/App/Info.plist`** - Registered `choremax://` URL scheme via `CFBundleURLTypes`.

### No breaking changes to web

All changes are additive. The web app continues to use cookie auth, relative `/api` URLs, and the existing OAuth redirect flow. The `token` field in login/register responses is simply ignored by the web frontend.

## Build workflow

```bash
cd frontend

# 1. Install dependencies (first time only)
npm install

# 2. Build the React app
npm run build

# 3. Sync to iOS project
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

In Xcode: select a simulator or device, then press Run (Cmd+R).

### Live reload during development

```bash
# Start Vite dev server (accessible on network)
npm run dev

# In capacitor.config.ts, temporarily add:
# server: { url: 'http://YOUR_LOCAL_IP:3000' }

# Then sync and run in Xcode
npx cap sync ios
```

Remove the `server.url` override before building for TestFlight.

### TestFlight build

1. Open `ios/App/App.xcodeproj` in Xcode
2. Set your Team under Signing & Capabilities (requires Apple Developer account)
3. Set version/build number
4. Product > Archive
5. Distribute App > App Store Connect > Upload
6. In App Store Connect, add the build to a TestFlight group

## Environment variables

| Variable | Web | iOS app |
|---|---|---|
| `VITE_API_BASE` | Not needed (uses `/api`) | Set before build, e.g. `https://choremax.bltbox.com/api` (or uses this as default) |
| `FRONTEND_ORIGIN` (backend) | `https://choremax.bltbox.com` | No change needed; `capacitor://localhost` auto-added to CORS |

## Test checklist

### Auth (simulator + device)
- [ ] Register new account - user created, stays logged in
- [ ] Close and reopen app - session persists (token in localStorage)
- [ ] Login with existing account
- [ ] Logout - returns to login screen, reopening app does not restore session
- [ ] Expired/invalid token - redirects to login

### Core screens
- [ ] Family daily view loads with children and chores
- [ ] Child hub - tap avatar, see daily/weekly chores
- [ ] Complete a chore - animation plays, completion recorded
- [ ] Parent area - PIN gate works, can manage chores/children/goals
- [ ] Dashboard and stats load correctly

### Meals & lists
- [ ] Meal plan calendar renders, drag-and-drop works on touch
- [ ] Upload meal image (from photo picker)
- [ ] Shopping list loads and checkboxes work
- [ ] Todo list CRUD works

### Calendar & Google OAuth
- [ ] Connect Google Calendar - opens system browser
- [ ] Complete Google auth - redirected back to app via `choremax://`
- [ ] App navigates to calendar page with pending connection
- [ ] Select calendars and sync works
- [ ] Create/edit/delete calendar events

### iOS-specific
- [ ] Safe area insets look correct (notch, home indicator)
- [ ] Keyboard doesn't obscure input fields
- [ ] Back navigation works (swipe gesture)
- [ ] App works on both iPhone and iPad orientations
- [ ] No console errors about CORS or mixed content

### Web regression
- [ ] Web app still works unchanged (cookie auth, relative URLs)
- [ ] Google OAuth flow still works on web
- [ ] No new console warnings
