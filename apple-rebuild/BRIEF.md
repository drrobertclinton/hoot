# Shared brief for every rebuilt app

Context: Apple rejected this app under Guideline 4.3(a) Spam because it was built on the same shell as five sibling apps (same layout, tab bar, cards, palette, code) by the same developer (Vilasi, Inc.). The owner, Robert, is angry and wants a genuinely unique, high-quality app. You are building a NEW app from scratch.

Hard rules
- Write ONLY inside your own folder: /home/user/hoot/apple-rebuild/<slug>/. Do not read or copy other apps' folders under apple-rebuild/ or planned-apps/ (no shared code, CSS, fonts, icons or layout).
- No bottom tab bar unless your plan says so. Use the navigation model, look and signature features given in your task. Do not use the fonts Manrope or Inter, and no generic "card list + tab bar" app shell.
- Output: www/index.html plus whatever .js/.css/.svg it needs, all local (no CDN, no network at runtime; fonts must be system fonts or bundled). It must run offline from file:// and inside Capacitor (iOS WKWebView). Data in localStorage under a key prefix unique to the app. Safe-area insets (env(safe-area-inset-*)), 100dvh, touch targets >= 44px, works 375px to 1024px wide, respects prefers-reduced-motion.
- Quality bar: this must feel like a polished, App-Store-worthy native app, not a web page. Real depth: every screen works, no "coming soon", no lorem ipsum, no dead buttons. Ship meaningful starter content (seed data the user can delete). Delightful micro-interactions. Original SVG icon art (app icon 1024x1024 as www/icon.svg).
- Privacy: no accounts, no analytics, no trackers, data stays on device. Include a Settings/About area with privacy note, export (JSON download) and delete-all.
- Outbound shopping links (if any) open external sites; no in-app purchases.
- Test it yourself with Playwright (pre-installed: require('playwright'), chromium.launch()) at 390x844: click through every screen, check the console has no errors, and save screenshots to /home/user/hoot/apple-rebuild/<slug>/screenshots/ (deviceScaleFactor 2), at least 5 showing the signature features.
- Also write /home/user/hoot/apple-rebuild/<slug>/REVIEW-NOTE.md: 120-200 words for Apple App Review explaining what this app does and the specific features that make it unlike any other app from this developer. Plain, factual.
- Do not git commit or push; the lead will. Do not contact any external service.
- Final report (under 200 words): what you built, the signature features, file list, any known gaps.
