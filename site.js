(() => {
  "use strict";

  const { LANGS, PROFILE, LINEAGE } = window.SITE;
  const PREVIEW = false; // the preview build flips this so the form never posts

  const root = document.documentElement;
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isTodo = (s) => typeof s === "string" && s.trim().startsWith("[");
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  const smooth = () => (reduceMotion ? "auto" : "smooth");

  /* ---------------- Theme ---------------- */
  const themeBtn = $("#theme-toggle");
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)");
  const effectiveTheme = () => root.dataset.theme || (sysDark.matches ? "dark" : "light");
  function syncThemeButton() {
    const dark = effectiveTheme() === "dark";
    themeBtn.dataset.mode = dark ? "dark" : "light";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  function setTheme(t) {
    root.dataset.theme = t;
    store.set("kp-theme", t);
    syncThemeButton();
    window.dispatchEvent(new Event("kp-theme"));
  }
  themeBtn.addEventListener("click", () => setTheme(effectiveTheme() === "dark" ? "light" : "dark"));
  sysDark.addEventListener("change", () => { syncThemeButton(); window.dispatchEvent(new Event("kp-theme")); });
  syncThemeButton();
  window.KP = { setTheme, effectiveTheme };

  /* ---------------- Header ---------------- */
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = [...document.querySelectorAll(".nav a")];
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((a) => { const s = document.querySelector(a.getAttribute("href")); if (s) spy.observe(s); });
  }

  /* ---------------- Hero text ---------------- */
  $("#hero-name").textContent = PROFILE.name;
  if (PROFILE.lede) $("#hero-lede").textContent = PROFILE.lede;
  const facts = $("#facts");
  [["Experience", PROFILE.years + " years"], ["Languages", LANGS.join(", ")], ["Focus", PROFILE.focus], ["Platform", PROFILE.platform]]
    .forEach(([k, v]) => { const d = el("div"); d.append(el("dt", "", k), el("dd", "", v)); facts.append(d); });

  /* ---------------- About + now ---------------- */
  const aboutText = $("#about-text");
  PROFILE.about.forEach((p) => aboutText.append(el("p", "", p)));
  const nowList = $("#now-list");
  (PROFILE.now || []).forEach((n) => { const d = el("div"); d.append(el("dt", "", n.label), el("dd", isTodo(n.text) ? "todo" : "", n.text)); nowList.append(d); });

  /* ---------------- Projects ---------------- */
  const statusKind = (s) => (String(s).toLowerCase() === "live" ? "live" : "wip");
  const statusLabel = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Each project gets its own small lineage "constellation", generated from its id.
  function cardArt(id, kind) {
    const r = rng(hash(id));
    const W = 400, H = 144, n = 9;
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: 26 + (i / (n - 1)) * (W - 52) + (r() - 0.5) * 30, y: 24 + r() * (H - 48) });
    let lines = "";
    for (let i = 0; i < n; i++) {
      const near = pts.map((p, j) => ({ j, d: j > i ? Math.hypot(p.x - pts[i].x, p.y - pts[i].y) : Infinity })).sort((a, b) => a.d - b.d).slice(0, 2);
      near.forEach(({ j, d }) => { if (d < Infinity) lines += `<line x1="${pts[i].x.toFixed(1)}" y1="${pts[i].y.toFixed(1)}" x2="${pts[j].x.toFixed(1)}" y2="${pts[j].y.toFixed(1)}"/>`; });
    }
    const pathIdx = [0, 2 + Math.floor(r() * 2), 5 + Math.floor(r() * 2), n - 1];
    const d = pathIdx.map((k, i) => {
      const p = pts[k];
      if (!i) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const q = pts[pathIdx[i - 1]], mx = (q.x + p.x) / 2;
      return `C${mx.toFixed(1)} ${q.y.toFixed(1)} ${mx.toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }).join(" ");
    const color = kind === "live" ? "var(--flow)" : "var(--accent)";
    const dots = pts.map((p, i) => pathIdx.includes(i)
      ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" style="fill:${color}"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="10" style="fill:${color};opacity:.15"/>`
      : `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" style="fill:var(--surface);stroke:var(--line-strong);stroke-width:1.5"/>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g style="stroke:var(--line-strong);stroke-width:1.2">${lines}</g><path d="${d}" style="fill:none;stroke:${color};stroke-width:2.4;stroke-linecap:round"/>${dots}</svg>`;
  }

  const cardsEl = $("#cards");
  const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  PROFILE.projects.forEach((p) => {
    const kind = statusKind(p.status);
    const card = el("article", "card");
    card.dataset.kind = kind;
    card.id = "project-" + p.id;
    const art = el("div", "card-art");
    art.innerHTML = cardArt(p.id, kind);
    const body = el("div", "card-body");
    body.append(el("span", "status " + kind, statusLabel(p.status)), el("h3", "", p.name), el("p", "card-summary" + (isTodo(p.summary) ? " todo" : ""), p.summary));
    const pills = el("ul", "pills");
    String(p.stack).split(/,\s*/).forEach((s) => {
      const t = s.replace(/^\[|\]$/g, "");
      if (t) pills.append(el("li", "pill" + (isTodo(p.stack) ? " todo" : ""), t));
    });
    body.append(pills);
    const foot = el("div", "card-foot");
    const details = (p.details || []).filter(Boolean);
    if (details.length) {
      const btn = el("button", "more");
      btn.type = "button";
      btn.innerHTML = "Details " + chevron;
      const panel = el("div", "card-details");
      panel.id = "details-" + p.id;
      panel.hidden = true;
      const ul = el("ul");
      details.forEach((d) => ul.append(el("li", isTodo(d) ? "todo" : "", d)));
      panel.append(ul);
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", panel.id);
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        panel.hidden = open;
      });
      foot.append(btn);
      body.append(panel);
    } else {
      foot.append(el("span"));
    }
    if (p.url) {
      const a = el("a", "card-link", "Visit " + p.url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
      a.href = p.url; a.target = "_blank"; a.rel = "noopener";
      foot.append(a);
    }
    body.append(foot);
    card.append(art, body);
    cardsEl.append(card);

    if (finePointer && !reduceMotion) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-3px)`;
        card.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
        card.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    }
  });

  // Filters
  const filtersEl = $("#filters");
  const counts = { all: PROFILE.projects.length, live: 0, wip: 0 };
  PROFILE.projects.forEach((p) => { counts[statusKind(p.status)] += 1; });
  const filterDefs = [["all", "All"], ["live", "Live"], ["wip", "In the works"]].filter(([k]) => k === "all" || counts[k] > 0);
  if (filterDefs.length > 2) {
    filterDefs.forEach(([k, label], i) => {
      const b = el("button", "filter");
      b.type = "button";
      b.dataset.filter = k;
      b.setAttribute("aria-pressed", String(i === 0));
      b.append(label, el("span", "count", String(counts[k])));
      b.addEventListener("click", () => {
        filtersEl.querySelectorAll(".filter").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        cardsEl.querySelectorAll(".card").forEach((c) => { c.hidden = !(k === "all" || c.dataset.kind === k); });
      });
      filtersEl.append(b);
    });
  }

  /* ---------------- Lineage diagram ---------------- */
  const flowEl = $("#flow");
  const flowPanel = $("#flow-panel");
  const byId = (id) => LINEAGE.find((x) => x.id === id);
  function walk(id, step) {
    const out = [];
    let frontier = [id];
    while (frontier.length) {
      const found = LINEAGE.filter((x) => frontier.some((f) => step(x, f))).map((x) => x.id).filter((x) => !out.includes(x) && x !== id);
      out.push(...found);
      frontier = found;
    }
    return out;
  }
  const downstreamOf = (id) => walk(id, (x, f) => x.up.includes(f));
  const upstreamOf = (id) => walk(id, (x, f) => byId(f).up.includes(x.id));

  const flowButtons = LINEAGE.map((a) => {
    const b = el("button", "flow-node");
    b.type = "button";
    b.dataset.id = a.id;
    b.append(el("span", "flow-kind", a.kind), el("span", "flow-name", a.id), el("span", "flow-owner", "Owner: " + a.owner));
    b.addEventListener("click", () => selectAsset(a.id));
    flowEl.append(b);
    return b;
  });

  function selectAsset(id) {
    const a = byId(id);
    const up = upstreamOf(id);
    const down = downstreamOf(id);
    flowButtons.forEach((b) => {
      const bid = b.dataset.id;
      b.classList.toggle("is-selected", bid === id);
      b.classList.toggle("is-up", up.includes(bid));
      b.classList.toggle("is-down", down.includes(bid));
      b.setAttribute("aria-pressed", String(bid === id));
    });
    const info = el("div");
    info.append(
      el("h3", "", a.id),
      el("p", "", a.kind + ", owned by " + a.owner.toLowerCase() + ". Fed by " + (up.length ? up.join(", ") : "nothing upstream") + "."),
      el("p", "flow-impact", down.length
        ? "Changing it affects " + down.length + (down.length === 1 ? " asset: " : " assets: ") + down.join(", ") + ". Check with their owners before you ship."
        : "Nothing depends on it, so it is safe to change.")
    );
    const legend = el("div", "legend");
    legend.setAttribute("aria-hidden", "true");
    [["l-sel", "Selected"], ["l-up", "Upstream"], ["l-down", "Affected downstream"]].forEach(([c, t]) => { const s = el("span"); s.append(el("i", c), t); legend.append(s); });
    flowPanel.replaceChildren(info, legend);
  }
  selectAsset(LINEAGE[1] ? LINEAGE[1].id : LINEAGE[0].id);

  /* ---------------- Experience + skills ---------------- */
  const xp = $("#xp");
  PROFILE.experience.forEach((e) => {
    const li = el("li");
    const h = el("h3", isTodo(e.title) ? "todo" : "", e.title);
    h.append(el("span", "org" + (isTodo(e.org) ? " todo" : ""), ", " + e.org));
    li.append(el("p", "xp-when" + (isTodo(e.when) ? " todo" : ""), e.when), h, el("p", "xp-summary" + (isTodo(e.summary) ? " todo" : ""), e.summary));
    xp.append(li);
  });
  const skillsEl = $("#skills");
  PROFILE.skills.forEach((g) => {
    const box = el("div", "skill-group");
    const ul = el("ul", "pills");
    g.items.forEach((t) => ul.append(el("li", "pill" + (isTodo(t) ? " todo" : ""), t.replace(/^\[|\]$/g, ""))));
    box.append(el("h3", "", g.label), ul);
    skillsEl.append(box);
  });

  /* ---------------- Contact ---------------- */
  $("#email-text").textContent = PROFILE.email;
  const copyBtn = $("#copy-email");
  copyBtn.addEventListener("click", () => {
    const done = () => { copyBtn.textContent = "Copied"; setTimeout(() => { copyBtn.textContent = "Copy"; }, 1600); };
    const fallback = () => {
      const r = document.createRange();
      r.selectNodeContents($("#email-text"));
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      copyBtn.textContent = "Press Ctrl+C";
    };
    try { navigator.clipboard.writeText(PROFILE.email).then(done, fallback); } catch (e) { fallback(); }
  });
  const linksEl = $("#links");
  PROFILE.links.filter((l) => l.url).forEach((l) => {
    const li = el("li");
    const a = el("a", "", l.label);
    a.href = l.url; a.target = "_blank"; a.rel = "noopener";
    li.append(a);
    linksEl.append(li);
  });
  linksEl.hidden = !linksEl.children.length;

  const form = $("#contact-form");
  const statusEl = $("#form-status");
  const setStatus = (text, kind) => { statusEl.textContent = text; statusEl.className = "form-status" + (kind ? " is-" + kind : ""); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("Fill in your name, a valid email address, and a message of at least 10 characters.", "err");
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    setStatus("Sending...");
    try {
      if (PREVIEW) {
        await new Promise((r) => setTimeout(r, 700));
        form.reset();
        setStatus("Preview only, nothing was sent. On the live site this emails " + PROFILE.email + ".", "ok");
      } else {
        const res = await fetch("contact.php", { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
        const json = await res.json();
        if (res.ok && json.ok) { form.reset(); setStatus("Message sent. I'll reply to your email soon.", "ok"); }
        else setStatus((json.error || "The message didn't send.") + " Email " + PROFILE.email + " instead.", "err");
      }
    } catch (err) {
      setStatus("The message didn't send. Email " + PROFILE.email + " instead.", "err");
    }
    btn.disabled = false;
  });

  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Hero lineage graph ---------------- */
  const GRAPH = {
    nodes: [
      { id: "python", label: "Python", x: 0.02, y: 0.16, to: "work" },
      { id: "sql", label: "SQL", x: 0.07, y: 0.47, to: "work" },
      { id: "ai", label: "AI", x: 0.02, y: 0.80, to: "about" },
      { id: "collibra", label: "Collibra", x: 0.33, y: 0.24, to: "lineage" },
      { id: "ha", label: "Home Assistant", x: 0.30, y: 0.60, to: "project-dashboard" },
      { id: "picase", label: "Pi 5 case", x: 0.34, y: 0.94, to: "project-pi-case" },
      { id: "metadata", label: "Metadata governance", short: "Metadata", x: 0.60, y: 0.06, to: "lineage" },
      { id: "lineage", label: "Lineage", x: 0.66, y: 0.38, to: "lineage" },
      { id: "dashboard", label: "3D dashboard", x: 0.64, y: 0.70, to: "project-dashboard" },
      { id: "kingpra", label: "kingpra.com", x: 0.60, y: 0.98, to: "project-kingpra" },
      { id: "trust", label: "Trusted data", x: 0.98, y: 0.22, to: "lineage", sink: true },
      { id: "content", label: "YouTube + TikTok", short: "Videos", x: 0.98, y: 0.82, to: "project-content", sink: true }
    ],
    edges: [["python", "collibra"], ["sql", "collibra"], ["sql", "lineage"], ["python", "ha"], ["collibra", "metadata"], ["collibra", "lineage"],
      ["metadata", "trust"], ["lineage", "trust"], ["ai", "kingpra"], ["ai", "dashboard"], ["ha", "dashboard"], ["picase", "dashboard"],
      ["dashboard", "content"], ["kingpra", "content"]]
  };
  const sectionName = { work: "Experience", about: "About", lineage: "the lineage demo" };
  const nodeById = (id) => GRAPH.nodes.find((n) => n.id === id);
  const parents = (id) => GRAPH.edges.filter((e) => e[1] === id).map((e) => e[0]);
  const children = (id) => GRAPH.edges.filter((e) => e[0] === id).map((e) => e[1]);
  function closure(id, next) { const out = new Set(); const stack = [id]; while (stack.length) { next(stack.pop()).forEach((x) => { if (!out.has(x)) { out.add(x); stack.push(x); } }); } return out; }

  function goTo(target) {
    const t = document.getElementById(target);
    if (!t) return;
    t.scrollIntoView({ behavior: smooth(), block: target.startsWith("project-") ? "center" : "start" });
    if (target.startsWith("project-")) {
      t.animate && !reduceMotion && t.animate([{ boxShadow: "0 0 0 0 var(--accent-soft)" }, { boxShadow: "0 0 0 10px var(--accent-soft)" }, { boxShadow: "0 0 0 0 var(--accent-soft)" }], { duration: 1200, delay: 450 });
    }
  }

  (function initGraph() {
    const canvas = $("#graph-canvas");
    const caption = $("#graph-caption");
    if (!finePointer) caption.textContent = "Tap a node to trace what feeds it and what it feeds.";
    const defaultCaption = caption.textContent;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0, compact = false;
    let P = {};
    let curves = [];
    let hover = null, tapped = null;
    let colors = {};
    let start = performance.now();
    let visible = true, rafId = 0;
    let labelBoxes = {};

    function readColors() {
      const cs = getComputedStyle(root);
      ["ink", "muted", "line", "line-strong", "accent", "accent-soft", "flow", "surface", "bg"].forEach((k) => { colors[k] = cs.getPropertyValue("--" + k).trim(); });
    }

    function layout() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      compact = W < 520;
      const padX = 14, padTop = 34, padBot = 16;
      GRAPH.nodes.forEach((n) => { P[n.id] = { x: padX + n.x * (W - padX * 2), y: padTop + n.y * (H - padTop - padBot) }; });
      curves = GRAPH.edges.map(([a, b]) => {
        const p = P[a], q = P[b];
        const dx = (q.x - p.x) * 0.5;
        const s = [];
        for (let i = 0; i <= 48; i++) {
          const t = i / 48, u = 1 - t;
          s.push({
            x: u * u * u * p.x + 3 * u * u * t * (p.x + dx) + 3 * u * t * t * (q.x - dx) + t * t * t * q.x,
            y: u * u * u * p.y + 3 * u * u * t * p.y + 3 * u * t * t * q.y + t * t * t * q.y
          });
        }
        return { a, b, s };
      });
    }

    function related(id) {
      if (!id) return null;
      const up = closure(id, parents);
      const down = closure(id, children);
      const nodes = new Set([id, ...up, ...down]);
      const edges = new Set();
      GRAPH.edges.forEach(([a, b], i) => {
        if ((a === id || down.has(a)) && down.has(b)) edges.add(i);
        if ((b === id || up.has(b)) && up.has(a)) edges.add(i);
      });
      return { nodes, edges };
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    function draw(now) {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const intro = reduceMotion ? 1 : clamp01((now - start) / 1600);
      const rel = related(hover);
      const appear = (x) => ease(clamp01(intro * 1.6 - x * 0.6));

      curves.forEach((c, i) => {
        const hl = rel && rel.edges.has(i);
        const local = appear(nodeById(c.a).x);
        if (local <= 0) return;
        const upto = Math.max(1, Math.floor(local * (c.s.length - 1)));
        ctx.globalAlpha = rel ? (hl ? 1 : 0.16) : 0.9;
        ctx.strokeStyle = hl ? colors.accent : colors["line-strong"];
        ctx.lineWidth = hl ? 2.2 : 1.3;
        ctx.beginPath();
        ctx.moveTo(c.s[0].x, c.s[0].y);
        for (let k = 1; k <= upto; k++) ctx.lineTo(c.s[k].x, c.s[k].y);
        ctx.stroke();

        if (!reduceMotion && local >= 1) {
          const n = hl ? 2 : 1;
          for (let j = 0; j < n; j++) {
            const speed = hl ? 1500 : 2600;
            const t = ((now / speed) + i * 0.37 + j / n) % 1;
            const pt = c.s[Math.floor(t * (c.s.length - 1))];
            ctx.globalAlpha = rel ? (hl ? 1 : 0.12) : 0.85;
            ctx.fillStyle = hl ? colors.accent : colors.flow;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, hl ? 2.8 : 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      const fontPx = compact ? 11.5 : 13;
      ctx.font = `500 ${fontPx}px Geist, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      labelBoxes = {};
      GRAPH.nodes.forEach((n) => {
        const a = appear(n.x);
        if (a <= 0) return;
        const p = P[n.id];
        const on = !rel || rel.nodes.has(n.id);
        const isHover = hover === n.id;
        ctx.globalAlpha = a * (on ? 1 : 0.28);
        if (isHover) {
          ctx.fillStyle = colors["accent-soft"];
          ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill();
        }
        const r = n.sink ? 6.5 : 5;
        ctx.fillStyle = n.sink || isHover ? colors.accent : colors.surface;
        ctx.strokeStyle = rel && on ? colors.accent : (n.sink ? colors.accent : colors.muted);
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        const text = compact && n.short ? n.short : n.label;
        const tw = ctx.measureText(text).width;
        const right = n.x > 0.8;
        const lx = right ? p.x - 10 - tw : p.x + 10;
        const ly = p.y - 15;
        ctx.lineWidth = 4;
        ctx.strokeStyle = colors.bg;
        ctx.lineJoin = "round";
        ctx.strokeText(text, lx, ly);
        ctx.fillStyle = on ? colors.ink : colors.muted;
        ctx.fillText(text, lx, ly);
        labelBoxes[n.id] = { x: lx - 4, y: ly - fontPx, w: tw + 8, h: fontPx * 2 };
      });
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      draw(now);
      if (visible && !reduceMotion) rafId = requestAnimationFrame(frame);
      else rafId = 0;
    }
    function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }
    function redraw() { if (reduceMotion || !visible) draw(performance.now()); else kick(); }

    function hit(x, y) {
      let best = null, bestD = 22;
      GRAPH.nodes.forEach((n) => {
        const p = P[n.id];
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) { best = n.id; bestD = d; }
        const b = labelBoxes[n.id];
        if (!best && b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) best = n.id;
      });
      return best;
    }

    function describe(id) {
      const n = nodeById(id);
      const ps = parents(id).map((x) => nodeById(x).label);
      const cs = children(id).map((x) => nodeById(x).label);
      const parts = [];
      if (ps.length) parts.push("fed by " + ps.join(", "));
      if (cs.length) parts.push("feeds " + cs.join(", "));
      const dest = n.to.startsWith("project-") ? "the project" : (sectionName[n.to] || n.to);
      caption.replaceChildren();
      const strong = el("strong", "", n.label);
      caption.append(strong, document.createTextNode(": " + parts.join("; ") + ". " + (tapped === id || finePointer ? "Click to jump to " + dest + "." : "Tap again to jump to " + dest + ".")));
    }

    function setHover(id) {
      if (hover === id) return;
      hover = id;
      canvas.style.cursor = id ? "pointer" : "default";
      if (id) describe(id); else caption.textContent = defaultCaption;
      redraw();
    }

    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      setHover(hit(e.clientX - r.left, e.clientY - r.top));
    });
    canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setHover(null); });
    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect();
      const id = hit(e.clientX - r.left, e.clientY - r.top);
      if (!id) { tapped = null; setHover(null); return; }
      if (!finePointer && tapped !== id) { tapped = id; hover = null; setHover(id); return; }
      tapped = null;
      goTo(nodeById(id).to);
    });

    // Keyboard and screen reader access to the same nodes.
    const list = $("#graph-nodes");
    GRAPH.nodes.forEach((n) => {
      const li = el("li");
      const b = el("button", "", n.label);
      b.type = "button";
      b.addEventListener("focus", () => setHover(n.id));
      b.addEventListener("blur", () => setHover(null));
      b.addEventListener("click", () => goTo(n.to));
      li.append(b);
      list.append(li);
    });

    readColors();
    layout();
    if ("ResizeObserver" in window) new ResizeObserver(() => { layout(); redraw(); }).observe(canvas);
    else window.addEventListener("resize", () => { layout(); redraw(); });
    window.addEventListener("kp-theme", () => { readColors(); redraw(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) redraw(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) redraw(); });
    start = performance.now();
    redraw();
  })();
})();
