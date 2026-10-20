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

  /* ---------------- Hero: the 3D data universe ---------------- */
  const NODES = [
    { label: "Python", lon: 0.2, lat: 0.55, to: "work" },
    { label: "SQL", lon: -0.5, lat: 0.35, to: "work" },
    { label: "Collibra", lon: 0.9, lat: 0.1, to: "lineage" },
    { label: "Metadata governance", short: "Metadata", lon: 1.6, lat: -0.35, to: "lineage" },
    { label: "Lineage", lon: 2.3, lat: 0.25, to: "lineage" },
    { label: "AI", lon: 3.0, lat: -0.55, to: "about" },
    { label: "Home Assistant", lon: 3.8, lat: 0.45, to: "project-dashboard" },
    { label: "Pi 5 case", lon: 4.5, lat: -0.15, to: "project-pi-case" },
    { label: "3D dashboard", lon: 5.2, lat: 0.6, to: "project-dashboard" },
    { label: "YouTube + TikTok", short: "Videos", lon: 5.8, lat: -0.6, to: "project-content" }
  ];
  const LINKS = [[0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [5, 8], [6, 8], [7, 8], [8, 9], [0, 6], [5, 9]];
  const destName = { work: "Experience", about: "About", lineage: "the lineage demo" };

  function goTo(target) {
    const t = document.getElementById(target);
    if (!t) return;
    const isCard = target.startsWith("project-");
    t.scrollIntoView({ behavior: smooth(), block: isCard ? "center" : "start" });
    if (isCard && t.animate && !reduceMotion) {
      t.animate([{ boxShadow: "0 0 0 0 rgba(122,162,255,0)" }, { boxShadow: "0 0 0 8px rgba(122,162,255,.25)" }, { boxShadow: "0 0 0 0 rgba(122,162,255,0)" }], { duration: 1300, delay: 450 });
    }
  }

  (function initGlobe() {
    const canvas = $("#globe");
    const focusEl = $("#globe-focus");
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return;
    const idleText = finePointer ? "Hover a point." : "Tap a point.";
    focusEl.textContent = idleText;

    const pts = [];
    const N = 900, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = ga * i;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    const nodes = NODES.map((n) => { const c = Math.cos(n.lat); return Object.assign({}, n, { p: [Math.cos(n.lon) * c * 1.06, Math.sin(n.lat) * 1.06, Math.sin(n.lon) * c * 1.06] }); });

    let W = 0, H = 0, CX = 0, CY = 0, R = 0, compact = false;
    let rotY = 0.6, rotX = -0.3, vel = 0;
    let drag = null, mouse = null, hover = null, tapped = null;
    let visible = true, rafId = 0, lastDraw = 0;
    let P = [];

    function layout() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      compact = W < 700;
      CX = W * (compact ? 0.5 : 0.56);
      CY = H * (compact ? 0.53 : 0.5);
      R = compact ? Math.min(W * 0.4, H * 0.27) : Math.min(W * 0.28, H * 0.3);
    }

    function project(p) {
      const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
      let x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy;
      const y = p[1] * cx - z * sx; z = p[1] * sx + z * cx;
      const f = 3.2 / (3.2 + z);
      return { x: CX + x * R * f, y: CY + y * R * f, z: z, f: f };
    }

    function setHover(k) {
      if (hover === k) return;
      hover = k;
      canvas.style.cursor = k == null ? "grab" : "pointer";
      if (k == null) { focusEl.textContent = idleText; return; }
      const n = nodes[k];
      const dest = n.to.startsWith("project-") ? "the project" : (destName[n.to] || n.to);
      focusEl.textContent = n.label + (finePointer || tapped === k ? ". Click to see " + dest + "." : ". Tap again to see " + dest + ".");
    }

    function draw(now) {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(CX, CY, 10, CX, CY, R * 1.5);
      g.addColorStop(0, "rgba(90,130,255,0.11)"); g.addColorStop(1, "rgba(90,130,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < pts.length; i++) {
        const q = project(pts[i]);
        const a = 0.08 + (1 - (q.z + 1) / 2) * 0.7;
        const v = Math.round(200 + 40 * ((pts[i][1] + 1) / 2));
        ctx.fillStyle = "rgba(" + v + "," + v + "," + Math.min(255, v + 20) + "," + (a * 0.85).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(q.x, q.y, 0.7 + q.f * 0.7, 0, Math.PI * 2); ctx.fill();
      }

      P = nodes.map((n) => project(n.p));
      if (mouse && !drag) {
        let best = null, bd = 28;
        P.forEach((q, k) => { const d = Math.hypot(q.x - mouse.x, q.y - mouse.y); if (q.z < 0.4 && d < bd) { bd = d; best = k; } });
        setHover(best);
      }

      LINKS.forEach((l, k) => {
        const A = P[l[0]], B = P[l[1]];
        const on = hover != null && (l[0] === hover || l[1] === hover);
        const a = on ? 0.95 : 0.1 + (1 - ((A.z + B.z) / 2 + 1) / 2) * 0.3;
        const mx = (A.x + B.x) / 2 - (CX - (A.x + B.x) / 2) * 0.12, my = (A.y + B.y) / 2 - (CY - (A.y + B.y) / 2) * 0.12;
        ctx.strokeStyle = "rgba(122,162,255," + a.toFixed(3) + ")"; ctx.lineWidth = on ? 1.6 : 0.9;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
        if (!reduceMotion) {
          const t = ((now / 2000) + k * 0.23) % 1, u = 1 - t;
          ctx.fillStyle = "rgba(170,195,255," + Math.min(1, a + 0.2).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(u * u * A.x + 2 * u * t * mx + t * t * B.x, u * u * A.y + 2 * u * t * my + t * t * B.y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      });

      ctx.font = "500 " + (compact ? 12 : 13) + "px Geist, system-ui, sans-serif";
      ctx.textBaseline = "alphabetic";
      P.forEach((q, k) => {
        const front = 1 - (q.z + 1) / 2, on = k === hover;
        ctx.globalAlpha = on ? 1 : Math.max(0.08, front * front * 1.05);
        ctx.fillStyle = "#7aa2ff";
        ctx.beginPath(); ctx.arc(q.x, q.y, on ? 5.5 : 2.6 + front * 1.8, 0, Math.PI * 2); ctx.fill();
        if (on) { ctx.strokeStyle = "#7aa2ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q.x, q.y, 14, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = on ? "#ffffff" : "rgb(196,204,222)";
        const label = compact && nodes[k].short ? nodes[k].short : nodes[k].label;
        const tw = ctx.measureText(label).width;
        const lx = q.x + 11 + tw > W - 8 ? q.x - 11 - tw : q.x + 11;
        ctx.fillText(label, lx, q.y - 9);
        ctx.globalAlpha = 1;
      });
    }

    function frame(now) {
      if (!drag && !reduceMotion) { rotY += 0.0012 + vel; vel *= 0.95; }
      else if (!drag && Math.abs(vel) > 0.0001) { rotY += vel; vel *= 0.9; }
      draw(now);
      lastDraw = now;
      rafId = visible ? requestAnimationFrame(frame) : 0;
    }
    function kick() { if (!rafId && visible) rafId = requestAnimationFrame(frame); }

    const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener("pointerdown", (e) => {
      drag = { start: local(e), last: local(e), moved: false, id: e.pointerId, type: e.pointerType };
      vel = 0;
      if (e.pointerType === "mouse") { canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = local(e);
      if (e.pointerType === "mouse") mouse = p;
      if (drag && drag.id === e.pointerId) {
        const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
        if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 4) drag.moved = true;
        rotY += dx * 0.006;
        if (drag.type === "mouse") rotX = Math.max(-1.1, Math.min(1.1, rotX + dy * 0.004));
        vel = dx * 0.0006;
        drag.last = p;
      }
      kick();
    });
    const end = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const wasClick = !drag.moved;
      const p = local(e);
      drag = null;
      canvas.style.cursor = hover == null ? "grab" : "pointer";
      if (!wasClick || e.type === "pointercancel") return;
      let best = null, bd = finePointer ? 28 : 36;
      P.forEach((q, k) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (q.z < 0.4 && d < bd) { bd = d; best = k; } });
      if (best == null) { tapped = null; if (!finePointer) setHover(null); return; }
      if (!finePointer && tapped !== best) { tapped = best; hover = null; setHover(best); kick(); return; }
      tapped = null;
      goTo(nodes[best].to);
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { mouse = null; if (!drag) setHover(null); } });

    // Keyboard and screen reader access to the same points.
    const list = $("#globe-nodes");
    nodes.forEach((n, k) => {
      const li = el("li");
      const b = el("button", "", n.label);
      b.type = "button";
      b.addEventListener("focus", () => { setHover(k); kick(); });
      b.addEventListener("blur", () => setHover(null));
      b.addEventListener("click", () => goTo(n.to));
      li.append(b);
      list.append(li);
    });

    layout();
    if ("ResizeObserver" in window) new ResizeObserver(() => { layout(); if (!rafId) draw(performance.now()); }).observe(canvas);
    else window.addEventListener("resize", () => { layout(); draw(performance.now()); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) kick(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) kick(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!rafId) draw(performance.now()); });
    draw(performance.now());
    kick();
  })();
})();
