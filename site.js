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

  window.KP = {};

  /* ---------------- Header ---------------- */
  const header = $(".site-header");
  const heroEl = $("#top");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    header.classList.toggle("past-hero", window.scrollY > (heroEl ? heroEl.offsetHeight * 0.55 : 400));
  };
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

  /* ---------------- Hero: morphing particles ---------------- */
  (function initMorph() {
    const canvas = $("#morph");
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return;
    const tabsEl = $("#morph-tabs");
    const captionEl = $("#morph-caption");
    const SHAPES = [
      { name: "Data universe", caption: "Every point is something I work with." },
      { name: "SQL", caption: "Seven years of Python and SQL." },
      { name: "Home Assistant", caption: "Building a 3D dashboard for my smart home." },
      { name: "King Pra", caption: "Click the shape to keep it moving." }
    ];
    const small = window.matchMedia("(max-width: 40rem)").matches;
    const N = small ? 1300 : 2000;
    const rnd = Math.random;

    function sphere() {
      const out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = ga * i; out.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
      return out;
    }
    function cylinder() {
      const out = [];
      for (let i = 0; i < N; i++) {
        const a = rnd() * Math.PI * 2, k = rnd();
        if (rnd() < 0.3) { const ring = [-0.85, -0.3, 0.3, 0.85][Math.floor(rnd() * 4)]; out.push([Math.cos(a) * 0.7, ring, Math.sin(a) * 0.7]); continue; }
        if (k < 0.62) { let y = -0.85 + rnd() * 1.7; if (rnd() < 0.35) y = (rnd() < 0.5 ? -0.3 : 0.3) + (rnd() - 0.5) * 0.03; out.push([Math.cos(a) * 0.7, y, Math.sin(a) * 0.7]); }
        else { const r = Math.sqrt(rnd()) * 0.7; out.push([Math.cos(a) * r, k < 0.85 ? 0.85 : -0.85, Math.sin(a) * r]); }
      }
      return out;
    }
    function onEdges(edges) {
      const lens = edges.map((e) => Math.hypot(e[1][0] - e[0][0], e[1][1] - e[0][1], e[1][2] - e[0][2]));
      const total = lens.reduce((a, b) => a + b, 0);
      let r = rnd() * total, k = 0;
      while (r > lens[k] && k < edges.length - 1) { r -= lens[k]; k += 1; }
      const e = edges[k], t = rnd(), j = () => (rnd() - 0.5) * 0.02;
      return [e[0][0] + (e[1][0] - e[0][0]) * t + j(), e[0][1] + (e[1][1] - e[0][1]) * t + j(), e[0][2] + (e[1][2] - e[0][2]) * t + j()];
    }
    const HOUSE_EDGES = (() => {
      const E = [], X = 0.72, Z = 0.6, B = -0.85, T = 0.05, RX = 0.84, RY = 0.82, RZ = 0.68;
      [[-X, -Z], [X, -Z], [X, Z], [-X, Z]].forEach((c, i, a) => {
        const n = a[(i + 1) % 4];
        E.push([[c[0], B, c[1]], [n[0], B, n[1]]], [[c[0], T, c[1]], [n[0], T, n[1]]], [[c[0], B, c[1]], [c[0], T, c[1]]]);
      });
      E.push([[0, RY, -RZ], [0, RY, RZ]]);
      [-RZ, RZ].forEach((z) => { E.push([[-RX, T, z], [0, RY, z]], [[RX, T, z], [0, RY, z]], [[-RX, T, z], [RX, T, z]]); });
      [-RX, RX].forEach((x) => { E.push([[x, T, -RZ], [x, T, RZ]]); });
      E.push([[-0.16, B, Z], [-0.16, -0.32, Z]], [[0.16, B, Z], [0.16, -0.32, Z]], [[-0.16, -0.32, Z], [0.16, -0.32, Z]]);
      E.push([[0.32, -0.45, Z], [0.58, -0.45, Z]], [[0.32, -0.2, Z], [0.58, -0.2, Z]], [[0.32, -0.45, Z], [0.32, -0.2, Z]], [[0.58, -0.45, Z], [0.58, -0.2, Z]]);
      E.push([[-0.58, -0.45, Z], [-0.32, -0.45, Z]], [[-0.58, -0.2, Z], [-0.32, -0.2, Z]], [[-0.58, -0.45, Z], [-0.58, -0.2, Z]], [[-0.32, -0.45, Z], [-0.32, -0.2, Z]]);
      return E;
    })();
    function house() {
      const out = [], X = 0.72, Z = 0.6, B = -0.85, T = 0.05, RX = 0.84, RY = 0.82, RZ = 0.68;
      for (let i = 0; i < N; i++) {
        let p;
        if (rnd() < 0.55) p = onEdges(HOUSE_EDGES);
        else {
          const s = rnd(), u = rnd() * 2 - 1, wy = B + rnd() * (T - B);
          if (s < 0.18) p = [u * X, wy, Z];
          else if (s < 0.32) p = [u * X, wy, -Z];
          else if (s < 0.44) p = [X, wy, u * Z];
          else if (s < 0.56) p = [-X, wy, u * Z];
          else if (s < 0.84) { const q = rnd(), side = rnd() < 0.5 ? 1 : -1; p = [side * RX * (1 - q), T + q * (RY - T), u * RZ]; }
          else { const q = rnd(), z = rnd() < 0.5 ? RZ : -RZ, half = (1 - q) * RX; p = [(rnd() * 2 - 1) * half, T + q * (RY - T), z]; }
        }
        out.push([p[0] * 0.9, p[1] * 0.9 - 0.02, p[2] * 0.9]);
      }
      return out;
    }
    function initials() {
      const oc = document.createElement("canvas");
      oc.width = 420; oc.height = 220;
      const ox = oc.getContext("2d");
      ox.fillStyle = "#fff";
      ox.font = "700 210px Geist, Arial, sans-serif";
      ox.textAlign = "center"; ox.textBaseline = "middle";
      ox.fillText("KP", 210, 118);
      const data = ox.getImageData(0, 0, 420, 220).data, filled = [];
      for (let y = 0; y < 220; y += 2) for (let x = 0; x < 420; x += 2) if (data[(y * 420 + x) * 4 + 3] > 128) filled.push([x, y]);
      const out = [];
      for (let i = 0; i < N; i++) {
        const f = filled.length ? filled[Math.floor(rnd() * filled.length)] : [210, 110];
        out.push([(f[0] - 210) / 140, -(f[1] - 110) / 140, (rnd() - 0.5) * 0.18]);
      }
      return out;
    }

    const shapes = [sphere(), cylinder(), house(), initials()];
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { shapes[3] = initials(); });
    const perm = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const cur = shapes[0].map((p) => p.slice());
    let from = cur.map((p) => p.slice());
    let idx = 0, morphStart = -1e9, lastSwitch = performance.now(), tilt = 0;
    let W = 0, H = 0, CX = 0, CY = 0, R = 0, mouse = null, visible = true, rafId = 0, paused = false;

    const tabs = SHAPES.map((s, i) => {
      const b = el("button", "morph-tab", s.name);
      b.type = "button";
      b.setAttribute("aria-pressed", String(i === 0));
      b.addEventListener("click", () => go(i));
      tabsEl.append(b);
      return b;
    });

    function go(i) {
      from = cur.map((p) => p.slice());
      idx = i;
      morphStart = reduceMotion ? -1e9 : performance.now();
      lastSwitch = performance.now();
      tabs.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      captionEl.textContent = SHAPES[i].caption;
      if (reduceMotion) { shapes[i].forEach((p, k) => { const t = shapes[i][perm[k]]; cur[k][0] = t[0]; cur[k][1] = t[1]; cur[k][2] = t[2]; }); }
      kick();
    }

    function layout() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const compact = W < 700;
      CX = W * (compact ? 0.5 : 0.58);
      CY = H * (compact ? 0.47 : 0.48);
      R = compact ? Math.min(W * 0.36, H * 0.21) : Math.min(W * 0.19, H * 0.25);
    }

    function draw(now) {
      if (!W) return;
      if (!reduceMotion && !paused && now - lastSwitch > 4800) go((idx + 1) % SHAPES.length);
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(CX, CY, 10, CX, CY, R * 1.7);
      g.addColorStop(0, "rgba(90,130,255,0.10)"); g.addColorStop(1, "rgba(90,130,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const k = Math.min(1, (now - morphStart) / 1500);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const target = shapes[idx];
      const want = mouse ? (mouse.x / W - 0.5) * 0.8 : 0;
      tilt += (want - tilt) * 0.05;
      const ry = (reduceMotion ? 0.35 : Math.sin(now / 2600) * 0.65) + tilt;
      const rx = -0.18 + (mouse ? (mouse.y / H - 0.5) * 0.4 : 0);
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      for (let i = 0; i < N; i++) {
        const T = target[perm[i]], F = from[i], P = cur[i];
        if (k < 1) { P[0] = F[0] + (T[0] - F[0]) * e; P[1] = F[1] + (T[1] - F[1]) * e; P[2] = F[2] + (T[2] - F[2]) * e; }
        else { P[0] = T[0]; P[1] = T[1]; P[2] = T[2]; }
        const jx = reduceMotion ? 0 : Math.sin(i * 12.9898 + now / 700) * 0.006;
        const x0 = P[0] + jx;
        const x = x0 * cy - P[2] * sy;
        let z = x0 * sy + P[2] * cy;
        const y = P[1] * cx - z * sx;
        z = P[1] * sx + z * cx;
        const f = 3.4 / (3.4 + z), X = CX + x * R * f, Y = CY - y * R * f;
        const a = 0.15 + (1 - (z + 1) / 2) * 0.75;
        ctx.fillStyle = i % 9 === 0 ? "rgba(122,162,255," + a.toFixed(3) + ")" : "rgba(222,228,240," + (a * 0.85).toFixed(3) + ")";
        const sz = 1.4 * f + 0.4;
        ctx.fillRect(X, Y, sz, sz);
      }
    }

    function frame(now) {
      draw(now);
      rafId = visible && !reduceMotion ? requestAnimationFrame(frame) : 0;
    }
    function kick() {
      if (reduceMotion) { requestAnimationFrame((t) => draw(t)); return; }
      if (!rafId && visible) rafId = requestAnimationFrame(frame);
    }

    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (reduceMotion) kick();
    });
    canvas.addEventListener("pointerleave", () => { mouse = null; if (reduceMotion) kick(); });
    canvas.addEventListener("click", () => go((idx + 1) % SHAPES.length));
    tabsEl.addEventListener("pointerenter", () => { paused = true; });
    tabsEl.addEventListener("pointerleave", () => { paused = false; lastSwitch = performance.now(); });

    captionEl.textContent = SHAPES[0].caption;
    layout();
    if ("ResizeObserver" in window) new ResizeObserver(() => { layout(); draw(performance.now()); }).observe(canvas);
    if ("IntersectionObserver" in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) kick(); });
    draw(performance.now());
    kick();
  })();

  /* ---------------- Lineage section: the river ---------------- */
  (function initRiver() {
    const canvas = $("#river");
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0, compact = false, parts = [], mouse = null, visible = false, rafId = 0;
    const srcF = [0.24, 0.5, 0.76], outF = [0.36, 0.64];

    function spawn(anyX) {
      const lane = Math.floor(Math.random() * 3);
      return { x: anyX ? Math.random() * W : -10 - Math.random() * 80, y: srcF[lane] * H + (Math.random() - 0.5) * 30, lane: lane, out: Math.random() < 0.5 ? 0 : 1, o: Math.random() - 0.5, sp: (1.1 + Math.random() * 1.4) * (W / 1200 + 0.3), px: 0, py: 0 };
    }
    const smooth = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));
    function targetY(p) {
      const u = p.x / W, src = srcF[p.lane] * H + p.o * H * 0.12, mid = H * 0.5 + p.o * H * 0.07, out = outF[p.out] * H + p.o * H * 0.12;
      if (u < 0.5) return src + (mid - src) * smooth((u - 0.12) / 0.38);
      return mid + (out - mid) * smooth((u - 0.6) / 0.3);
    }
    function layout() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      compact = W < 640;
      const count = Math.round(Math.min(1400, W * 1.1));
      parts = Array.from({ length: count }, () => spawn(true));
      ctx.fillStyle = "#050608"; ctx.fillRect(0, 0, W, H);
    }
    function labels() {
      const nodes = [
        [W * 0.04, srcF[0] * H, "Python", "l"], [W * 0.04, srcF[1] * H, "SQL", "l"], [W * 0.04, srcF[2] * H, "AI", "l"],
        [W * 0.55, H * 0.5, compact ? "Collibra" : "Collibra, metadata governance", "c"],
        [W * 0.96, outF[0] * H, "Trusted data", "r"], [W * 0.96, outF[1] * H, compact ? "Projects" : "Things I build", "r"]
      ];
      ctx.font = "500 " + (compact ? 12 : 13.5) + "px Geist, system-ui, sans-serif";
      nodes.forEach((n) => {
        ctx.fillStyle = "#050608"; ctx.beginPath(); ctx.arc(n[0], n[1], 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#7aa2ff"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(n[0], n[1], 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#e6eaf3";
        const w = ctx.measureText(n[2]).width;
        const x = n[3] === "l" ? n[0] + 13 : n[3] === "r" ? n[0] - 13 - w : n[0] - w / 2;
        ctx.fillText(n[2], x, n[1] - (n[3] === "c" ? 18 : 11));
      });
    }
    function step(t) {
      ctx.fillStyle = "rgba(5,6,8,0.14)"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.px = p.x; p.py = p.y;
        let vy = (targetY(p) + Math.sin(p.x * 0.012 + t * 1.3 + p.o * 6) * H * 0.02 - p.y) * 0.05, vx = p.sp;
        if (mouse) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < 90 && d > 0.1) { const f = (90 - d) / 90; vx += dx / d * f * 3; vy += dy / d * f * 4; }
        }
        p.x += vx; p.y += vy;
        if (p.x > W + 10) { parts[i] = spawn(false); continue; }
        const u = p.x / W, hot = u > 0.45 && u < 0.65;
        ctx.strokeStyle = hot ? "rgba(170,195,255,0.85)" : u > 0.65 ? "rgba(122,162,255,0.6)" : "rgba(200,206,222,0.45)";
        ctx.lineWidth = hot ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      labels();
    }
    function staticFrame() {
      ctx.fillStyle = "#050608"; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 120; k++) step(k / 60);
    }
    function frame(now) {
      step(now / 1000);
      rafId = visible ? requestAnimationFrame(frame) : 0;
    }
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    canvas.addEventListener("pointerleave", () => { mouse = null; });

    layout();
    if (reduceMotion) staticFrame();
    if ("ResizeObserver" in window) new ResizeObserver(() => { const w = W; layout(); if (reduceMotion || Math.abs(w - W) > 1) staticFrame(); }).observe(canvas);
    if (!reduceMotion && "IntersectionObserver" in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible && !rafId) rafId = requestAnimationFrame(frame); }).observe(canvas);
      document.addEventListener("visibilitychange", () => { if (document.hidden) visible = false; });
    } else if (!reduceMotion) { visible = true; rafId = requestAnimationFrame(frame); }
  })();
})();
