# Rafael Garcez | Cloud Security & Cybersecurity Portfolio

Um portfolio tecnico com identidade de console, foco em Cloud Security, Blue Team e operacoes criticas.  
Deploy estatico via GitHub Pages, com i18n PT-BR/EN, badges e vault de certificados.

## Acesso rapido

- Site: https://Garcez7R.github.io/portfolio/
- Idiomas: PT-BR e EN (detectar automaticamente + toggle manual)
- Conteudo dinamico: badges, vault e projetos via JSON/Markdown locais

---

# Estrutura (PT-BR)

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

## Como funciona

- `badges.md` e a fonte principal para credenciais e badges.
- O vault de certificados le PDFs reais em `assets/docs/certificates/`.
- O site detecta o idioma do navegador e permite alternancia manual.
- O splash aparece apenas na primeira visita da sessao.

## O que personalizar

- Substitua as imagens em `assets/img/badges/` pelas badges reais.
- Adicione seus PDFs em `assets/docs/certificates/`.
- Atualize os CVs em `assets/docs/cv.pdf` e `assets/docs/cv-en.pdf`.
- Ajuste textos e labels em `locale/pt.json` e `locale/en.json`.
- Atualize o `og-cover.svg` caso queira outro visual de preview.

## Preview local

O site usa `fetch()` para ler `badges.md` e os arquivos de idioma.  
Use um servidor local em vez de abrir o HTML direto:

```bash
python3 -m http.server 8000
```

ou

```bash
npx serve .
```

## Deploy no GitHub Pages

1. Faça push para o GitHub.
2. Settings → Pages.
3. Deploy from a branch.
4. Branch `main` + `/ (root)`.
5. Aguarde a publicacao.

URL esperada:

```text
https://Garcez7R.github.io/portfolio/
```

Se quiser a URL `https://Garcez7R.github.io`, o repo precisa se chamar `Garcez7R.github.io`.

---

# Overview (EN)

Technical portfolio with a security-console identity, focused on Cloud Security, Blue Team and critical operations.  
Static deployment via GitHub Pages, PT-BR/EN i18n, badges and certificate vault.

## Quick access

- Live site: https://Garcez7R.github.io/portfolio/
- Languages: PT-BR and EN (auto-detect + manual toggle)
- Dynamic content: badges, vault and projects from local Markdown/JSON

## How it works

- `badges.md` is the single source of truth for credentials.
- The vault reads PDF files from `assets/docs/certificates/`.
- The UI detects browser language and allows manual switching.
- The splash appears only on the first session visit.

## What to personalize

- Replace badge images inside `assets/img/badges/`.
- Add real PDFs under `assets/docs/certificates/`.
- Update CV files in `assets/docs/cv.pdf` and `assets/docs/cv-en.pdf`.
- Edit labels/content in `locale/pt.json` and `locale/en.json`.
- Replace `og-cover.svg` if you want a different social preview.

## Local preview

Because `fetch()` reads local assets, run a local server:

```bash
python3 -m http.server 8000
```

or

```bash
npx serve .
```

## Deploy to GitHub Pages

1. Push this repository.
2. Settings → Pages.
3. Deploy from a branch.
4. Branch `main` + `/ (root)`.
5. Wait for the build to publish.

Expected URL:

```text
https://Garcez7R.github.io/portfolio/
```

If you want `https://Garcez7R.github.io`, rename the repo to `Garcez7R.github.io`.
