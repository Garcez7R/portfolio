const STORAGE_KEYS = {
  language: "portfolio-language",
  splashSeen: "portfolio-splash-seen-session",
};

const DEFAULT_BADGE_IMAGE = "./assets/img/badges/placeholder-badge.svg";
const BADGES_COLLAPSED_COUNT = 12;
const VAULT_COLLAPSED_COUNT = 8;
const VAULT_GROUP_COLLAPSED_COUNT = 3;
const CATEGORY_ORDER = ["Cloud", "Security", "Infrastructure", "DevOps", "Networking", "Linux", "Other"];

let currentLocale = {};
let currentLanguage = "en";
let badgeRecords = [];
let selectedBadgeFilter = "All";
let badgesExpanded = false;
let vaultExpanded = false;
let vaultSearchTerm = "";

const ui = {
  splash: document.getElementById("splash"),
  skillsGrid: document.getElementById("skills-grid"),
  badgeGrid: document.getElementById("badge-grid"),
  badgeFilters: document.getElementById("badge-filters"),
  badgeToggle: document.getElementById("badge-toggle"),
  vaultFeatured: document.getElementById("vault-featured"),
  vaultGroups: document.getElementById("vault-groups"),
  vaultToggle: document.getElementById("vault-toggle"),
  vaultSearch: document.getElementById("vault-search"),
  projectGrid: document.getElementById("project-grid"),
  certMetrics: document.getElementById("cert-metrics"),
  skillsMetrics: document.getElementById("skills-metrics"),
  contactGrid: document.getElementById("contact-grid"),
  langButtons: document.querySelectorAll("[data-lang-btn]"),
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

const getCategoryPriority = (category) => {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
};

const scoreBadge = (badge) => {
  let score = 0;
  const name = badge.name.toLowerCase();

  score += (CATEGORY_ORDER.length - getCategoryPriority(badge.category)) * 10;
  if (name.includes("certified")) score += 28;
  if (name.includes("associate") || name.includes("professional")) score += 18;
  if (name.includes("aws") || name.includes("oracle") || name.includes("google") || name.includes("isc2")) score += 16;
  if (name.includes("lead auditor") || name.includes("cyberops") || name.includes("ccna")) score += 14;
  if (name.includes("candidate")) score += 8;
  if (name.includes("introduction") || name.includes("fundamentals")) score -= 8;

  return score;
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
  const response = await fetch("./badges.md");

  if (!response.ok) {
    throw new Error("Could not load badges.md");
  }

  const markdown = await response.text();
  return parseBadgeMarkdown(markdown);
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
          ${category === "All" ? currentLocale.credentials.filters.all : category}
        </button>
      `,
    )
    .join("");

  ui.badgeFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      ui.badgeFilters.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      selectedBadgeFilter = button.dataset.filter;
      badgesExpanded = false;
      renderBadges();
    });
  });
};

const updateBadgeToggle = (totalItems) => {
  if (totalItems <= BADGES_COLLAPSED_COUNT) {
    ui.badgeToggle.hidden = true;
    return;
  }

  ui.badgeToggle.hidden = false;
  ui.badgeToggle.textContent = badgesExpanded
    ? currentLocale.credentials.toggle.less
    : currentLocale.credentials.toggle.more.replace("{count}", String(totalItems - BADGES_COLLAPSED_COUNT));
};

const renderBadges = () => {
  const source = (selectedBadgeFilter === "All" ? badgeRecords : badgeRecords.filter((badge) => badge.category === selectedBadgeFilter)).sort(
    (a, b) => scoreBadge(b) - scoreBadge(a) || a.name.localeCompare(b.name),
  );
  const list = badgesExpanded ? source : source.slice(0, BADGES_COLLAPSED_COUNT);
  const coreNames = new Set(source.slice(0, 6).map((badge) => badge.name));

  ui.badgeGrid.innerHTML = list
    .map((badge) => {
      const imageSrc = badge.badgeUrl || DEFAULT_BADGE_IMAGE;
      const isPlaceholder = imageSrc === DEFAULT_BADGE_IMAGE;
      const isCore = coreNames.has(badge.name);
      const badgeMark = badge.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() || "")
        .join("");

      return `
        <article class="badge-card ${isCore ? "badge-card--core" : ""}">
          ${isCore ? `<span class="badge-card__priority">${currentLocale.credentials.coreLabel}</span>` : ""}
          <div class="badge-card__visual ${isPlaceholder ? "is-placeholder" : ""}">
            ${
              isPlaceholder
                ? `<div class="badge-card__mark" aria-hidden="true">${badgeMark}</div>`
                : `<img src="${imageSrc}" alt="${badge.name} badge" loading="lazy" onerror="this.parentElement.classList.add('is-placeholder'); this.parentElement.innerHTML='<div class=&quot;badge-card__mark&quot; aria-hidden=&quot;true&quot;>${badgeMark}</div>';" />`
            }
          </div>
          <div class="badge-card__body">
            <h3>${badge.name}</h3>
            <p class="badge-card__category">${badge.category}</p>
          </div>
          <div class="badge-meta">
            <a href="${badge.certificateUrl}" target="_blank" rel="noreferrer">${currentLocale.shared.verify}</a>
          </div>
        </article>
      `;
    })
    .join("");

  updateBadgeToggle(source.length);
};

const renderVault = () => {
  const filtered = badgeRecords
    .filter((badge) => badge.name.toLowerCase().includes(vaultSearchTerm) || badge.category.toLowerCase().includes(vaultSearchTerm))
    .sort((a, b) => a.name.localeCompare(b.name));

  const featured = [...filtered]
    .sort((a, b) => scoreBadge(b) - scoreBadge(a))
    .slice(0, 6);

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
          <span class="vault-featured-card__category">${badge.category}</span>
          <strong>${badge.name}</strong>
          <a href="${badge.certificateUrl}" target="_blank" rel="noreferrer">${currentLocale.shared.verify}</a>
        </article>
      `,
    )
    .join("");

  if (!filtered.length) {
    ui.vaultFeatured.innerHTML = "";
    ui.vaultGroups.innerHTML = `<div class="vault-empty">${currentLocale.vault.noResults}</div>`;
    ui.vaultToggle.hidden = true;
    return;
  }

  ui.vaultGroups.innerHTML = Object.entries(groupedEntries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => {
      const orderedItems = [...items].sort((a, b) => scoreBadge(b) - scoreBadge(a) || a.name.localeCompare(b.name));
      const visibleItems = vaultExpanded ? orderedItems : orderedItems.slice(0, VAULT_GROUP_COLLAPSED_COUNT);

      return `
        <section class="vault-group">
          <div class="vault-group__header">
            <h3>${category}</h3>
            <span>${items.length}</span>
          </div>
          <div class="vault-list">
            ${visibleItems
              .map(
                (badge) => `
                  <article class="vault-item">
                    <div class="vault-item__meta">
                      <span class="vault-item__title">${badge.name}</span>
                      <span class="vault-item__category">${badge.category}</span>
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
    .join("");

  if (filtered.length <= VAULT_COLLAPSED_COUNT) {
    ui.vaultToggle.hidden = true;
    return;
  }

  ui.vaultToggle.hidden = false;
  ui.vaultToggle.textContent = vaultExpanded
    ? currentLocale.vault.toggle.less
    : currentLocale.vault.toggle.more.replace("{count}", String(filtered.length - VAULT_COLLAPSED_COUNT));
};

const renderProjects = () => {
  ui.projectGrid.innerHTML = currentLocale.projects.items
    .map(
      (project) => `
        <article class="project-card">
          <p class="project-card__eyebrow">${project.kind}</p>
          <h3>${project.name}</h3>
          <p>${project.description}</p>
          <ul class="project-stack">
            ${project.stack.map((item) => `<li>${item}</li>`).join("")}
          </ul>
          <div class="project-links">
            <a href="${project.github}" target="_blank" rel="noreferrer">GitHub</a>
            <a href="${project.demo}" target="_blank" rel="noreferrer">${currentLocale.shared.demo}</a>
          </div>
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

  const skillCounts = currentLocale.skills.items.reduce((acc, skillGroup) => {
    acc[skillGroup.title] = skillGroup.items.length;
    return acc;
  }, {});

  ui.certMetrics.innerHTML = createMetricRows(badgeCounts);
  ui.skillsMetrics.innerHTML = createMetricRows(skillCounts);
};

const createMetricRows = (entriesObject) => {
  const entries = Object.entries(entriesObject);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return entries
    .map(
      ([label, value]) => `
        <div class="metric-row">
          <div class="metric-label"><span>${label}</span><span>${value}</span></div>
          <div class="metric-bar"><span style="width: ${(value / max) * 100}%"></span></div>
        </div>
      `,
    )
    .join("");
};

const renderContacts = () => {
  ui.contactGrid.innerHTML = currentLocale.contact.items
    .map(
      (item) => `
        <article class="contact-card">
          <span>${item.label}</span>
          <a href="${item.href}" target="_blank" rel="noreferrer">${item.value}</a>
        </article>
      `,
    )
    .join("");
};

const maybeHideSplash = () => {
  if (sessionStorage.getItem(STORAGE_KEYS.splashSeen)) {
    ui.splash.classList.add("is-hidden");
    return;
  }

  window.setTimeout(() => {
    ui.splash.classList.add("is-hidden");
    sessionStorage.setItem(STORAGE_KEYS.splashSeen, "true");
  }, 1200);
};

const setLanguage = async (language) => {
  currentLanguage = language;
  localStorage.setItem(STORAGE_KEYS.language, language);
  currentLocale = await loadLocale(language);
  applyI18n();
  renderSkills();
  buildFilters();
  renderBadges();
  renderVault();
  renderProjects();
  renderMetrics();
  renderContacts();
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

const initialize = async () => {
  try {
    badgeRecords = await loadBadges();
    selectedBadgeFilter = "All";
    vaultSearchTerm = "";
    await setLanguage(detectLanguage());
    bindEvents();
    maybeHideSplash();
  } catch (error) {
    console.error(error);
  }
};

initialize();
