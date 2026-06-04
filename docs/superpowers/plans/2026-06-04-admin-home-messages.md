# Admin Home Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build editable admin-managed home messages, including payment and install info, with internal notifications on published changes.

**Architecture:** Add a dedicated Supabase table, small pure helpers for message classification/notification text, a client admin page for CRUD, and server rendering in `/porra` for published pinned messages. Reuse the existing notifications table and navbar unread badge.

**Tech Stack:** Next.js App Router, Supabase, TypeScript, React, Tailwind, node:test.

---

### Task 1: Data Model

**Files:**
- Create: `supabase/migrations/020_home_messages.sql`
- Modify: `src/lib/supabase/mock/data.ts`

- [ ] Add `home_messages` table with RLS policies for published reads and admin writes.
- [ ] Seed `payment-info` and `install-info`.
- [ ] Add `admin_update` to the admin notification insert policy.
- [ ] Add mock rows so local mock mode has editable default messages.

### Task 2: Pure Helpers

**Files:**
- Create: `src/lib/home-messages/messages.ts`
- Create: `src/lib/home-messages/messages.test.ts`
- Modify: `src/lib/notifications/internal.ts`
- Modify: `src/lib/notifications/internal.test.ts`

- [ ] Write failing tests for special-message classification and notification summaries.
- [ ] Implement helper types and functions.
- [ ] Extend `NotificationType` to keep `admin_update` supported by new messaging flow.
- [ ] Run focused tests.

### Task 3: Admin UI

**Files:**
- Modify: `src/components/layout/admin-shell.tsx`
- Create: `src/app/(admin)/admin/mensajes/page.tsx`

- [ ] Add "Mensajes" to admin navigation.
- [ ] Build admin page that lists existing messages.
- [ ] Add create form and inline editing controls.
- [ ] Save changes to Supabase.
- [ ] On create/edit of a published message, insert internal notifications for all profiles.

### Task 4: Home Rendering

**Files:**
- Modify: `src/app/(app)/porra/page.tsx`

- [ ] Load published pinned home messages.
- [ ] Render messages above progress/payment/install notices.
- [ ] Replace payment hardcoded notice when `payment-info` exists.
- [ ] Replace install hardcoded notice when `install-info` exists.
- [ ] Keep existing payment and install fallbacks when no published editable message exists.

### Task 5: Verification

**Files:**
- Existing app and tests.

- [ ] Run helper tests.
- [ ] Run TypeScript check.
- [ ] Run lint or record existing lint limitation.
- [ ] Start dev server and inspect `/porra` plus `/admin/mensajes` if possible.
