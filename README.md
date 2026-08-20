# MakanMana — campus food discovery for UCSI

Final Year Project, Diploma in Information Technology (CD209), UCSI University.

A mobile application that helps students and lecturers find food around the Taman
Connaught area beside the campus, filtered by budget, cuisine and halal status, with
ratings contributed by the campus community.

## Try it without installing anything

**https://kjt1203.github.io/makanmana/**

This is the same code as in this archive, exported for the web. It runs on any phone or
computer with a browser. Create an account, or sign in with an existing one, to see the
community ratings.

## Running the source

Requires Node.js 20 or later.

```
npm install
npx expo start --web --port 8082
```

Then open http://localhost:8082.

The application targets Android through React Native and Expo; the browser preview was
used for development and testing, and both run from this single codebase (NFR8).

## What is where

| Path | Contents |
|---|---|
| `App.tsx` | The application: data, screens, filtering, reviews, quick find, booking, translations |
| `supabase.ts` | Client for the hosted back end |
| `supabase-schema.sql` | Database schema and the row-level security policies |
| `theme.ts` | Design tokens — every colour and dimension used in the interface |
| `design.md` | The design system the interface follows |
| `scripts/` | One-off data scripts used to build the restaurant dataset |
| `assets/` | Application icons |

## A note on the back end

Accounts, reviews, favourites and bookings are held in a hosted Postgres database with an
authentication service in front of it. The key in `supabase.ts` is the publishable key and
is intended to appear in client code: access is enforced by the row-level security policies
in `supabase-schema.sql`, not by the client. A user can read only their own favourites and
bookings, whatever the application asks for. Reviews are the deliberate exception, since
the community rating depends on every user being able to read them.

The secret key is not in this archive and must never be.

## A note on the data

Thirty-one real restaurants are recorded. Fields that could not be verified are stored as
null and displayed as "not confirmed" rather than guessed — this matters most for halal
status, where an invented value would mislead the users who depend on it. Halal status is
therefore asserted for only four restaurants, each on the basis of public certification or
the business's own registered name.
