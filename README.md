# Sleepr marketing website

Static site for [sleeprapp.org](https://sleeprapp.org) — the marketing page for **Sleepr - AI Sleep Tracker**, a privacy-first iOS sleep tracker.

Built with [Astro](https://astro.build), deployed on Cloudflare Pages.

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
```

## Build

```sh
npm run build    # static output → ./dist
npm run preview  # serve the built site locally
```

## Pages

- `/` — landing page
- `/privacy` — Privacy Policy (canonical URL; the legacy `sleeprapp.github.io/sleepr-webpage` redirects here)
- `/terms` — Terms of Service

## Newsletter signup

The signup form on the landing page POSTs to `functions/api/newsletter.ts` — a Cloudflare Pages Function that proxies to the [Resend](https://resend.com) Contacts API and sends a welcome email.

Required secrets in Cloudflare Pages dashboard:

- `RESEND_API_KEY`
- `RESEND_NEWSLETTER_TOPIC_ID` (currently `76dceb47-5c86-4920-a1e0-9608e2bcaa47`)

## Related

- iOS app source: `~/Developer/Sleeprxcode/Sleepr/`
- App Store: _link pending_
