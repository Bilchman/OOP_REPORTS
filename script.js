// ---------------------------------------------------------------------
// Розгортає/згортає блок коду. Той самий принцип, що й раніше:
// клік по заголовку перемикає клас 'open' на батьківському .code-block.
// ---------------------------------------------------------------------
function toggleCode(header) {
    const block = header.parentElement;
    block.classList.toggle('open');
}

// ---------------------------------------------------------------------
// Перемикання між лабораторними — та сама логіка, що була у старому
// проєкті (openLab): ховаємо всі секції й підменю, показуємо обрану.
// ---------------------------------------------------------------------
function openLab(labId, titleEl) {
    document.querySelectorAll('.lab-section').forEach((sec) => sec.classList.remove('active'));
    document.querySelectorAll('.submenu-wrap').forEach((w) => w.classList.remove('open'));
    document.querySelectorAll('.lab-title').forEach((t) => t.classList.remove('active'));

    document.getElementById(labId).classList.add('active');
    titleEl.classList.add('active');
    titleEl.nextElementSibling.classList.add('open');

    const content = document.getElementById('content');
    if (content) content.scrollTop = 0;
}

// ---------------------------------------------------------------------
// Нижче виконується лише на index.html (має #lab-nav і #content).
// ---------------------------------------------------------------------
const CONFIG = {
    owner: "Bilchman",
    repo: "KGV-Reports",
    branch: "main",
    path: "reports",
    cacheMinutes: 5,
};

const IGNORED_FILES = new Set(["template.html", "_template.html", "readme.md", ".gitkeep"]);

const navEl = document.getElementById("lab-nav");
const contentEl = document.getElementById("content");

if (navEl && contentEl) {
    init();
}

async function init() {
    try {
        const files = await getReportFiles();
        render(files);
    } catch (err) {
        navEl.innerHTML = `<p class="state-message">${escapeHtml(err.message)}</p>`;
    }
}

async function getReportFiles() {
    const cacheKey = `reports-cache:${CONFIG.owner}/${CONFIG.repo}/${CONFIG.path}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });

    if (!res.ok) {
        throw new Error(
            res.status === 403
                ? "GitHub тимчасово обмежив кількість запитів. Спробуйте за кілька хвилин."
                : `Не вдалося завантажити список звітів (HTTP ${res.status}).`
        );
    }

    const entries = await res.json();
    const candidates = entries
        .filter((e) => e.type === "file")
        .filter((e) => !IGNORED_FILES.has(e.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const files = await Promise.all(candidates.map(describeFile));

    writeCache(cacheKey, files);
    return files;
}

async function describeFile(entry) {
    const ext = entry.name.split(".").pop().toLowerCase();
    const isHtml = ext === "html" || ext === "htm";
    const base = {
        name: entry.name,
        slug: slugify(entry.name),
        href: `${CONFIG.path}/${encodeURIComponent(entry.name)}`,
        isHtml,
        title: entry.name,
        contentHtml: "",
    };

    if (!isHtml) return base;

    try {
        const res = await fetch(entry.download_url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const metaTitle = doc.querySelector('meta[name="report-title"]')?.content;
        const contentNode = doc.querySelector(".content");
        base.title = metaTitle || doc.querySelector("title")?.textContent || entry.name;
        base.contentHtml = contentNode ? contentNode.innerHTML : "<p>Не вдалося прочитати вміст звіту.</p>";
    } catch {
        base.contentHtml = "<p>Не вдалося прочитати вміст звіту.</p>";
    }
    return base;
}

// Перетворює "01-inheritance.html" на "01-inheritance" — використовується,
// щоб зробити id розділів (Мета/Умова/...) унікальними для кожної лабораторної,
// оскільки всі вони опиняються в одному DOM. У самому шаблоні id лишаються
// простими (meta, condition, ...) — префікс додається тут автоматично.
function slugify(filename) {
    return filename
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const SECTIONS = [
    ["meta", "Мета"],
    ["condition", "Умова"],
    ["analysis", "Аналіз"],
    ["diagram", "Діаграма класів"],
    ["code", "Код"],
    ["examples", "Приклади"],
    ["tests", "Перевірки"],
    ["conclusion", "Висновки"],
];

function render(files) {
    if (files.length === 0) {
        navEl.innerHTML = `<p class="state-message">Звітів поки немає.</p>`;
        return;
    }

    navEl.innerHTML = "";
    contentEl.innerHTML = "";

    files.forEach((f) => {
        if (!f.isHtml) {
            // Файли, що не є .html (напр. випадковий .pdf) — звичайне посилання,
            // відкривається в новій вкладці, без вбудовування в сторінку.
            navEl.insertAdjacentHTML(
                "beforeend",
                `<a class="lab-title" style="display:block;text-decoration:none;"
                    href="${f.href}" target="_blank" rel="noopener">${escapeHtml(f.title)}</a>`
            );
            return;
        }

        const menuItems = SECTIONS.map(
            ([id, label]) => `<li><a href="#${f.slug}-${id}">${label}</a></li>`
        ).join("");

        navEl.insertAdjacentHTML(
            "beforeend",
            `<div class="lab-title" onclick="openLab('${f.slug}', this)">${escapeHtml(f.title)}</div>
             <div class="submenu-wrap">
                <ul class="submenu">${menuItems}</ul>
             </div>`
        );

        // Робимо id розділів унікальними для цієї лабораторної (meta -> slug-meta)
        // перед вставкою в спільний DOM, щоб уникнути колізій між звітами.
        const temp = document.createElement("div");
        temp.innerHTML = f.contentHtml;
        temp.querySelectorAll("article[id]").forEach((art) => {
            art.id = `${f.slug}-${art.id}`;
        });

        contentEl.insertAdjacentHTML(
            "beforeend",
            `<section id="${f.slug}" class="lab-section">${temp.innerHTML}</section>`
        );
    });

    document.querySelector(".lab-title")?.click();
}

function readCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { savedAt, files } = JSON.parse(raw);
        if (Date.now() - savedAt > CONFIG.cacheMinutes * 60 * 1000) return null;
        return files;
    } catch {
        return null;
    }
}

function writeCache(key, files) {
    try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), files }));
    } catch {
        // сховище недоступне (напр. приватний режим) — просто пропускаємо кеш
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}
