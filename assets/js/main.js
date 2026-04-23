const STORAGE_KEYS = {
  language: "portfolio-language",
  splashSeen: "portfolio-splash-seen-session",
};

const DEFAULT_BADGE_IMAGE = "./assets/img/badges/placeholder-badge.svg";
const CERTIFICATE_INDEX = "./assets/docs/certificates/index.json";
const CATEGORY_ORDER = ["Cloud", "Security", "Infrastructure", "DevOps", "Networking", "Linux", "Other"];

let currentLocale = {};
let currentLanguage = "en";
let badgeRecords = [];
let certificateRecords = [];
let selectedBadgeFilter = "All";
let badgesExpanded = false;
let vaultExpanded = false;
let vaultSearchTerm = "";

const ui = {
  splash: document.getElementById("splash"),
  heroPillars: document.getElementById("hero-pillars"),
  skillsGrid: document.getElementById("skills-grid"),
  coreBadgeGrid: document.getElementById("core-badge-grid"),
  credentialsMorePrompt: document.querySelector(".credentials-more__prompt"),
  credentialsMoreContent: document.getElementById("credentials-more-content"),
  badgeGrid: document.getElementById("badge-grid"),
  badgeFilters: document.getElementById("badge-filters"),
  badgeToggle: document.getElementById("badge-toggle"),
  vaultFeatured: document.getElementById("vault-featured"),
  vaultMorePrompt: document.getElementById("vault-more-prompt"),
  vaultMoreContent: document.getElementById("vault-more-content"),
  vaultGroups: document.getElementById("vault-groups"),
  vaultToggle: document.getElementById("vault-toggle"),
  vaultSearch: document.getElementById("vault-search"),
  projectGrid: document.getElementById("project-grid"),
  communityGrid: document.getElementById("community-grid"),
  certMetrics: document.getElementById("cert-metrics"),
  certMetricsNote: document.getElementById("cert-metrics-note"),
  skillsMetrics: document.getElementById("skills-metrics"),
  contactGrid: document.getElementById("contact-grid"),
  heroTickerTrack: document.getElementById("hero-ticker-track"),
  heroCvLink: document.getElementById("hero-cv-link"),
  sidebarCvLink: document.getElementById("sidebar-cv-link"),
  langButtons: document.querySelectorAll("[data-lang-btn]"),
  navLinks: document.querySelectorAll(".topnav a"),
};

const normalizeCategory = (value) => {
  const map = {
    infrastructure: "Infrastructure",
    infra: "Infrastructure",
    cloud: "Cloud",
    security: "Security",
    devops: "DevOps",
    networking: "Networking",
    linux: "Linux",
    other: "Other",
  };

  return map[value.trim().toLowerCase()] || value.trim();
};

const getCategoryLabel = (category) => currentLocale.categories?.[category] || category;

const buildCertificateUrl = (filePath) => {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return encodeURI(`./assets/docs/certificates/${filePath}`);
};


const getCategoryPriority = (category) => {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
};

const scoreBadge = (badge) => {
  let score = 0;
  const name = badge.name.toLowerCase();

  if (name.includes("aws certified cloud practitioner")) score += 1000;
  if (name.includes("cyberops associate")) score += 120;
  if (name.includes("oracle cloud infrastructure 2025 certified foundations associate")) score -= 24;
  score += (CATEGORY_ORDER.length - getCategoryPriority(badge.category)) * 10;
  if (name.includes("certified")) score += 28;
  if (name.includes("associate") || name.includes("professional")) score += 18;
  if (name.includes("aws") || name.includes("oracle") || name.includes("google") || name.includes("isc2")) score += 16;
  if (name.includes("lead auditor") || name.includes("cyberops") || name.includes("ccna")) score += 14;
  if (name.includes("candidate")) score += 8;
  if (name.includes("introduction") || name.includes("fundamentals")) score -= 8;

  return score;
};

const createBadgeMark = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");

const createBadgeVisual = (badge, className) => {
  const imageSrc = badge.badgeUrl || DEFAULT_BADGE_IMAGE;
  const isPlaceholder = imageSrc === DEFAULT_BADGE_IMAGE;
  const badgeMark = createBadgeMark(badge.name);

  return `
    <div class="${className} ${isPlaceholder ? "is-placeholder" : ""}">
      ${
        isPlaceholder
          ? `<div class="badge-card__mark" aria-hidden="true">${badgeMark}</div>`
          : `<img src="${imageSrc}" alt="" loading="lazy" onerror="this.onerror=null; this.parentElement.classList.add('is-placeholder'); this.parentElement.innerHTML='<div class=&quot;badge-card__mark&quot; aria-hidden=&quot;true&quot;>${badgeMark}</div>';" />`
      }
    </div>
  `;
};

const detectLanguage = () => {
  const saved = localStorage.getItem(STORAGE_KEYS.language);
  if (saved === "pt" || saved === "en") {
    return saved;
  }

  return navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
};

const loadLocale = async (language) => {
  const response = await fetch(`./locale/${language}.json`);

  if (!response.ok) {
    throw new Error(`Could not load locale ${language}`);
  }

  return response.json();
};

const loadBadges = async () => {
  const response = await fetch("./badges.md?v=20260331-real-badges");

  if (!response.ok) {
    throw new Error("Could not load badges.md");
  }

  const markdown = await response.text();
  return parseBadgeMarkdown(markdown);
};

const loadCertificates = async () => {
  const response = await fetch(`${CERTIFICATE_INDEX}?v=20260406`);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || [];

  return items
    .map((item) => {
      const name = item.title || item.name;
      const issuer = item.issuer || "";
      const category = normalizeCategory(item.category || "Other");
      const certificateUrl = buildCertificateUrl(item.file || item.url);
      const badgeUrl = item.badgeUrl || "";

      if (!name || !certificateUrl) return null;

      return {
        name,
        issuer,
        category,
        certificateUrl,
        badgeUrl,
      };
    })
    .filter(Boolean);
};

const parseBadgeMarkdown = (markdown) => {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Name |"))
    .map((line) => {
      const [, name, category, badgeUrl, certificateUrl] = line.split("|").map((cell) => cell.trim());
      return {
        name,
        category: normalizeCategory(category),
        badgeUrl: badgeUrl || DEFAULT_BADGE_IMAGE,
        certificateUrl: certificateUrl || "#",
      };
    })
    .filter((item) => item.name);
};

const applyI18n = () => {
  document.documentElement.lang = currentLanguage === "pt" ? "pt-BR" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const path = node.dataset.i18n;
    const value = path.split(".").reduce((acc, part) => acc?.[part], currentLocale);
    if (typeof value === "string") {
      node.textContent = value;
    }
  });

  ui.langButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.langBtn === currentLanguage);
  });

  document.title = currentLocale.seo.title;
  document.querySelector('meta[name="description"]').setAttribute("content", currentLocale.seo.description);
  document.querySelector('meta[property="og:title"]').setAttribute("content", currentLocale.seo.title);
  document.querySelector('meta[property="og:description"]').setAttribute("content", currentLocale.seo.description);
  document.querySelector('meta[name="twitter:title"]').setAttribute("content", currentLocale.seo.title);
  document.querySelector('meta[name="twitter:description"]').setAttribute("content", currentLocale.seo.description);
  ui.vaultSearch.setAttribute("placeholder", currentLocale.vault.searchPlaceholder);
};

const renderSkills = () => {
  ui.skillsGrid.innerHTML = currentLocale.skills.items
    .map(
      (skillGroup) => `
        <article class="skill-card">
          <h3>${skillGroup.title}</h3>
          <p class="skill-card__description">${skillGroup.description}</p>
          <div class="skill-chip-grid">
            ${skillGroup.items
              .map(
                (item) => `
                  <button class="skill-chip" type="button" title="${item.description}" aria-label="${item.name}: ${item.description}">
                    <span class="skill-chip__icon">${item.icon}</span>
                    <span>${item.name}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
};

const renderHeroPillars = () => {
  ui.heroPillars.innerHTML = currentLocale.hero.pillars
    .map(
      (pillar) => `
        <article class="hero-pillar">
          <span class="hero-pillar__icon" aria-hidden="true">${pillar.icon}</span>
          <div>
            <strong>${pillar.title}</strong>
            <p>${pillar.description}</p>
          </div>
        </article>
      `,
    )
    .join("");
};

const buildFilters = () => {
  const categories = [
    "All",
    ...[...new Set(badgeRecords.map((badge) => badge.category))].sort(
      (a, b) => getCategoryPriority(a) - getCategoryPriority(b) || a.localeCompare(b),
    ),
  ];
  ui.badgeFilters.innerHTML = categories
    .map(
      (category, index) => `
        <button type="button" data-filter="${category}" class="${category === selectedBadgeFilter || (index === 0 && !selectedBadgeFilter) ? "is-active" : ""}">
          ${category === "All" ? currentLocale.credentials.filters.all : getCategoryLabel(category)}
        </button>
      `,
    )
    .join("");

  ui.badgeFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      ui.badgeFilters.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      selectedBadgeFilter = button.dataset.filter;
      badgesExpanded = true;
      renderBadges();
    });
  });
  renderHeroTicker();
};

const updateBadgeToggle = (totalItems) => {
  if (totalItems === 0) {
    ui.badgeToggle.hidden = true;
    ui.credentialsMorePrompt.hidden = false;
    ui.credentialsMoreContent.hidden = true;
    return;
  }

  ui.credentialsMorePrompt.hidden = badgesExpanded;
  ui.credentialsMoreContent.hidden = !badgesExpanded;

  if (!badgesExpanded) {
    ui.badgeToggle.hidden = false;
    ui.badgeToggle.textContent = currentLocale.credentials.toggle.open;
    return;
  }

  ui.badgeToggle.hidden = false;
  ui.badgeToggle.textContent = currentLocale.credentials.toggle.less;
};

const renderBadges = () => {
  const allSorted = [...badgeRecords].sort(
    (a, b) => scoreBadge(b) - scoreBadge(a) || a.name.localeCompare(b.name),
  );
  const coreBadges = allSorted.slice(0, 4);
  const coreNames = new Set(coreBadges.map((badge) => badge.name));
  const filtered = selectedBadgeFilter === "All" ? allSorted.filter((badge) => !coreNames.has(badge.name)) : allSorted.filter((badge) => badge.category === selectedBadgeFilter);
  const list = badgesExpanded ? filtered : [];

  ui.coreBadgeGrid.innerHTML = coreBadges
    .map((badge) => {
      return `
        <article class="core-badge-card">
          ${createBadgeVisual(badge, "core-badge-card__visual")}
          <div class="core-badge-card__body">
            <p class="core-badge-card__category">${getCategoryLabel(badge.category)}</p>
            <h3>${badge.name}</h3>
            <a href="${badge.certificateUrl}" target="_blank" rel="noreferrer">${currentLocale.shared.verify}</a>
          </div>
        </article>
      `;
    })
    .join("");

  ui.badgeGrid.innerHTML = list
    .map((badge) => {
      return `
        <article class="badge-card">
          ${createBadgeVisual(badge, "badge-card__visual")}
          <div class="badge-card__body">
            <h3>${badge.name}</h3>
            <p class="badge-card__category">${getCategoryLabel(badge.category)}</p>
          </div>
          <div class="badge-meta">
            <a href="${badge.certificateUrl}" target="_blank" rel="noreferrer">${currentLocale.shared.verify}</a>
          </div>
        </article>
      `;
    })
    .join("");

  updateBadgeToggle(filtered.length);
};

const renderVault = () => {
  const sourceRecords = certificateRecords.length ? certificateRecords : badgeRecords;
  const filtered = sourceRecords
    .filter((badge) => {
      const term = vaultSearchTerm;
      return (
        badge.name.toLowerCase().includes(term) ||
        badge.category.toLowerCase().includes(term) ||
        (badge.issuer || "").toLowerCase().includes(term)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const featured = [...filtered]
    .sort((a, b) => scoreBadge(b) - scoreBadge(a))
    .slice(0, 6);

  const formatVaultMeta = (record) => {
    const issuer = record.issuer || "";
    const category = record.category;

    if (issuer) {
      return `${issuer} · ${getCategoryLabel(category)}`;
    }
    return getCategoryLabel(category);
  };

  const groupedEntries = filtered.reduce((acc, badge) => {
    const key = badge.category;
    acc[key] ||= [];
    acc[key].push(badge);
    return acc;
  }, {});

  ui.vaultFeatured.innerHTML = featured
    .map(
      (badge) => `
        <article class="vault-featured-card">
          ${createBadgeVisual(badge, "vault-badge-thumb")}
          <div class="vault-featured-card__body">
            <span class="vault-featured-card__category">${formatVaultMeta(badge)}</span>
            <strong>${badge.name}</strong>
            <a href="${badge.certificateUrl}" target="_blank" rel="noreferrer">${currentLocale.shared.verify}</a>
          </div>
        </article>
      `,
    )
    .join("");

  if (!filtered.length) {
    ui.vaultFeatured.innerHTML = "";
    ui.vaultMorePrompt.hidden = true;
    ui.vaultMoreContent.hidden = false;
    ui.vaultGroups.innerHTML = `<div class="vault-empty">${currentLocale.vault.noResults}</div>`;
    ui.vaultToggle.hidden = true;
    return;
  }

  const hasArchive = filtered.length > featured.length;
  ui.vaultMorePrompt.hidden = vaultExpanded || !hasArchive;
  ui.vaultMoreContent.hidden = !vaultExpanded;

  ui.vaultGroups.innerHTML = vaultExpanded
    ? Object.entries(groupedEntries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => {
      const orderedItems = [...items].sort((a, b) => scoreBadge(b) - scoreBadge(a) || a.name.localeCompare(b.name));

      return `
        <section class="vault-group">
          <div class="vault-group__header">
            <h3>${getCategoryLabel(category)}</h3>
            <span>${items.length}</span>
          </div>
          <div class="vault-list">
            ${orderedItems
              .map(
                (badge) => `
                  <article class="vault-item">
                    ${createBadgeVisual(badge, "vault-badge-thumb vault-badge-thumb--small")}
                    <div class="vault-item__meta">
                      <span class="vault-item__title">${badge.name}</span>
                      <span class="vault-item__category">${formatVaultMeta(badge)}</span>
                    </div>
                    <a href="${badge.certificateUrl}" target="_blank" rel="noreferrer">${currentLocale.shared.verify}</a>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("")
    : "";

  if (!hasArchive) {
    ui.vaultToggle.hidden = true;
    return;
  }

  ui.vaultToggle.hidden = false;
  ui.vaultToggle.textContent = vaultExpanded ? currentLocale.vault.toggle.less : currentLocale.vault.toggle.open;
};

const renderProjects = () => {
  ui.projectGrid.innerHTML = currentLocale.projects.items
    .map(
      (project) => `
        <article class="project-card">
          <p class="project-card__eyebrow">${project.kind}</p>
          <h3>${project.name}</h3>
          <p>${project.description}</p>
          <div class="project-stack-list">
            ${project.stack.map((item) => `<span class="project-stack-chip">${item}</span>`).join("")}
          </div>
          <div class="project-links project-links--footer">
            <a href="${project.github}" target="_blank" rel="noreferrer">GitHub</a>
            ${project.demo ? `<a href="${project.demo}" target="_blank" rel="noreferrer">${currentLocale.shared.demo}</a>` : ""}
          </div>
        </article>
      `,
    )
    .join("");
};

const renderCommunity = () => {
  if (!ui.communityGrid || !currentLocale.community) return;

  ui.communityGrid.innerHTML = currentLocale.community.items
    .map(
      (item) => `
        <article class="project-card">
          <p class="project-card__eyebrow">${item.tag}</p>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `,
    )
    .join("");
};

const renderMetrics = () => {
  const badgeCounts = badgeRecords.reduce((acc, badge) => {
    acc[badge.category] = (acc[badge.category] || 0) + 1;
    return acc;
  }, {});
  const totalBadges = badgeRecords.length;
  const securityPercent = totalBadges ? Math.round(((badgeCounts.Security || 0) / totalBadges) * 100) : 0;

  const skillCounts = currentLocale.skills.items.reduce((acc, skillGroup) => {
    acc[skillGroup.title] = skillGroup.items.length;
    return acc;
  }, {});

  ui.certMetrics.innerHTML = createMetricRows(badgeCounts);
  ui.certMetricsNote.textContent = currentLocale.metrics.securityFocusNote.replace("{percent}", String(securityPercent));
  ui.skillsMetrics.innerHTML = createMetricRows(skillCounts);
};

const renderHeroTicker = () => {
  if (!ui.heroTickerTrack || !currentLocale.hero?.ticker?.length) return;
  const tickerItems = currentLocale.hero.ticker;
  const buildLine = () =>
    tickerItems
      .map((item) => `<span>${item}</span>`)
      .join('<span class="hero__ticker-sep">•</span>');
  ui.heroTickerTrack.innerHTML = `${buildLine()}<span class="hero__ticker-sep">•</span>${buildLine()}`;
};

const createMetricRows = (entriesObject) => {
  const entries = Object.entries(entriesObject);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return entries
    .map(
      ([label, value]) => {
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const displayLabel = getCategoryLabel(label);
        return `
        <div class="metric-row metric-row--${slug}">
          <div class="metric-label"><span>${displayLabel}</span><span>${value}</span></div>
          <div class="metric-bar"><span data-width="${(value / max) * 100}%"></span></div>
        </div>
      `;
      },
    )
    .join("");
};

const animateMetricBars = () => {
  document.querySelectorAll(".metric-bar span").forEach((bar, index) => {
    const targetWidth = bar.dataset.width || "0%";
    bar.style.transitionDelay = `${index * 240}ms`;
    requestAnimationFrame(() => {
      bar.style.width = targetWidth;
    });
  });
};

const resetMetricBars = () => {
  document.querySelectorAll(".metric-bar span").forEach((bar) => {
    bar.style.transitionDelay = "0ms";
    bar.style.width = "0%";
  });
};

const getContactIcon = (label) => {
  const normalized = label.trim().toLowerCase();
  const icons = {
    github: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.21-3.37-1.21-.45-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.67.35-1.11.64-1.36-2.22-.26-4.55-1.14-4.55-5.08 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.31 9.31 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.71 1.03 1.62 1.03 2.74 0 3.95-2.33 4.81-4.56 5.07.36.31.68.91.68 1.84 0 1.33-.01 2.4-.01 2.73 0 .27.18.6.69.49A10.27 10.27 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" fill="currentColor"/>
      </svg>
    `,
    linkedin: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6.94 8.5H3.56V20h3.38V8.5Zm.22-3.55c0-1.01-.74-1.8-1.9-1.8-1.15 0-1.9.79-1.9 1.8 0 .99.73 1.8 1.86 1.8h.02c1.18 0 1.92-.81 1.92-1.8ZM20.44 13.14C20.44 9.62 18.6 8 16.15 8c-1.97 0-2.85 1.12-3.35 1.9V8.5H9.42c.04.92 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.12-.93.27-.68.88-1.38 1.91-1.38 1.35 0 1.89 1.05 1.89 2.58V20h3.38v-6.86Z" fill="currentColor"/>
      </svg>
    `,
    credly: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2.5 4.75 6.7v10.6L12 21.5l7.25-4.2V6.7L12 2.5Zm0 1.73 5.75 3.33L12 10.9 6.25 7.56 12 4.23Zm-6 4.63 5.25 3.05v6.1L6 14.96V8.86Zm6.75 9.15v-6.1L18 8.86v6.1l-5.25 3.05Z" fill="currentColor"/>
      </svg>
    `,
    email: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Zm1.75-.25a.25.25 0 0 0-.16.44l6.67 5.38a1.2 1.2 0 0 0 1.48 0l6.67-5.38a.25.25 0 0 0-.16-.44H4.75Zm14.75 2.04-5.82 4.69a2.7 2.7 0 0 1-3.36 0L4.5 8.54v8.71c0 .14.11.25.25.25h14.5c.14 0 .25-.11.25-.25V8.54Z" fill="currentColor"/>
      </svg>
    `,
    cv: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.75 3A1.75 1.75 0 0 0 6 4.75v14.5C6 20.22 6.78 21 7.75 21h8.5A1.75 1.75 0 0 0 18 19.25V8.56a1.75 1.75 0 0 0-.5-1.22l-3.84-3.84A1.75 1.75 0 0 0 12.44 3H7.75Zm4.5 1.5v3.25c0 .97.78 1.75 1.75 1.75h2.5v9.75a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25V4.75c0-.14.11-.25.25-.25h4.5Zm1.5.31 2.44 2.44H14a.25.25 0 0 1-.25-.25V4.81ZM9 12.25c0-.41.34-.75.75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm0 3c0-.41.34-.75.75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 9 15.25Z" fill="currentColor"/>
      </svg>
    `,
  };

  return icons[normalized] || icons.cv;
};

const renderContacts = () => {
  ui.contactGrid.innerHTML = currentLocale.contact.items
    .map(
      (item) => `
        <article class="contact-card">
          <div class="contact-card__head">
            <span class="contact-card__icon" aria-hidden="true">${getContactIcon(item.label)}</span>
            <span class="contact-card__label">${item.label}</span>
          </div>
          <a href="${item.href}" target="_blank" rel="noreferrer">${item.value}</a>
        </article>
      `,
    )
    .join("");
};

const syncCvLinks = () => {
  const cvHref = currentLanguage === "en" ? "./assets/docs/cv-en.pdf" : "./assets/docs/cv.pdf";

  if (ui.heroCvLink) {
    ui.heroCvLink.href = cvHref;
  }

  if (ui.sidebarCvLink) {
    ui.sidebarCvLink.href = cvHref;
  }
};

const maybeHideSplash = () => {
  if (sessionStorage.getItem(STORAGE_KEYS.splashSeen)) {
    ui.splash.classList.add("is-hidden");
    return;
  }

  window.setTimeout(() => {
    ui.splash.classList.add("is-hidden");
    sessionStorage.setItem(STORAGE_KEYS.splashSeen, "true");
  }, 3000);
};

const setLanguage = async (language) => {
  currentLanguage = language;
  localStorage.setItem(STORAGE_KEYS.language, language);
  currentLocale = await loadLocale(language);
  applyI18n();
  renderHeroPillars();
  renderSkills();
  buildFilters();
  renderBadges();
  renderVault();
  renderProjects();
  renderCommunity();
  renderMetrics();
  renderContacts();
  syncCvLinks();
};

const bindEvents = () => {
  ui.langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.langBtn);
    });
  });

  ui.badgeToggle.addEventListener("click", () => {
    badgesExpanded = !badgesExpanded;
    renderBadges();
  });

  ui.vaultToggle.addEventListener("click", () => {
    vaultExpanded = !vaultExpanded;
    renderVault();
  });

  ui.vaultSearch.addEventListener("input", (event) => {
    vaultSearchTerm = event.target.value.trim().toLowerCase();
    renderVault();
  });
};

const syncExpandablePanels = (activeSection) => {
  const activeId = activeSection?.id || "";

  if (badgesExpanded && activeId !== "credentials") {
    badgesExpanded = false;
    renderBadges();
  }

  if (vaultExpanded && activeId !== "vault") {
    vaultExpanded = false;
    renderVault();
  }
};

const bindSectionSpy = () => {
  if (!ui.navLinks.length || !("IntersectionObserver" in window)) {
    return;
  }

  const sectionMap = new Map(
    [...ui.navLinks]
      .map((link) => {
        const id = link.getAttribute("href");
        if (!id?.startsWith("#")) return null;
        const section = document.querySelector(id);
        return section ? [section, link] : null;
      })
      .filter(Boolean),
  );

  const setCurrentLink = (activeSection) => {
    ui.navLinks.forEach((link) => {
      link.classList.toggle("is-current", sectionMap.get(activeSection) === link);
    });
    syncExpandablePanels(activeSection);
  };

  const contactSection = document.getElementById("contact");
  const metricsSection = document.getElementById("metrics");
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) {
        setCurrentLink(visible.target);
      }
    },
    {
      rootMargin: "-18% 0px -52% 0px",
      threshold: [0.2, 0.4, 0.65],
    },
  );

  sectionMap.forEach((_, section) => observer.observe(section));

  const initialSection =
    [...sectionMap.keys()].find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= window.innerHeight * 0.35 && rect.bottom > window.innerHeight * 0.35;
    }) || [...sectionMap.keys()][0];

  if (initialSection) {
    setCurrentLink(initialSection);
  }

  const syncContactAtPageEnd = () => {
    if (!contactSection) return;
    const scrollBottom = window.scrollY + window.innerHeight;
    const pageBottom = document.documentElement.scrollHeight;

    if (pageBottom - scrollBottom <= 32) {
      setCurrentLink(contactSection);
    }
  };

  window.addEventListener("scroll", syncContactAtPageEnd, { passive: true });
  window.addEventListener("resize", syncContactAtPageEnd);
  syncContactAtPageEnd();

  if (metricsSection) {
    const metricObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            resetMetricBars();
            requestAnimationFrame(() => {
              animateMetricBars();
            });
            return;
          }

          resetMetricBars();
        });
      },
      {
        rootMargin: "-10% 0px -20% 0px",
        threshold: 0.2,
      },
    );

    metricObserver.observe(metricsSection);
  }
};

const initialize = async () => {
  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    badgeRecords = await loadBadges();
    certificateRecords = await loadCertificates();
    selectedBadgeFilter = "All";
    vaultSearchTerm = "";
    await setLanguage(detectLanguage());
    renderHeroTicker();
    bindEvents();
    bindSectionSpy();
    maybeHideSplash();
  } catch (error) {
    console.error(error);
  }
};

initialize();
