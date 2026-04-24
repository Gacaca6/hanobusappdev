# HanoBus — Testing Strategy

HanoBus is a hackathon-stage product. Our testing strategy mixes **manual exploratory testing on real devices** with **automated type-checks and linting**. We prioritise the fast feedback that catches the bugs commuters would actually hit, and defer heavy unit-test infrastructure until the product surface stabilises.

## 1. What We Test and How

| Area                     | Approach                                        | Frequency                      |
|--------------------------|-------------------------------------------------|--------------------------------|
| Type correctness         | `tsc --noEmit` via `npm run typecheck`          | Every commit (CI)              |
| Code style               | ESLint + Prettier (`npm run lint`, `npm run format`) | Every commit (CI)         |
| Routes, stops, map UI    | Manual exploratory on Chrome + Android + iOS    | Before every merge to `main`   |
| Firestore security rules | `@firebase/rules-unit-testing` against emulator | When rules change              |
| Arrival-time logic       | Scripted simulation via `src/services/busSimulation.ts` | When logic changes     |
| i18n completeness        | Key-diff script across `src/i18n/*.ts`          | Before every release           |
| Offline mode             | Manual: DevTools → "Offline" + airplane mode    | Before every release           |
| Push notifications       | Manual: admin broadcast → verify on 2 devices   | Before every release           |

## 2. Manual Testing Checklist

Run through this before tagging a release.

### Core flows
- [ ] App loads at `/` and shows the map centered on Kigali
- [ ] Location prompt appears; granting it centres the map on the user
- [ ] Denying location still shows the map (fallback centre)
- [ ] Bottom navigation switches between Home, Routes, Alerts, Favorites, Profile
- [ ] Tapping a route on the map opens the route detail sheet without navigating away
- [ ] Route detail shows the polyline, ordered stops, and live bus markers
- [ ] Favoriting a stop/route persists across reloads

### GPS accuracy
- [ ] Bus markers update smoothly (no teleporting) when simulated GPS moves
- [ ] Stale buses (> 60 s since `lastUpdated`) show as greyed-out / offline
- [ ] Buses on overlapping route segments do **not** visually merge or duplicate

### Offline mode
- [ ] With DevTools **Offline** toggled, map tiles previously viewed still render
- [ ] Last-seen bus positions remain visible (from Firestore cache)
- [ ] A banner (`OfflineIndicator`) appears signalling offline status
- [ ] Favoriting works offline and syncs when reconnected

### Multi-language
- [ ] Language switcher in Profile changes UI to Kinyarwanda
- [ ] Same for French and English
- [ ] No untranslated keys appear (search for `[missing]` in console)
- [ ] Stop names and landmarks use the right language where provided

### Authentication
- [ ] Email/password sign-up works and creates a `/users/{uid}` document
- [ ] Google Sign-In works on web
- [ ] Signing out clears session and returns to login
- [ ] Clear, localised error messages for bad credentials and network failures

### Notifications
- [ ] Granting notification permission registers an FCM token on the user document
- [ ] Admin broadcasts an alert → devices on the affected route receive a push within 30 s
- [ ] Tapping the push deep-links into the alert detail

### Performance
- [ ] Time-to-interactive < 3 s on a mid-range Android over 4G
- [ ] Map pan and zoom stay above 50 fps with 20 live buses on screen
- [ ] No memory leaks after 10 minutes of idle map view (DevTools → Memory)

## 3. Devices Tested On

| Device                       | OS                 | Browser              | Result |
|------------------------------|--------------------|----------------------|--------|
| Samsung Galaxy A14           | Android 14         | Chrome 131           | ✅     |
| Tecno Spark 10               | Android 13         | Chrome 130           | ✅     |
| iPhone 12                    | iOS 17.4           | Safari 17            | ✅     |
| iPhone SE (2020)             | iOS 16.7           | Safari 16            | ✅     |
| Desktop                      | Windows 11         | Chrome 131           | ✅     |
| Desktop                      | Windows 11         | Edge 131             | ✅     |
| Desktop                      | macOS 14           | Safari 17            | ✅     |

> Update this table with your own results before each release.

## 4. Known Limitations

- **GPS accuracy depends on bus hardware.** We smooth the feed but cannot correct for a device that consistently reports positions off the road.
- **iOS web push requires iOS 16.4+** and the app to be installed to the home screen.
- **Background location** is not yet available in the PWA — the app only tracks the commuter's location while foregrounded.
- **Offline map tiles** only cover areas the user has previously viewed. There is no bulk "download map for offline" yet.
- **Admin panel** has no role-scoped UI yet — any `role: 'admin'` user sees everything.
- **No automated end-to-end tests.** Playwright/Cypress coverage is on the roadmap.

## 5. Running Automated Tests

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Format check (does not modify files)
npx prettier --check .
```

A unit test runner (Vitest) is on the roadmap. When added, the command will be `npm test`.

In CI (`.github/workflows/ci.yml`), these run automatically on every push and pull request.

## 6. Reporting a Bug

Found an issue? Open one using the [bug report template](../.github/ISSUE_TEMPLATE/bug_report.md). Include the device, browser, steps to reproduce, and a screenshot if possible.
