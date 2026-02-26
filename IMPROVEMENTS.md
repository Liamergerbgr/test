# RenewalScan AI — Improvement Backlog

Generated during automated planning session. Review with Claude Code before starting next session.

---

## Already Done This Session (Feb 2026)

- ✅ Comparison result viewer — click "View" on any history row to re-open the full result
- ✅ Full comparison result stored in localStorage (result JSON + email HTML)
- ✅ History cap changed from 50 → 20 records (safer localStorage usage)
- ✅ Privacy Policy page
- ✅ Terms of Service page
- ✅ Support & FAQ page
- ✅ Footer on Dashboard, Compare, and Viewer pages with trust links
- ✅ Signup page — Terms + Privacy consent link
- ✅ XSS fix — all API data fields sanitized before rendering into DOM
- ✅ Percentage change displayed in premium totals (e.g., "18% increase")
- ✅ Dashboard empty state — styled with CTA button instead of plain text
- ✅ Usage limit warning — bar turns red at 90%, with upgrade message at 100%

---

## Critical Fixes Needed

### 1. Plaintext passwords in localStorage — SECURITY
- **Where**: `savePassword()` in the password manager section
- **Issue**: PDF passwords are stored as plaintext strings in `localStorage`. Anyone with device access can read them.
- **Fix**: Remove password storage entirely, or hash/encrypt with the user's UID before storing. Simplest fix: warn users that passwords are stored locally and give them an option to not save.

### 2. Print/PDF output styling
- **Where**: `doPrintPdf()` function
- **Issue**: Opens `htmlToCopy` (email HTML) in new window for printing. If the n8n workflow doesn't return fully inline-styled HTML, the print output will be unstyled.
- **Fix**: Either ensure n8n workflow returns inline-styled email HTML, or build a print-specific HTML template client-side from the result data.

### 3. localStorage quota warning
- **Where**: `saveRenewalRecord()` function
- **Issue**: Each comparison result stored in localStorage can be 20–80 KB. At 20 records, this could be 1.6 MB+, approaching the 5–10 MB browser limit. No warning shown.
- **Fix**: After saving, check `navigator.storage.estimate()` and show a toast if >80% full.

---

## High Priority Features

### 4. Retry button on comparison failure
- **Where**: Error state in compare page
- **Issue**: If the API call fails, user has to re-upload both PDFs and start over. Very frustrating.
- **Fix**: Save file references before clearing on error. Add "Retry" button that resubmits without re-uploading.

### 5. Notes shown in comparison result
- **Where**: `renderResults()` and `saveRenewalRecord()`
- **Issue**: User types notes, they're sent to AI for context, but they don't appear in the rendered result output.
- **Fix**: Store the notes with the renewal record. Display them at the bottom of the result box as "Broker Notes: [text]".

### 6. Custom branding on output (Pro plan feature)
- **Where**: `renderResults()` and the Pro plan pricing card
- **Issue**: Pro plan promises "Custom branding" but it's not implemented.
- **Fix**: Allow Pro users to set company name, logo URL, and phone number in a settings page. Inject into the comparison output and email HTML.

### 7. Upgrade prompt when approaching limit
- **Where**: Dashboard usage card
- **Issue**: Warning message appears but has no action. Users don't know how to upgrade.
- **Fix**: Add "Upgrade Plan" button/link that opens support contact or a payment page.

---

## Medium Priority Features

### 8. Result sharing — shareable link
- **Issue**: Brokers want to share comparison results with clients without copy/paste to email.
- **Approach**: Generate a one-time shareable URL (hash-based, expiry 7 days). Store result in n8n or a simple storage backend. Render at a public URL.
- **Note**: Requires server-side storage decision (n8n + Google Sheets? Cloudflare KV?).

### 9. Dashboard history table improvements
- **Where**: `loadRenewals()` and the dashboard table HTML
- **Missing**:
  - Premium change summary column (e.g., "+18%") — store this with the record
  - Date filter (dropdown: This Month / Last 3 Months / All Time)
  - Search by client name
  - Export as CSV button

### 10. Two comparison notes template defaults
- **Where**: Notes textarea in compare page
- **Issue**: Brokers type the same notes every time.
- **Fix**: Allow saving up to 3 "quick note templates" that pre-fill the textarea in one click.

### 11. Results accessibility improvements
- **Where**: `renderResults()` — color-coded arrows for increases/decreases
- **Issue**: Red/green arrows are the only signal for direction — fails WCAG for color-blind users.
- **Fix**: Add text labels (e.g., "(+18%)" or "(-12%)") alongside the arrows. Already partially done with pctChange, but item-level changes still need text labels.

### 12. Better mobile experience for dropdowns
- **Where**: Password dropdown and notes dropdown on compare page
- **Issue**: Absolute-positioned dropdowns may overflow on small screens.
- **Fix**: On mobile (max-width: 600px), convert dropdowns to bottom-sheet modals using a simple CSS class toggle.

### 13. Persistent history across devices
- **Where**: `saveRenewalRecord()` / `loadRenewals()`
- **Issue**: History is in localStorage — lost on browser clear, doesn't sync across devices.
- **Fix options** (discuss with team):
  - Option A: Save to n8n webhook → Google Sheets (no new infrastructure)
  - Option B: Save to a Cloudflare D1 database (already on Cloudflare Pages)
  - Option C: Revisit Firestore (already authenticated, already used for usage tracking)
  - **Recommend**: Cloudflare D1 or Google Sheets via n8n — keeps everything in existing stack.

---

## Landing Page Improvements

### 14. Social proof / testimonials section
- **Where**: After the "How it works" section in landing page
- **Missing**: Zero customer quotes, logos, or case studies.
- **Fix**: Add a testimonials section with 2–3 real or placeholder broker quotes. Example: "RenewalScan AI cut my renewal admin time by 75%. I can handle twice as many clients." — Sarah M., Johannesburg Broker.

### 15. Hero copy — benefit-focused rewrite
- **Where**: Hero section (lines 262–286 in original)
- **Current**: "Policy Renewal Comparison in Seconds"
- **Better**: "Stop spending hours on renewal documents. AI comparison in 90 seconds, email-ready in one click."
- **Sub-copy current**: "Upload two PDFs. Get a full premium breakdown instantly. Copy it straight into your client email."
- **Better**: "South African insurance brokers use RenewalScan AI to compare policy renewals 10x faster — and deliver polished, professional breakdowns to clients in minutes."

### 16. FAQ section on landing page
- **Where**: Before the footer on landing page
- **Add questions**:
  - Is my data secure?
  - What file types are supported?
  - How accurate is the AI?
  - Can I cancel anytime?
  - Is this FAIS/POPIA compliant?

### 17. Hero stats — make them meaningful
- **Current**: "~60s", "AI", "100%"
- **Better**: Use real metrics once available (e.g., "500+ practices", "50,000 comparisons", "98% accuracy")
- For now: Change to "90 sec avg.", "Zero manual work", "Email-ready output"

---

## Technical Improvements

### 18. Input validation — check both PDFs before submitting
- **Where**: `runComparison()` error handling
- **Issue**: If both PDFs fail text extraction, only the first failure is shown. User fixes first PDF, tries again, then finds out the second also fails.
- **Fix**: Extract both PDFs in parallel (already done), collect all errors, show them together before submitting to API.

### 19. API timeout handling
- **Where**: `runComparison()` fetch call
- **Issue**: No timeout on the `/api/compare` request. If n8n hangs, the UI hangs indefinitely.
- **Fix**: Add `AbortController` with 180s timeout (matching Cloudflare Pages function timeout). Show clear "Request timed out" message.

### 20. PDF size validation before upload
- **Where**: `onFileSelect()` / `onDrop()` handlers
- **Issue**: Very large PDFs will cause slow extraction and may fail. No validation.
- **Fix**: Check `file.size` before extraction. Warn if > 10MB: "This PDF is large and may take longer to process."

### 21. Network error differentiation
- **Where**: `runComparison()` catch block
- **Issue**: All errors show the same "An unexpected error occurred" message. Network errors vs API errors vs extraction errors look the same.
- **Fix**: Check `err.name === 'TypeError'` for network errors (fetch failed = no internet). Show "Check your internet connection and try again."

---

## Workflow (n8n) Improvements

### 22. Better AI prompting — notes integration
- **Where**: n8n "Call Claude API" node
- **Issue**: Notes sent from frontend should be incorporated meaningfully into the prompt.
- **Check**: Verify the notes appear in the Claude prompt and influence the output.

### 23. Retry logic review
- **Where**: n8n workflow — HTTP Request node calling Claude
- **Current**: 2 retries at 15s intervals
- **Consider**: Add exponential backoff or try alternative model on failure.

### 24. Webhook secret activation — SECURITY
- **Status**: Still pending from previous session
- **Action needed**: Set `N8N_WEBHOOK_SECRET` env var in Cloudflare Pages + validate header in n8n webhook node
- **This prevents unauthorized calls to the webhook from outside the app**

---

## Questions to Discuss

1. **Storage for persistent history**: Which approach — Cloudflare D1, Google Sheets via n8n, or Firestore?
2. **Branding**: Do you have a logo/brand colors to inject into comparison output for Pro plan?
3. **Pricing**: Are the R1,000 / R2,600 / R5,800 prices real? If yes, should we add a payment system?
4. **Domain**: Is there a custom domain for this app, or staying on Cloudflare Pages URL?
5. **Email sending**: Should the app send comparison results directly via email, or always copy/paste?
6. **Multi-user**: Do you need team/multi-user support for practices with multiple advisors?
