# Golden Ladder Group — Member Shares & Loans Management System

A Progressive Web App (PWA) built to digitize Golden Ladder Group's member share
contributions, loans, and interest distribution — replacing the manual
Excel + deposit-slip workflow with an installable, mobile-friendly app.

This is **Phase 1** of a phased build. See "Roadmap" below for what's coming next.

## What's included so far (Phase 1 + Phase 2)

- **Admin accounts** (Chair, Secretary, Treasurer) with shared admin access, and a Settings page to change their own password
- **Member onboarding flow**, matching the group's real process:
  1. An admin creates a member account and is given a Member ID + temporary password
  2. The member logs in with the temporary password and is forced to set their own permanent password
  3. The member fills in their profile (phone, email, next of kin, monthly share pledge)
  4. The account goes into "Pending Approval"
  5. An admin reviews and approves the account
  6. Only then can the member access their personal dashboard
- **Members page** — search by name/ID/username, filter by status, edit a member's details, suspend/reactivate, or delete a member entirely
- **Share contribution grid** — the digital version of the group's monthly
  Shares sheet: admins record each member's monthly contribution (matched
  against the physical deposit slip), with automatic monthly and yearly totals
- **Loans** — full lifecycle:
  - Member requests a loan from their dashboard, or admin records a request directly
  - Admin approves or rejects, sets interest rate and duration when recording
  - Admin marks as disbursed, which auto-calculates the due date
  - Admin records repayments; each repayment is automatically split into principal and interest, and the interest is split 50/50 into a member-interest share and a group-interest share, per the group's rule
  - Due-date reminders appear on both the admin Loans page and the member's own dashboard starting 7 days before the due date (and continue showing if overdue)
  - Loan auto-marks as "Completed" once fully repaid
- **Member dashboard** — share contribution history, monthly pledge comparison, loan request button, and full loan history with live repayment progress
- **Installable PWA** — uses the group's real logo throughout (login screen, headers, app icon, browser favicon, "Add to Home Screen" icon on Android/iOS), in the actual brand colors pulled from the logo (navy blue `#00205B` and gold `#9C6312`)
- **Member profile form matches the group's real Google Form** — phone (WhatsApp), email, monthly share, next of kin, the exact constitution agreement text with an "I Agree" checkbox, a typed signature field, and a note about the MK 3,000 once-off registration fee
- **Error boundary** — if something unexpected breaks in one screen, the user sees a friendly "reload app" message instead of a blank white screen
- **Mobile-friendly admin navigation** — collapses into a hamburger menu on small screens, since admins will likely use this on phones in the field

## What's intentionally NOT in yet (coming later)

- Penalty auto-flagging for late share payments (data model exists, screens don't yet)
- Registration fee tracking (separate fund)
- Proportional group-interest distribution among members (the rule that interest is only distributable once ALL group loans are fully repaid)
- Bank interest/charges tracking and the full financial dashboard
- A real backend + database for multi-device, multi-admin sync (still **local-first** — see "Important Limitation" below)
- Automatic vs. manual handling of partially-repaid loans rolling into a new loan (deferred per your request, to revisit later)

## Important limitation of Phase 1 (please read)

Phase 1 stores all data **locally in the browser** of one device, using a
technology called IndexedDB (via a library called Dexie). This means:

- It works fully offline once loaded — great for testing and demoing
- **But** data does not sync between devices. If the Chair records shares on
  their phone, the Secretary will not see that data on their own phone yet
- Clearing browser data/cache on that device will erase the records

This is by design for Phase 1 — it lets us build and test the real screens
and logic quickly without needing a server. Once the screens are approved,
Phase 3/4 introduces a real backend (Node.js + PostgreSQL, hosted for free on
Render + Supabase) so all admins and members share one live database from
any device.

## Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React + TypeScript | Industry standard, strongly-typed (catches bugs early — important for money calculations) |
| Build tool | Vite | Fast builds, first-class PWA plugin support |
| PWA | vite-plugin-pwa | Auto-generates the offline service worker and install manifest on every build — no hand-maintained PWA files to go stale |
| Styling | Tailwind CSS | Fast, consistent, mobile-friendly UI |
| Local storage (Phase 1) | Dexie (IndexedDB) | Structured local database; data model carries over cleanly to a real backend later |
| Planned backend (later phase) | Node.js + Express + TypeScript | Same language as the frontend — one skill set to maintain |
| Planned database (later phase) | PostgreSQL (via Supabase, free tier) | Reliable, accurate decimal handling for money |
| Planned hosting (later phase) | Vercel (frontend) + Render (backend) | Both have solid free tiers suitable for a group this size |

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (free, LTS version is fine).

```bash
# 1. Install dependencies (only needs to be done once, needs internet)
npm install

# 2. Start the development server
npm run dev

# 3. Open the URL it prints (usually http://localhost:5173) in your browser
```

To install it as an app on a phone or laptop: open the dev URL in Chrome,
then use the browser's "Install app" / "Add to Home Screen" option.

### Default admin login (Phase 1 seed account)

- Username: `chair`
- Password: `GLG-Admin-2026`

**Change this password immediately** — there's no "change admin password"
screen yet in Phase 1, so for now this is noted here as a known follow-up
item before this goes anywhere near real production data.

## Data model (matches the group's Excel logic)

- `Member` — one record per member: identity, profile, status in the
  onboarding pipeline (`invited` → `pending_setup` → `pending_approval` →
  `active`)
- `ShareContribution` — one record per member per month, mirrors the Shares
  sheet grid
- `Loan` / `LoanRepayment` — modeled now in the data layer for Phase 2, with
  the 50/50 interest split (`memberInterestShare` / `groupInterestShare`)
  already represented, even though the loan screens aren't built yet
- `Penalty`, `RegistrationFeePayment` — also modeled now for Phase 3

This means Phase 2/3 work is mostly "build the screen," not "redesign the
data," because the underlying structure was planned around the full system
from the start.

## Project structure

```
src/
  types/        Domain model (Member, Loan, ShareContribution, etc.)
  db/           IndexedDB (Dexie) setup
  utils/        Password hashing, ID generation, seed data
  context/      Authentication/session state
  pages/        Screens (Login, Admin Dashboard, Members, Shares, Member Dashboard)
  components/   Shared UI (AdminLayout)
```

## Roadmap

- **Done — Phase 1** — Member onboarding, share contribution grid, admin/member dashboards
- **Done — Phase 2** — Loan requests, admin approval, disbursement, repayment
  tracking with the 50/50 interest split, due-date reminders
- **Next — Phase 3** — Registration fee fund, penalty auto-flagging, proportional
  group-interest distribution, full financial dashboard
- **Phase 4** — Real backend + database for multi-admin/multi-device sync,
  push notification reminders, production hosting
