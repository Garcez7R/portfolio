# Portfolio Tech Pro

Technical portfolio focused on certifications, cloud, security, infrastructure and a clean GitHub Pages deployment.

## Structure

```text
/
├── index.html
├── README.md
├── badges.md
├── /assets
│   ├── /css
│   ├── /js
│   ├── /img
│   │   └── badges/
│   └── /docs
│       └── certificates/
└── /locale
    ├── en.json
    └── pt.json
```

## How it works

- `badges.md` is the single source of truth for certifications.
- The interface auto-detects browser language and supports a manual `PT | EN` switch.
- The splash screen appears only on the first visit and stays in English by design.
- The site is static and ready for GitHub Pages.

## Content you should personalize

- Replace placeholder badge art in `assets/img/badges/`.
- Add your real PDFs inside `assets/docs/certificates/`.
- Update LinkedIn, email and CV link placeholders.
- Replace sample projects and skill wording as needed.
- If desired, add a custom `assets/img/og-cover.png` for social previews.

## Local preview

Because the project uses `fetch()` for `badges.md` and locale files, preview it from a local server instead of opening `index.html` directly in the browser.

Examples:

```bash
python3 -m http.server 8000
```

or

```bash
npx serve .
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Open repository `Settings`.
3. Go to `Pages`.
4. Set `Deploy from a branch`.
5. Choose `main` and `/ (root)`.
6. Save and wait for the site to publish.

Expected URL:

```text
https://Garcez7R.github.io/portfolio/
```

If you want the final URL to be exactly `https://Garcez7R.github.io`, the repository must be named `Garcez7R.github.io` instead of `portfolio`.
