const STORAGE_KEYS = {
  language: "portfolio-language",
  splashSeen: "portfolio-splash-seen-session",
};

const DEFAULT_BADGE_IMAGE = "./assets/img/badges/placeholder-badge.svg";
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
  certMetrics: document.getElementById("cert-metrics"),
  certMetricsNote: document.getElementById("cert-metrics-note"),
  skillsMetrics: document.getElementById("skills-metrics"),
  contactGrid: document.getElementById("contact-grid"),
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

const getCategoryPriority = (category) => {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
};

const scoreBadge = (badge) => {
  let score = 0;
  const name = badge.name.toLowerCase();

  if (name.includes("aws certified cloud practitioner")) score += 1000;
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
          : `<img src="${imageSrc}" alt="${badge.name} badge" loading="lazy" onerror="this.parentElement.classList.add('is-placeholder'); this.parentElement.innerHTML='<div class=&quot;badge-card__mark&quot; aria-hidden=&quot;true&quot;>${badgeMark}</div>';" />`
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
    ui.badgeToggle.textContent = currentLocale.credentials.toggle.open.replace("{count}", String(totalItems));
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
            <p class="core-badge-card__category">${badge.category}</p>
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
            <p class="badge-card__category">${badge.category}</p>
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
          ${createBadgeVisual(badge, "vault-badge-thumb")}
          <div class="vault-featured-card__body">
            <span class="vault-featured-card__category">${badge.category}</span>
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
            <h3>${category}</h3>
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

const createMetricRows = (entriesObject) => {
  const entries = Object.entries(entriesObject);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return entries
    .map(
      ([label, value]) => {
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `
        <div class="metric-row metric-row--${slug}">
          <div class="metric-label"><span>${label}</span><span>${value}</span></div>
          <div class="metric-bar"><span style="width: ${(value / max) * 100}%"></span></div>
        </div>
      `;
      },
    )
    .join("");
};

const getContactGlyph = (label) => {
  const normalized = label.trim().toLowerCase();
  const map = {
    github: "GH",
    linkedin: "IN",
    email: "@@",
    cv: "CV",
  };

  return map[normalized] || normalized.slice(0, 2).toUpperCase();
};

const renderContacts = () => {
  ui.contactGrid.innerHTML = currentLocale.contact.items
    .map(
      (item) => `
        <article class="contact-card">
          <div class="contact-card__head">
            <span class="contact-card__icon" aria-hidden="true">${getContactGlyph(item.label)}</span>
            <span>${item.label}</span>
          </div>
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
  }, 2100);
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
  };

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
};

const initialize = async () => {
  try {
    badgeRecords = await loadBadges();
    selectedBadgeFilter = "All";
    vaultSearchTerm = "";
    await setLanguage(detectLanguage());
    bindEvents();
    bindSectionSpy();
    maybeHideSplash();
  } catch (error) {
    console.error(error);
  }
};

initialize();
