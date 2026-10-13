const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const mdPath = path.join(__dirname, "../SYSTEM_DESIGN_DOCUMENT.md");
const outHtmlRoot = path.join(__dirname, "../SYSTEM_DESIGN_DOCUMENT.html");
const outHtmlPublic = path.join(__dirname, "../public/SYSTEM_DESIGN_DOCUMENT.html");

const mdContent = fs.readFileSync(mdPath, "utf8");

// Custom renderer for Mermaid blocks
const renderer = new marked.Renderer();
const originalCodeRenderer = renderer.code.bind(renderer);

renderer.code = function(code, language) {
  // Handle object signature or string signature in marked v12+
  let codeText = typeof code === "object" ? code.text : code;
  let lang = typeof code === "object" ? code.lang : language;

  if (lang === "mermaid") {
    return `<div class="mermaid-container"><pre class="mermaid">\n${codeText}\n</pre></div>`;
  }
  return `<pre><code class="language-${lang || 'text'}">${escapeHtml(codeText)}</code></pre>`;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true
});

const bodyHtml = marked(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDE-II Backend Architecture: AI-Powered Project Evaluation Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg: #0b1120;
      --surface: #111827;
      --surface-border: #1f293d;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.2);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --code-bg: #060911;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 0;
    }

    @media print {
      body {
        background-color: #fff !important;
        color: #111827 !important;
      }
      .no-print {
        display: none !important;
      }
      .page-container {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      table, pre, code, .mermaid-container {
        page-break-inside: avoid;
      }
      pre, code {
        background: #f3f4f6 !important;
        color: #111827 !important;
        border: 1px solid #e5e7eb !important;
      }
      table {
        color: #111827 !important;
        border-color: #e5e7eb !important;
      }
      th {
        background: #f9fafb !important;
        color: #111827 !important;
      }
      td {
        border-color: #e5e7eb !important;
      }
      h1, h2, h3, h4 {
        color: #111827 !important;
      }
    }

    .top-nav {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(11, 17, 32, 0.88);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--surface-border);
      padding: 0.9rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--accent);
    }

    .nav-actions {
      display: flex;
      gap: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: var(--accent);
      color: #0b1120;
    }
    .btn-primary:hover {
      background: #7dd3fc;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(30, 41, 59, 0.6);
      color: var(--text);
      border-color: var(--surface-border);
    }
    .btn-secondary:hover {
      background: #1e293b;
    }

    .page-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 3rem 2rem 6rem;
    }

    h1 {
      font-size: 2.3rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
      color: #f8fafc;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 1.65rem;
      font-weight: 700;
      margin: 3.5rem 0 1.25rem;
      padding-bottom: 0.6rem;
      border-bottom: 2px solid var(--surface-border);
      color: var(--accent);
    }

    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 0.85rem;
      color: #e2e8f0;
    }

    h4 {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 1.5rem 0 0.5rem;
      color: #cbd5e1;
    }

    p {
      margin-bottom: 1.25rem;
      color: #cbd5e1;
      font-size: 1rem;
    }

    ul, ol {
      margin-bottom: 1.5rem;
      padding-left: 1.75rem;
      color: #cbd5e1;
    }

    li {
      margin-bottom: 0.5rem;
    }

    blockquote {
      border-left: 4px solid var(--accent);
      padding: 0.75rem 1.25rem;
      background: rgba(56, 189, 248, 0.08);
      border-radius: 0 8px 8px 0;
      margin: 1.5rem 0;
      color: #bae6fd;
    }

    hr {
      border: 0;
      height: 1px;
      background: var(--surface-border);
      margin: 3rem 0;
    }

    .mermaid-container {
      background: #060911;
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 1.75rem;
      margin: 2rem 0;
      overflow-x: auto;
      display: flex;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      font-size: 0.9rem;
      background: rgba(17, 24, 39, 0.6);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--surface-border);
    }

    th, td {
      padding: 0.85rem 1rem;
      text-align: left;
      border: 1px solid var(--surface-border);
    }

    th {
      background: #111827;
      color: var(--accent);
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.4);
    }

    pre {
      background: var(--code-bg);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 1.25rem;
      overflow-x: auto;
      margin: 1.5rem 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.55;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      background: rgba(51, 65, 85, 0.5);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #38bdf8;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: #e2e8f0;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>

  <header class="top-nav no-print">
    <div class="nav-brand">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      AlmaBetter AI Evaluation Platform &bull; Architecture Specification
    </div>
    <div class="nav-actions">
      <a href="http://localhost:5000" target="_blank" class="btn btn-secondary">Open Interactive PoC App</a>
      <button onclick="window.print()" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print / Save to PDF
      </button>
    </div>
  </header>

  <main class="page-container">
    ${bodyHtml}
  </main>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#060911',
        primaryColor: '#1e293b',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#38bdf8',
        lineColor: '#94a3b8',
        secondaryColor: '#334155',
        tertiaryColor: '#0b1120'
      }
    });
  </script>
</body>
</html>
`;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

fs.writeFileSync(outHtmlRoot, fullHtml, "utf8");
fs.writeFileSync(outHtmlPublic, fullHtml, "utf8");
console.log("Successfully compiled SYSTEM_DESIGN_DOCUMENT.html to project root and public/");
