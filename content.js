/* ================================================================
   YOUR CONTENT. This is the only file you need to edit to change the
   text on your site. The page and the terminal both read from it.

   - Anything wrapped in [square brackets] shows as a dim placeholder.
   - To add a project, copy one { ... } block in "projects" and edit it.
     "status" can be "live" or anything else (for example "in the works").
     "id" is the short name used in the terminal: open kingpra
   - To add a link, fill in its "url" under "links". Empty links stay hidden
     on the page.
   ================================================================ */
(function () {
  var LANGS = ["Python", "SQL"];

  var PROFILE = {
    handle: "king",
    host: "kingpra",
    name: "King Pra",
    role: "Software Engineer",
    focus: "Metadata governance",
    platform: "Collibra",
    years: 7,
    email: "info@kingpra.com",
    tagline: "Data you can trust.",
    pillars: ["Python", "SQL", "Metadata governance"],

    // The paragraph under your name at the top of the page.
    lede: "Software engineer with 7 years of Python and SQL, building metadata governance features for Collibra. Lately I've been building projects with AI.",

    about: [
      "I'm King Pra, a software engineer with 7 years of experience, mostly in Python and SQL. I build features for Collibra, a data governance platform, with a focus on metadata governance: helping organizations find their data, understand it, and decide who is responsible for it.",
      "For the past couple of months I've been going deep on building projects with AI, and I'm creating content for YouTube and TikTok. This portfolio is one of those projects."
    ],

    // The "Right now" card.
    now: [
      { label: "Day job", text: "Python and SQL features for Collibra, focused on metadata governance" },
      { label: "Learning", text: "Building real projects with AI, start to finish" },
      { label: "Creating", text: "Content for YouTube and TikTok" },
      { label: "Next", text: "An interactive 3D Home Assistant dashboard" },
      { label: "Hardware", text: "A 3D-printed Raspberry Pi 5 touchscreen case to run Home Assistant on" }
    ],

    skills: [
      { label: "Languages", items: LANGS },
      { label: "Domain", items: ["Metadata governance", "Data governance", "Collibra"] },
      { label: "Also", items: ["AI-assisted development"] },
      { label: "Tools", items: ["[add frameworks]", "[add databases]", "[add tooling]"] }
    ],

    experience: [
      { when: "[Start] to Present", title: "Software Engineer", org: "[Company]", summary: "[One or two sentences on a Collibra feature you built and who uses it. Numbers help: users affected, query time saved, data volume.]" },
      { when: "[Start] to [End]", title: "[Job title]", org: "[Company]", summary: "[One or two sentences on what you built and the result.]" }
    ],

    projects: [
      {
        id: "kingpra",
        name: "kingpra.com",
        status: "live",
        stack: "HTML, CSS, JavaScript, PHP",
        summary: "This portfolio, with a built-in terminal. I built it with AI assistance as part of my deep dive into AI-built projects.",
        details: [],
        url: "https://kingpra.com"
      },
      {
        id: "dashboard",
        name: "3D Home Assistant dashboard",
        status: "in the works",
        stack: "[Home Assistant, 3D library]",
        summary: "An interactive 3D dashboard for Home Assistant.",
        details: ["[What it controls and shows]", "[What you are building it with]"],
        url: ""
      },
      {
        id: "pi-case",
        name: "Raspberry Pi 5 touchscreen case",
        status: "in the works",
        stack: "[Raspberry Pi 5, 3D printing, CAD tool]",
        summary: "A 3D-printed case with a touchscreen for the Raspberry Pi 5 that runs Home Assistant.",
        details: ["[Screen size]", "[What you designed it in]"],
        url: ""
      },
      {
        id: "content",
        name: "YouTube and TikTok content",
        status: "in the works",
        stack: "[Video tools]",
        summary: "Videos for YouTube and TikTok.",
        details: ["[What you cover]", "[How often you post]"],
        url: ""
      }
      // Add more projects here as you go.
    ],

    // Fill in "url" to show a link. Empty ones stay hidden on the page.
    links: [
      { label: "YouTube", url: "" },
      { label: "TikTok", url: "" },
      { label: "GitHub", url: "" },
      { label: "LinkedIn", url: "" }
    ]
  };

  // Example data for the lineage demo. It is made up, and the page says so.
  var LINEAGE = [
    { id: "orders_raw", kind: "Source table", owner: "Data engineering", up: [] },
    { id: "orders_clean", kind: "SQL transform", owner: "Data engineering", up: ["orders_raw"] },
    { id: "revenue_daily", kind: "Curated table", owner: "Finance", up: ["orders_clean"] },
    { id: "revenue_dashboard", kind: "Report", owner: "Finance leadership", up: ["revenue_daily"] }
  ];

  window.SITE = { LANGS: LANGS, PROFILE: PROFILE, LINEAGE: LINEAGE };
})();
