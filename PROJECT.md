# HanoBus — Project Overview

> 🇷🇼 A real-time public-transport tracking app for Kigali.
> One page. Everything a visitor, judge, or new contributor needs to understand the project.

## What HanoBus Is

**HanoBus** is a Progressive Web App that turns Kigali's public bus network into a real-time, searchable, multi-language service. Commuters open HanoBus and immediately see every bus on a live map, know exactly when the next bus will arrive at their stop, plan the best route between any two points, and get push notifications the moment a delay or disruption hits their line — all in **Kinyarwanda, French, or English**.

Under the hood, HanoBus is a modern web app (**Vite + React + TypeScript**) backed by **Firebase** (Firestore for real-time sync, Auth for sign-in, Cloud Functions for server logic, FCM for push notifications). It installs to the home screen on Android and iOS, works offline for the areas you've already seen, and runs on any phone built in the last five years. No app-store download, no heavy install, no friction.

## The Problem

Public transport in Kigali moves hundreds of thousands of people every day, but information about it is almost invisible:

- **No live arrival times.** Commuters guess. A 5-minute wait and a 35-minute wait feel identical from the stop.
- **No visible map of the network.** If you don't already know a route, you ask a stranger. For newcomers, students, and visitors, this is a real barrier.
- **Delays and disruptions are invisible.** A road closure at Sonatubes can strand thousands of commuters who only find out when their bus doesn't come.
- **Information is monolingual and fragmented** across operators, stops, and word-of-mouth. There is no single source of truth.
- **Multi-language support is non-existent** — even though Rwanda is officially trilingual.

The cost is measured in millions of wasted commuter-hours per year, missed appointments, abandoned trips, and a transport system that feels more chaotic than it actually is.

## How It Works — A Commuter's Journey

1. **Open the app.** HanoBus loads in under 3 seconds on a mid-range Android over 4G. The map centres on Kigali (or on you, if you grant location).
2. **See live buses.** Every active bus is a marker on the map, moving in real time as its GPS device updates its position every 10 seconds.
3. **Pick a route.** Tap a route on the map or browse the Routes page. The route's polyline and stops appear without navigating away — the map stays where you left it.
4. **Track arrival.** For each upstream stop, HanoBus shows a live ETA that recalculates as the bus moves. No more guessing.
5. **Board the bus.** When your bus pulls up, you already know which one it is — the marker on your screen matches the vehicle in front of you.
6. **Stay informed.** If a delay or disruption hits your route, HanoBus sends a push notification in your chosen language — before you even step out the door.

## Technical Highlights

- **Real-time sync with sub-second latency.** Firestore's listeners push bus positions to the client over a persistent channel. No polling, no stale data.
- **Offline-first.** The PWA caches the app shell, last-known bus positions, and static route data. Core features work without a connection — writes queue and replay on reconnect.
- **Cross-platform without three codebases.** One React codebase runs on Android, iOS, and desktop. Installs to the home screen like a native app.
- **Trilingual from day one.** Every user-facing string lives in `src/i18n/` with dictionaries for **Kinyarwanda, French, and English**. Adding a fourth language is a pull request, not a refactor.
- **Horizontal scalability by default.** Firebase autoscales reads, writes, and function invocations transparently. The same architecture that serves 100 commuters serves 100,000.
- **Privacy-minimal by design.** We track buses, not users. The commuter's location is used only to centre the map and never leaves the device.

## Impact Potential

Kigali has an estimated **1.3+ million residents** and growing, with public transport serving **hundreds of thousands of daily commuters** — students, office workers, traders, and families. Even a modest 5-minute reduction in average waiting time per commuter, across 200,000 daily trips, is **over 16,000 commuter-hours saved per day** — the equivalent of giving the city back 6 million productive hours per year.

Beyond time savings, HanoBus has second-order impact:

- **Confidence for new city residents and visitors** who currently avoid buses because the system is opaque.
- **Ridership data** for city planners — aggregate, anonymised journey patterns can inform route planning, frequency changes, and new infrastructure.
- **Operator accountability** — real-time position data makes it visible when a route is underserved.
- **A template for other African cities** with similar informal public-transport networks: Kampala, Dar es Salaam, Nairobi, Lagos.

## Team

| Name                 | Role            | Focus                                            |
|----------------------|-----------------|--------------------------------------------------|
| **Gacaca Godwin**    | Lead Developer  | Architecture, Firebase, real-time map pipeline   |
| **Uwase Furaha**     | Developer       | UI, routes/stops, internationalisation            |
| **Nyiramugisha Safi**| Developer       | Auth, notifications, testing                     |

## Current Status

**Stage:** Working prototype — deployed and live.

### What works today
- ✅ Live bus positions on an interactive map
- ✅ Route browsing, route detail, and stop-level views
- ✅ ETA calculation from live positions
- ✅ Email/password and Google Sign-In
- ✅ Kinyarwanda / French / English UI
- ✅ Favourites (stops and routes)
- ✅ Alerts page
- ✅ Offline app-shell caching
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Firestore security rules locked down

### What's next
- 🔜 Bulk "download map for offline" for commuters in low-coverage areas
- 🔜 Role-scoped admin UI for operators
- 🔜 Push-notification preferences per route
- 🔜 Ridership analytics dashboard for city planners
- 🔜 Historical ETA accuracy tracking
- 🔜 Automated end-to-end tests (Playwright)
- 🔜 Native shell build (Capacitor) for app-store distribution

## Links

- 🌍 **Live demo:** [hano-route-reveal.lovable.app](https://hano-route-reveal.lovable.app/)
- 📖 **Architecture:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- 🔌 **API reference:** [docs/API.md](./docs/API.md)
- 🗄️ **Database schema:** [docs/DATABASE.md](./docs/DATABASE.md)
- 🛠️ **Developer setup:** [docs/SETUP.md](./docs/SETUP.md)
- 🚀 **Deployment:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- 🧪 **Testing:** [docs/TESTING.md](./docs/TESTING.md)
- 🔒 **Security:** [SECURITY.md](./SECURITY.md)
- 🤝 **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- 📝 **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

<div align="center">

Built for the **Tech Builder Program Hackathon 2026** 🇷🇼

Made with ❤️ in Kigali, Rwanda.

</div>
