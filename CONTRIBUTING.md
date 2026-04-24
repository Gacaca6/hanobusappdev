# Contributing to HanoBus

Thanks for your interest in improving HanoBus! This guide will help you get set up and submit contributions that can be merged smoothly.

## Getting Set Up

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/hanobus.git
   cd hanobus
   ```
3. **Add the upstream remote** so you can keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/<original-org>/hanobus.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Copy the env template** and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
6. **Start the dev server**:
   ```bash
   npm run dev
   ```

## Branch Naming

Create a new branch for every piece of work. Use the following prefixes:

| Prefix      | Used for                                    | Example                        |
|-------------|---------------------------------------------|--------------------------------|
| `feature/`  | New functionality                           | `feature/live-bus-filter`      |
| `fix/`      | Bug fixes                                   | `fix/map-pan-reset`            |
| `docs/`     | Documentation-only changes                  | `docs/update-readme-stack`     |
| `refactor/` | Code restructuring without behavior changes | `refactor/routes-store`        |
| `chore/`    | Tooling, deps, config                       | `chore/bump-vite-6`            |

Keep branch names short, lowercase, and hyphenated.

## Making Changes

1. Sync with `main` before you start:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git checkout -b feature/my-change
   ```
2. Make focused, atomic commits. Prefer several small commits over one large one.
3. Write clear commit messages in the imperative mood:
   ```
   Add delay notification banner on Home
   ```

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/my-change
   ```
2. Open a Pull Request against the `main` branch of the upstream repo.
3. Fill in the PR template completely (description, type, testing, checklist).
4. Link any related issues (`Closes #123`).
5. Be responsive to review comments — we aim to review within a few days.

A PR is ready to merge when:

- All CI checks pass
- At least one maintainer has approved
- The checklist in the PR template is complete

## Code Style

HanoBus uses **ESLint** and **Prettier** to keep style consistent.

- Run `npm run lint` before committing — this also runs TypeScript type checking.
- Run `npm run format` to auto-format with Prettier.

### Guidelines

- Use **TypeScript** for all new code.
- Prefer **functional React components** with hooks.
- Keep components small and focused; extract shared logic into `src/utils` or `src/services`.
- Use **Tailwind utility classes** for styling; avoid inline styles unless dynamic.
- Localize all user-facing strings via `src/i18n` — do not hard-code English text.
- Never commit secrets, API keys, or `.env.local`.
- Remove `console.log` statements before opening a PR.

## Reporting Bugs & Requesting Features

Use the GitHub issue templates:

- 🐛 [Bug report](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 [Feature request](./.github/ISSUE_TEMPLATE/feature_request.md)

## Code of Conduct

Be respectful. Assume good intent. Help others learn. We're a small team building something useful for our city — let's keep it welcoming.

---

Thank you for contributing to HanoBus! 🇷🇼
