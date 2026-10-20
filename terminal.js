(() => {
  "use strict";

  // The pop-up terminal. All of the text lives in content.js.
  const { LANGS, PROFILE, LINEAGE } = window.SITE;

  const PREVIEW = false; // the preview build flips this so the form never posts

  const LOGO = [
    "██╗  ██╗██████╗ ",
    "██║ ██╔╝██╔══██╗",
    "█████╔╝ ██████╔╝",
    "██╔═██╗ ██╔═══╝ ",
    "██║  ██╗██║     ",
    "╚═╝  ╚═╝╚═╝     "
  ];

  const SECTIONS = ["about", "projects", "lineage", "work", "contact"];

  const FILES = {
    "about.md": "about",
    "skills.json": "skills",
    "experience.log": "experience",
    "projects.md": "projects",
    "links.txt": "links",
    "contact.sh": "contact"
  };

  const FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏".split("");

  /* ---------- dom + helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const screen = $("screen");
  const input = $("cmd");
  const ps1 = $("ps1");
  const ghost = $("ghost");
  const form = $("prompt-form");
  const sbMode = $("sb-mode");
  const term = $("term");
  const sbClock = $("sb-clock");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = window.matchMedia("(hover: none)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const span = (text, cls) => el("span", cls, text);
  const line = (...kids) => { const d = el("div", "line"); d.append(...kids); return d; };
  const isTodo = (s) => s.trim().startsWith("[");
  const todo = (s) => (isTodo(s) ? " todo" : "");

  const extLink = (url, text) => {
    const a = el("a", "", text || url);
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    return a;
  };
  const mailLink = () => { const a = el("a", "", PROFILE.email); a.href = "mailto:" + PROFILE.email; return a; };
  const cmdLink = (name, label) => {
    const b = el("button", "cmd-link", label || name);
    b.type = "button"; b.dataset.cmd = name;
    return b;
  };
  const kv = (k, v) => {
    const d = el("div", "kv");
    d.append(span(k, "k"), typeof v === "string" ? span(v) : v);
    return d;
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  const seenBoot = () => { try { return sessionStorage.getItem("kp-booted") === "1"; } catch (e) { return false; } };
  const markBoot = () => { try { sessionStorage.setItem("kp-booted", "1"); } catch (e) { /* ignore */ } };

  function print(...nodes) {
    const b = el("div", "block");
    b.append(...nodes);
    screen.append(b);
    return b;
  }

  const promptNodes = () => [
    span(PROFILE.handle, "p-user"), span("@" + PROFILE.host, "p-host"), " ", span("~", "p-path"), " ", span("$", "p-sign")
  ];
  const labelNodes = (label) => [span(label, "p-user"), " ", span("›", "p-sign")];
  const setPrompt = (nodes) => ps1.replaceChildren(...nodes);

  function echo(text, nodes) {
    const d = el("div", "line echo");
    d.append(...(nodes || promptNodes()), " ", span(text, "typed"));
    screen.append(d);
    return d;
  }

  // Scroll so a long answer starts at its command; short answers stay pinned to the bottom.
  function settle(startEl) {
    if (!startEl || !startEl.isConnected) { screen.scrollTop = screen.scrollHeight; return; }
    const startY = startEl.getBoundingClientRect().top - screen.getBoundingClientRect().top + screen.scrollTop;
    if (startY > 0 && screen.scrollHeight - startY > screen.clientHeight) screen.scrollTop = startY - 12;
    else screen.scrollTop = screen.scrollHeight;
  }

  function setMode(name) { sbMode.textContent = name; }
  function focusInput() { if (!touch && !input.disabled) input.focus({ preventScroll: true }); }

  /* ---------- command output ---------- */
  function intro() {
    const wrap = el("div", "fetch");
    const logo = el("pre", "logo", LOGO.join("\n"));
    logo.setAttribute("aria-hidden", "true");
    const info = el("div", "fetch-info");
    info.append(
      line(span(PROFILE.handle, "acc strong"), span("@" + PROFILE.host, "strong")),
      el("div", "rule", "─".repeat(PROFILE.handle.length + PROFILE.host.length + 1)),
      kv("role", PROFILE.role),
      kv("focus", PROFILE.focus),
      kv("building", PROFILE.platform),
      kv("experience", PROFILE.years + " years"),
      kv("languages", LANGS.join(", ")),
      kv("email", mailLink())
    );
    PROFILE.links.filter((l) => l.url).forEach((l) => info.append(kv(l.label.toLowerCase(), extLink(l.url, l.url.replace(/^https?:\/\//, "")))));
    const sw = el("div", "swatches");
    sw.setAttribute("aria-hidden", "true");
    ["var(--t-acc)", "var(--t-acc2)", "var(--t-cyan)", "var(--t-mint)", "var(--t-rose)", "var(--t-violet)", "var(--t-fg)", "var(--t-dim)"].forEach((c) => {
      const i = el("i"); i.style.background = c; sw.append(i);
    });
    info.append(sw);
    wrap.append(logo, info);
    print(wrap);

    const pillars = [];
    PROFILE.pillars.forEach((p, i) => { if (i) pillars.push(span("  |  ", "dim")); pillars.push(span(p, "acc")); });
    print(el("div", "t-hero", PROFILE.tagline), line(...pillars));

    print(line(
      span(touch ? "Tap a command below to explore." : "Type ", "dim"),
      ...(touch ? [] : [cmdLink("help"), span(", or tap a command below.", "dim")])
    ));
  }

  const COMMANDS = [
    { name: "about", desc: "who I am", run: about },
    { name: "skills", desc: "languages and strengths", run: skills },
    { name: "experience", desc: "where I've worked", run: experience },
    { name: "projects", desc: "things I've built", run: projects },
    { name: "contact", desc: "send me a message", run: startContact },
    { name: "open", usage: "open <project>", desc: "details on one project", run: openProject },
    { name: "lineage", desc: "trace example data to its source", run: lineage },
    { name: "links", desc: "where to find me", run: links },
    { name: "now", desc: "what I'm working on", run: now },
    { name: "sql", desc: "query my profile", run: sql },
    { name: "neofetch", desc: "show the intro again", run: intro },
    { name: "ls", desc: "list files", run: ls },
    { name: "cat", usage: "cat <file>", desc: "read a file", run: cat },
    { name: "goto", usage: "goto <section>", desc: "jump to part of the page", run: gotoCmd },
    { name: "history", desc: "commands you've run", run: showHistory },
    { name: "clear", desc: "clear the screen (Ctrl+L)", run: () => screen.replaceChildren() },
    { name: "help", desc: "this list", run: help }
  ];
  const EXTRA = { whoami, sudo, exit: exitCmd };
  const ALIASES = { "?": "help", cls: "clear", intro: "neofetch", fetch: "neofetch", dir: "ls" };
  const NAMES = COMMANDS.map((c) => c.name).concat("whoami");

  function resolve(name) {
    const n = ALIASES[name] || name;
    return COMMANDS.find((c) => c.name === n) || (EXTRA[n] ? { name: n, run: EXTRA[n] } : null);
  }

  function help() {
    const rows = COMMANDS.slice().sort((a, b) => {
      const order = ["help", "about", "skills", "experience", "projects", "open", "lineage", "links", "now", "contact", "sql", "goto", "neofetch", "ls", "cat", "history", "clear"];
      return order.indexOf(a.name) - order.indexOf(b.name);
    }).map((c) => {
      const r = el("div", "help-row");
      const left = c.usage ? span(c.usage, "cy") : cmdLink(c.name);
      r.append(left, span(c.desc, "dim"));
      return r;
    });
    print(line(span("Commands", "strong")), ...rows,
      line(span("Tab completes, ↑ ↓ browse history, Ctrl+L clears.", "dim")));
  }

  function about() {
    print(...PROFILE.about.map((p, i) => { const d = line(p); if (i) d.style.marginTop = "10px"; return d; }));
    print(line(span("Next: ", "dim"), cmdLink("skills"), span(", ", "dim"), cmdLink("experience"), span(", ", "dim"), cmdLink("projects"), span(" or ", "dim"), cmdLink("contact"), span(".", "dim")));
  }

  function skills() {
    const rows = PROFILE.skills.map((g) => {
      const r = el("div", "skill-row");
      const tags = el("div", "tags");
      g.items.forEach((t) => tags.append(span(t, "tag" + todo(t))));
      r.append(span(g.label, "k"), tags);
      return r;
    });
    print(...rows);
  }

  function experience() {
    const list = el("div", "timeline");
    PROFILE.experience.forEach((e) => {
      const item = el("div", "tl-item");
      item.append(
        line(span(e.when, "dim" + todo(e.when))),
        line(span(e.title, "strong" + todo(e.title)), span("  at  ", "dim"), span(e.org, "cy" + todo(e.org))),
        line(span(e.summary, "tl-sum" + todo(e.summary)))
      );
      list.append(item);
    });
    print(list);
  }

  function projects() {
    const items = PROFILE.projects.map((p) => {
      const d = el("div", "proj");
      d.append(
        line(span("▸ ", "acc"), cmdLink("open " + p.id, p.name), span("  " + p.status, "dim"), span("   " + p.stack, "cy" + todo(p.stack))),
        el("div", "line proj-sum" + todo(p.summary), p.summary)
      );
      if (p.url) { const l = el("div", "line proj-link"); l.append(extLink(p.url, p.url.replace(/^https?:\/\//, ""))); d.append(l); }
      return d;
    });
    print(...items, line(span("Click a name, or type ", "dim"), span("open <project>", "cy"), span(".", "dim")));
  }

  function findProject(q) {
    q = q.toLowerCase();
    return PROFILE.projects.find((p, i) => String(i + 1) === q || p.id === q || p.name.toLowerCase() === q)
      || PROFILE.projects.find((p) => p.id.startsWith(q) || p.name.toLowerCase().startsWith(q));
  }

  function openProject(args) {
    const q = args.join(" ").trim();
    if (!q) {
      print(line(span("open: which project?", "err")), line(span("Pick one from ", "dim"), cmdLink("projects"), span(".", "dim")));
      return;
    }
    const p = findProject(q);
    if (!p) {
      print(line(span("open: no project called '" + q + "'", "err")), line(span("Pick one from ", "dim"), cmdLink("projects"), span(".", "dim")));
      return;
    }
    const nodes = [
      line(span("▸ ", "acc"), span(p.name, "acc strong"), span("  " + p.status, "dim")),
      kv("stack", span(p.stack, "cy" + todo(p.stack))),
      line(p.summary)
    ];
    (p.details || []).forEach((d) => nodes.push(line(span("• ", "acc"), span(d, todo(d).trim()))));
    if (p.url) { const l = el("div", "line"); l.append(extLink(p.url, p.url.replace(/^https?:\/\//, ""))); nodes.push(l); }
    nodes.push(line(span("Back to ", "dim"), cmdLink("projects"), span(".", "dim")));
    print(...nodes);
  }

  function links() {
    const rows = PROFILE.links.map((l) =>
      kv(l.label.toLowerCase(), l.url ? extLink(l.url, l.url.replace(/^https?:\/\//, "")) : span("[add your " + l.label + " link]", "todo")));
    rows.push(kv("email", mailLink()));
    print(...rows);
  }

  /* Example data for the lineage demo lives in content.js. */
  const ASSETS = LINEAGE;
  function walk(id, next) {
    const out = [];
    let frontier = [id];
    while (frontier.length) {
      const found = ASSETS.filter((x) => frontier.some((f) => next(x, f))).map((x) => x.id).filter((x) => !out.includes(x));
      out.push(...found);
      frontier = found;
    }
    return out;
  }
  const downstream = (id) => walk(id, (x, f) => x.up.includes(f));
  const upstream = (id) => walk(id, (x, f) => ASSETS.find((y) => y.id === f).up.includes(x.id));
  const assetList = (ids) => {
    const s = el("span");
    if (!ids.length) { s.append(span("none", "dim")); return s; }
    ids.forEach((n, i) => { if (i) s.append(", "); s.append(cmdLink("lineage " + n, n)); });
    return s;
  };

  async function lineage(args) {
    const id = (args[0] || "").toLowerCase();
    if (id) {
      const a = ASSETS.find((x) => x.id === id);
      if (!a) {
        print(line(span("lineage: unknown asset '" + args[0] + "'", "err")), line(span("Start from ", "dim"), cmdLink("lineage"), span(".", "dim")));
        return;
      }
      const down = downstream(id);
      print(
        line(span("● ", "acc"), span(a.id, "acc strong"), span("  " + a.kind, "dim")),
        kv("owner", a.owner),
        kv("upstream", assetList(upstream(id))),
        kv("downstream", assetList(down)),
        down.length
          ? line(span("Changing it affects ", "dim"), span(down.length + (down.length === 1 ? " asset" : " assets"), "acc"), span(". Talk to their owners before you ship.", "dim"))
          : line(span("Nothing depends on it, so it is safe to change.", "dim"))
      );
      return;
    }
    busy = true;
    const pause = (ms) => (reduceMotion ? Promise.resolve() : sleep(ms));
    const block = print(line(span("Example data: how a number on a dashboard traces back to its source. Click any asset to see what a change would affect.", "dim")));
    for (let i = 0; i < ASSETS.length; i++) {
      const a = ASSETS[i];
      if (i) { block.append(line(span("│", "dim"))); await pause(140); }
      block.append(line(span("● ", "acc"), cmdLink("lineage " + a.id, a.id), span("   " + a.kind, "dim")));
      screen.scrollTop = screen.scrollHeight;
      await pause(320);
    }
    busy = false;
    focusInput();
  }

  function now() {
    print(
      ...(PROFILE.now || []).map((n) => kv(n.label.toLowerCase(), n.text)),
      line(span("See the rest in ", "dim"), cmdLink("projects"), span(".", "dim"))
    );
  }

  function sql() {
    const cols = ["name", "role", "years", "languages", "platform"];
    const row = [PROFILE.name, PROFILE.role, String(PROFILE.years), LANGS.join(" + "), PROFILE.platform];
    const w = cols.map((c, i) => Math.max(c.length, row[i].length));
    const bar = (l, m, r) => l + w.map((n) => "─".repeat(n + 2)).join(m) + r;
    const cells = (arr) => "│" + arr.map((v, i) => " " + v.padEnd(w[i]) + " ").join("│") + "│";
    const q = line(span("SELECT", "cy strong"), " name, role, years, languages, platform ", span("FROM", "cy strong"), " engineer ", span("WHERE", "cy strong"), " ", span("available", "acc"), " = ", span("TRUE", "cy"), ";");
    const table = el("div", "line sqltable");
    table.textContent = [bar("┌", "┬", "┐"), cells(cols), bar("├", "┼", "┤"), cells(row), bar("└", "┴", "┘")].join("\n");
    print(q, table, line(span("(1 row)", "dim")), line(span("Want it to return more rows? Run ", "dim"), cmdLink("contact"), span(".", "dim")));
  }

  function ls() {
    const files = el("div", "files");
    Object.keys(FILES).forEach((f) => files.append(span(f, f.endsWith(".sh") ? "ok" : "")));
    print(files, line(span("Read one with ", "dim"), span("cat <file>", "cy"), span(".", "dim")));
  }

  function cat(args) {
    if (!args.length) { print(line(span("cat: missing file operand", "err")), line(span("Try ", "dim"), cmdLink("ls"), span(" to see what's here.", "dim"))); return; }
    const target = FILES[args[0].replace(/^\.\//, "")];
    if (!target) { print(line(span("cat: " + args[0] + ": No such file or directory", "err"))); return; }
    resolve(target).run([]);
  }

  function theme(args) {
    const v = (args[0] || "").toLowerCase();
    if (v !== "light" && v !== "dark") {
      const cur = window.KP ? window.KP.effectiveTheme() : "";
      print(line(span("Pick one: ", "dim"), cmdLink("theme light", "light"), span(" or ", "dim"), cmdLink("theme dark", "dark"), cur ? span("  (now " + cur + ")", "dim") : ""));
      return;
    }
    if (window.KP) window.KP.setTheme(v);
    print(line(span("Site theme set to " + v + ".", "dim")));
  }

  function gotoCmd(args) {
    const s = (args[0] || "").toLowerCase();
    if (!SECTIONS.includes(s)) {
      const opts = [];
      SECTIONS.forEach((x, i) => { if (i) opts.push(span(", ", "dim")); opts.push(cmdLink("goto " + x, x)); });
      print(line(span("goto: pick a section: ", "dim"), ...opts));
      return;
    }
    print(line(span("Jumping to " + s + "...", "dim")));
    closeTerm(false);
    const t = document.getElementById(s);
    if (t) t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  let history = [];
  let histIndex = 0;
  function showHistory() {
    if (!history.length) { print(line(span("Nothing yet.", "dim"))); return; }
    print(...history.map((h, i) => line(span(String(i + 1).padStart(3, " "), "dim"), "  " + h)));
  }

  function whoami() {
    print(line(PROFILE.handle + ": " + PROFILE.name + ", " + PROFILE.role + " (" + PROFILE.focus.toLowerCase() + "). Run ", cmdLink("about"), " for the longer version."));
  }
  function sudo() {
    print(line(span(PROFILE.handle + " is not in the sudoers file. This incident will be reported.", "err")), line(span("(Nobody was notified.)", "dim")));
  }
  function exitCmd() {
    print(line(span("logout", "dim")));
    closeTerm();
  }

  /* ---------- contact flow ---------- */
  let flow = null;
  let busy = false;
  const FIELDS = [
    { key: "name", label: "name", ask: "Your name?", check: (v) => (v.length > 0 && v.length <= 100) || "Enter your name (up to 100 characters)." },
    { key: "email", label: "email", ask: "Your email, so I can reply?", check: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200) || "Enter a valid email address, like you@example.com." },
    { key: "message", label: "message", ask: "What would you like to build?", check: (v) => (v.length >= 10 && v.length <= 5000) || "Write at least 10 characters (up to 5000)." }
  ];

  function startContact() {
    if (flow) return;
    flow = { step: 0, data: {} };
    setMode("INSERT");
    print(
      line(span("New message to ", "dim"), span(PROFILE.email, "acc"), span(".", "dim")),
      line(span("Type cancel (or press Ctrl+C) to stop.", "dim"))
    );
    ask();
  }

  function ask() {
    const f = FIELDS[flow.step];
    print(line(span(f.ask, "dim")));
    setPrompt(labelNodes(f.label));
  }

  function endFlow(msg) {
    flow = null;
    setMode("NORMAL");
    setPrompt(promptNodes());
    if (msg) print(line(span(msg, "dim")));
  }

  function handleFlow(raw) {
    const v = raw.trim();
    const label = flow.step < FIELDS.length ? FIELDS[flow.step].label : "send? y/n";
    const echoLine = echo(raw, labelNodes(label));

    if (["cancel", "quit", "exit"].includes(v.toLowerCase())) { endFlow("Cancelled. Nothing was sent."); settle(echoLine); return; }

    if (flow.step < FIELDS.length) {
      const f = FIELDS[flow.step];
      const res = f.check(v);
      if (res !== true) { print(line(span(res, "err"))); settle(echoLine); return; }
      flow.data[f.key] = v;
      flow.step += 1;
      if (flow.step < FIELDS.length) ask();
      else {
        const d = flow.data;
        print(line(span("Ready to send:", "strong")), kv("name", d.name), kv("email", d.email), kv("message", d.message), line(span("Send it? (y/n)", "dim")));
        setPrompt(labelNodes("send? y/n"));
      }
      settle(echoLine);
      return;
    }

    const a = v.toLowerCase();
    if (a === "y" || a === "yes") { send(flow.data); }
    else if (a === "n" || a === "no") { endFlow("Cancelled. Nothing was sent."); }
    else { print(line(span("Answer y or n.", "err"))); }
    settle(echoLine);
  }

  async function send(data) {
    busy = true;
    input.disabled = true;
    const spin = span(FRAMES[0], "acc");
    const status = line(spin, " ", span("Sending...", "dim"));
    print(status);
    settle(status);
    let i = 0;
    const t = setInterval(() => { i += 1; spin.textContent = FRAMES[i % FRAMES.length]; }, 80);
    let ok = false;
    let reason = "";
    try {
      if (PREVIEW) {
        await sleep(900);
        ok = "preview";
      } else {
        const fd = new FormData();
        fd.append("name", data.name); fd.append("email", data.email); fd.append("message", data.message); fd.append("website", "");
        const res = await fetch("contact.php", { method: "POST", headers: { Accept: "application/json" }, body: fd });
        const json = await res.json();
        if (res.ok && json.ok) ok = true; else reason = json.error || "";
      }
    } catch (e) { /* network or server problem, handled below */ }
    clearInterval(t);

    if (ok === "preview") {
      status.replaceChildren(span("✓ ", "ok"), span("Preview only, nothing was sent. On the live site this emails " + PROFILE.email + ".", "dim"));
    } else if (ok) {
      status.replaceChildren(span("✓ ", "ok"), "Message sent. I'll reply to ", span(data.email, "acc"), ".");
    } else {
      status.replaceChildren(span("✗ ", "err"), (reason || "The message didn't send.") + " Email ", mailLink(), " instead.");
    }
    busy = false;
    input.disabled = false;
    endFlow();
    focusInput();
    settle(status);
  }

  /* ---------- running commands ---------- */
  function runCommand(raw) {
    const echoLine = echo(raw);
    const text = raw.trim();
    if (!text) return;
    if (history[history.length - 1] !== text) history.push(text);
    histIndex = history.length;

    const [name, ...args] = text.split(/\s+/);
    const cmd = resolve(name.toLowerCase());
    if (!cmd) {
      print(line(span(name + ": command not found", "err")), line(span("Type ", "dim"), cmdLink("help"), span(" to see what's available.", "dim")));
    } else {
      cmd.run(args);
    }
    settle(echoLine);
  }

  /* ---------- autocomplete ---------- */
  function candidates(value) {
    const parts = value.split(" ");
    if (parts.length === 1) return { base: "", token: parts[0], list: NAMES };
    if (parts.length === 2 && parts[0] === "cat") return { base: "cat ", token: parts[1], list: Object.keys(FILES) };
    if (parts.length === 2 && parts[0] === "open") return { base: "open ", token: parts[1], list: PROFILE.projects.map((p) => p.id) };
    if (parts.length === 2 && parts[0] === "lineage") return { base: "lineage ", token: parts[1], list: ASSETS.map((x) => x.id) };
    if (parts.length === 2 && parts[0] === "goto") return { base: "goto ", token: parts[1], list: SECTIONS };
    return null;
  }

  function suggestion(value) {
    if (flow || !value || /^\s/.test(value)) return "";
    const c = candidates(value);
    if (!c || !c.token) return "";
    const m = c.list.find((x) => x.startsWith(c.token) && x !== c.token);
    return m ? m.slice(c.token.length) : "";
  }

  function renderGhost() {
    const s = suggestion(input.value);
    ghost.replaceChildren(...(s ? [span(input.value, "g-hid"), span(s, "g-sug")] : []));
  }

  function commonPrefix(list) {
    return list.reduce((p, x) => { let i = 0; while (i < p.length && p[i] === x[i]) i += 1; return p.slice(0, i); }, list[0]);
  }

  function complete() {
    const c = candidates(input.value);
    if (!c) return;
    const matches = c.list.filter((x) => x.startsWith(c.token));
    if (!matches.length) return;
    const prefix = commonPrefix(matches);
    if (matches.length === 1) input.value = c.base + matches[0] + " ";
    else if (prefix.length > c.token.length) input.value = c.base + prefix;
    else {
      const e = echo(input.value);
      print(line(...matches.flatMap((m, i) => (i ? ["   ", span(m, "cy")] : [span(m, "cy")]))));
      settle(e);
    }
    renderGhost();
  }

  /* ---------- input handling ---------- */
  input.addEventListener("input", () => { histIndex = history.length; renderGhost(); });

  input.addEventListener("keydown", (e) => {
    const key = e.key;
    const ctrl = e.ctrlKey && !e.metaKey;
    if (ctrl && key.toLowerCase() === "l") { e.preventDefault(); screen.replaceChildren(); return; }
    if (ctrl && key.toLowerCase() === "c" && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      if (flow) { echo(input.value + "^C", labelNodes(flow.step < FIELDS.length ? FIELDS[flow.step].label : "send? y/n")); endFlow("Cancelled. Nothing was sent."); }
      else echo(input.value + "^C");
      input.value = ""; renderGhost(); settle();
      return;
    }
    if (key === "Escape") { if (input.value) { input.value = ""; renderGhost(); } else closeTerm(); return; }
    if (flow) return;
    if (key === "Tab") { e.preventDefault(); complete(); return; }
    if (key === "ArrowRight" && input.selectionStart === input.value.length) {
      const s = suggestion(input.value);
      if (s) { e.preventDefault(); input.value += s; renderGhost(); }
      return;
    }
    if (key === "ArrowUp" && history.length) {
      e.preventDefault(); histIndex = Math.max(0, histIndex - 1); input.value = history[histIndex]; renderGhost();
    } else if (key === "ArrowDown" && history.length) {
      e.preventDefault(); histIndex = Math.min(history.length, histIndex + 1); input.value = history[histIndex] || ""; renderGhost();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy || input.readOnly) return;
    const v = input.value;
    input.value = "";
    renderGhost();
    if (flow) handleFlow(v); else runCommand(v);
  });

  term.addEventListener("click", (e) => {
    const t = e.target.closest("[data-cmd]");
    if (!t) return;
    if (busy || input.readOnly) return;
    if (flow) { focusInput(); return; }
    runCommand(t.dataset.cmd);
    focusInput();
  });

  screen.addEventListener("click", (e) => {
    if (touch || e.target.closest("a, button")) return;
    const sel = window.getSelection();
    if (sel && sel.toString()) return;
    focusInput();
  });

  /* ---------- status clock ---------- */
  const clockFmt = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" });
  const tick = () => { sbClock.textContent = clockFmt.format(new Date()); };
  tick();
  setInterval(tick, 15000);

  /* ---------- boot ---------- */
  async function boot() {
    input.readOnly = true;
    setMode("BOOT");
    let skipped = reduceMotion || seenBoot();
    const skip = () => { skipped = true; };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    const wait = (ms) => (skipped ? Promise.resolve() : sleep(ms));

    if (!skipped) {
      const steps = ["loading profile", "connecting to " + PROFILE.platform.toLowerCase() + " catalog"];
      for (const s of steps) {
        print(line(span("[ ", "dim"), span(" ok ", "ok"), span(" ]", "dim"), "  " + s));
        await wait(170);
      }
      await wait(320);
      screen.replaceChildren();
      for (const ch of "neofetch") { input.value += ch; renderGhost(); await wait(70); }
      await wait(260);
    }

    input.value = "";
    renderGhost();
    runCommand("neofetch");
    window.removeEventListener("keydown", skip);
    window.removeEventListener("pointerdown", skip);
    markBoot();
    input.readOnly = false;
    setMode("NORMAL");
    focusInput();
  }

  /* ---------- open / close ---------- */
  let booted = false;
  let lastFocus = null;
  function setExpanded(v) {
    document.querySelectorAll("[data-term-open]").forEach((b) => b.setAttribute("aria-expanded", String(v)));
    document.body.classList.toggle("term-open", v);
  }
  function openTerm() {
    if (!term.hidden && term.classList.contains("is-open")) { focusInput(); return; }
    lastFocus = document.activeElement;
    term.hidden = false;
    void term.offsetWidth;
    term.classList.add("is-open");
    setExpanded(true);
    if (!booted) { booted = true; boot(); } else { focusInput(); settle(); }
  }
  function closeTerm(restoreFocus) {
    if (term.hidden) return;
    term.classList.remove("is-open");
    setExpanded(false);
    const done = () => { if (!term.classList.contains("is-open")) term.hidden = true; };
    if (reduceMotion) done(); else setTimeout(done, 200);
    if (restoreFocus !== false && lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function toggleTerm() { if (term.hidden) openTerm(); else closeTerm(); }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-term-open]");
    if (!b) return;
    e.preventDefault();
    openTerm();
  });
  $("term-close").addEventListener("click", () => closeTerm());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "`" || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const typingElsewhere = t && t !== input && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (typingElsewhere) return;
    e.preventDefault();
    toggleTerm();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !term.hidden && e.target !== input) closeTerm();
  });

  window.KPTerminal = { open: openTerm, close: closeTerm, toggle: toggleTerm };
})();
