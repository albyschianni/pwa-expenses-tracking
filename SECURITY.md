# Security Documentation — Expense Tracker

## Overview

Expense Tracker is a PWA for personal and shared expense tracking, built with Vue 3 and Supabase. This document describes the security measures in place.

## Data Encryption

### At Rest
- All data is stored in Supabase (PostgreSQL on AWS) with **AES-256 encryption at rest** enabled by default.
- Supabase project is deployed in an **EU region** (eu-central-1) for GDPR compliance.

### In Transit
- All API communication uses **HTTPS/TLS 1.2+**.
- Supabase enforces TLS for all database connections and API endpoints.
- The app enforces HSTS (HTTP Strict Transport Security) with a 2-year max-age.

## Authentication

- Authentication is handled by **Supabase Auth** (email/password + Google OAuth).
- Passwords are never stored in plaintext — Supabase uses **bcrypt** hashing.
- Email confirmation is required for new accounts.
- Password reset is handled via secure email-based recovery tokens.

## Authorization & Row Level Security (RLS)

All database tables have **Row Level Security (RLS)** enabled:

### Personal Data (expenses, recurring_expenses)
- Users can only SELECT/INSERT/UPDATE/DELETE their own records (`user_id = auth.uid()`).

### Categories
- System categories (user_id IS NULL) are visible to all authenticated users.
- Custom categories are only visible/editable by their creator.
- Shared wallet categories are visible to wallet members.

### Shared Wallets
- Wallet data is only accessible to active members.
- Only wallet owners can modify wallet settings and manage members.
- Transaction INSERT requires the user to be an active member.
- Transaction UPDATE/DELETE is restricted to the transaction creator.

### Trigger-based Protection
- Categories with existing transactions cannot be hard-deleted (trigger protection).
- Wallet creators are automatically added as owners (database trigger).

## Service Worker Security

- The PWA service worker (Workbox) only caches **static assets** (JS, CSS, HTML, images).
- Supabase API responses are cached with **NetworkFirst** strategy (24h, max 50 entries) for offline resilience but always prefer fresh data.
- **No sensitive transaction data is persisted in the service worker cache** beyond the Supabase API cache which mirrors what the user already has access to via RLS.

## HTTP Security Headers

The following security headers are set via `vercel.json`:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Content-Security-Policy | Restrictive policy allowing only self, Supabase, and required inline styles |

## Data Residency

- All data is stored in **AWS EU region** (eu-central-1) via Supabase infrastructure.
- No data is transferred outside the EU.

## Third-party Processors

| Processor | Purpose | DPA |
|-----------|---------|-----|
| Supabase (AWS) | Database, Auth, Storage | Available at supabase.com/legal/dpa |
| Vercel | Frontend hosting (static files only) | Available at vercel.com/legal/dpa |

## Privacy & Cookies

- The app does **not** use tracking cookies, analytics, or advertising.
- The only client-side storage used is `localStorage` for user preferences (currency, category order, last seen version).
- No third-party trackers are loaded.

## Vulnerability Reporting

If you discover a security vulnerability, please report it to: **support@expensetracker.app**
