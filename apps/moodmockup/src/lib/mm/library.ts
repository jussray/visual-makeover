// 24 original SVG reference compositions, authored for this app (no third-party artwork).
export interface LibraryRef {
  id: string;
  name: string;
  style: "minimal" | "editorial" | "bold" | "dark" | "playful" | "organic" | "retro" | "technical";
  description: string;
  w: number;
  h: number;
  body: string;
}

const T = (x: number, y: number, s: number, fill: string, txt: string, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="Georgia, serif" ${extra}>${txt}</text>`;
const S = (x: number, y: number, s: number, fill: string, txt: string, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="Helvetica, Arial, sans-serif" ${extra}>${txt}</text>`;
const bars = (x: number, y: number, w: number, n: number, gap: number, fill: string, h = 6) =>
  Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * gap}" width="${w - (i % 3) * 30}" height="${h}" rx="${h / 2}" fill="${fill}"/>`).join("");

export const LIBRARY: LibraryRef[] = [
  { id: "lib-swiss-grid", name: "Swiss grid", style: "minimal", w: 400, h: 500,
    description: "White page, strict 12-column grid, one red block, tiny black sans labels, lots of empty space.",
    body: `<rect width="400" height="500" fill="#f7f7f5"/>${Array.from({ length: 12 }, (_, i) => `<line x1="${20 + i * 30}" y1="0" x2="${20 + i * 30}" y2="500" stroke="#e4e4e0"/>`).join("")}<rect x="50" y="60" width="150" height="150" fill="#e63322"/>${S(50, 260, 34, "#111", "Raster", 'font-weight="700"')}${bars(50, 290, 240, 4, 14, "#c9c9c4", 4)}${S(50, 470, 10, "#111", "01 — FORM FOLLOWS FUNCTION")}` },
  { id: "lib-paper-whitespace", name: "Paper calm", style: "minimal", w: 400, h: 400,
    description: "Off-white paper, one thin hairline, small centered serif word, extreme whitespace and quiet mood.",
    body: `<rect width="400" height="400" fill="#f3efe7"/><line x1="140" y1="200" x2="260" y2="200" stroke="#8a8274" stroke-width="1"/>${T(200, 185, 22, "#3b362e", "stillness", 'text-anchor="middle" font-style="italic"')}${S(200, 225, 9, "#8a8274", "A QUIET INDEX", 'text-anchor="middle" letter-spacing="3"')}` },
  { id: "lib-mono-cards", name: "Monochrome cards", style: "minimal", w: 400, h: 560,
    description: "Stacked grey cards with soft shadows, rounded corners, single black pill button, product-UI clarity.",
    body: `<rect width="400" height="560" fill="#ececec"/>${[0, 1, 2].map((i) => `<rect x="40" y="${50 + i * 150}" width="320" height="120" rx="20" fill="#fff"/><circle cx="85" cy="${110 + i * 150}" r="22" fill="#d9d9d9"/>${bars(125, 95 + i * 150, 200, 2, 18, "#cfcfcf", 8)}`).join("")}<rect x="140" y="510" width="120" height="34" rx="17" fill="#111"/>` },
  { id: "lib-magazine-spread", name: "Magazine spread", style: "editorial", w: 400, h: 520,
    description: "Editorial layout with giant serif headline, drop cap, two text columns and a duotone photo block.",
    body: `<rect width="400" height="520" fill="#fbf8f2"/>${T(30, 90, 64, "#1c1a17", "The Long", 'font-weight="700"')}${T(30, 150, 64, "#1c1a17", "Summer", 'font-style="italic"')}<rect x="30" y="180" width="340" height="160" fill="#c96f4a"/><circle cx="270" cy="260" r="60" fill="#2c3a4a" opacity=".85"/>${T(30, 400, 46, "#c96f4a", "A")}${bars(70, 370, 120, 7, 14, "#bdb6aa", 4)}${bars(210, 370, 160, 9, 14, "#bdb6aa", 4)}` },
  { id: "lib-newsprint", name: "Newsprint", style: "editorial", w: 400, h: 460,
    description: "Newspaper columns, rule lines, condensed headline, halftone-grey image, dense but ordered text.",
    body: `<rect width="400" height="460" fill="#eeeae1"/>${S(200, 50, 30, "#111", "THE DAILY FORM", 'text-anchor="middle" font-weight="900" letter-spacing="2"')}<line x1="20" y1="65" x2="380" y2="65" stroke="#111" stroke-width="3"/><line x1="20" y1="71" x2="380" y2="71" stroke="#111"/>${Array.from({ length: 60 }, (_, i) => `<circle cx="${40 + (i % 10) * 15}" cy="${100 + Math.floor(i / 10) * 15}" r="${2 + (i % 4)}" fill="#555"/>`).join("")}${bars(200, 95, 180, 10, 14, "#777", 3)}${bars(20, 210, 170, 14, 14, "#777", 3)}${bars(210, 250, 170, 11, 14, "#777", 3)}` },
  { id: "lib-serif-portrait", name: "Gallery label", style: "editorial", w: 400, h: 600,
    description: "Tall framed artwork with arched top, museum caption in small caps, refined cream and oxblood.",
    body: `<rect width="400" height="600" fill="#f2ebe0"/><path d="M80 520V200a120 120 0 0 1 240 0v320z" fill="#6e1f2a"/><path d="M110 500V210a90 90 0 0 1 180 0v290z" fill="#d9b48f"/>${T(200, 565, 16, "#3a2a22", "Plate IV · Oxblood Study", 'text-anchor="middle"')}` },
  { id: "lib-poster-block", name: "Poster blocks", style: "bold", w: 400, h: 500,
    description: "Loud primary color blocks, huge black sans type cropped off the edge, high contrast, confident.",
    body: `<rect width="400" height="500" fill="#ffd400"/><rect x="0" y="300" width="400" height="200" fill="#0047ff"/><rect x="230" y="60" width="140" height="140" fill="#ff3b1f"/>${S(-10, 290, 150, "#111", "GO!", 'font-weight="900"')}${S(20, 470, 18, "#fff", "LOUD BY DEFAULT", 'font-weight="700"')}` },
  { id: "lib-brutalist", name: "Brutalist web", style: "bold", w: 400, h: 460,
    description: "Raw borders, monospace labels, harsh black outlines, acid green highlight, deliberately unpolished.",
    body: `<rect width="400" height="460" fill="#fff"/><rect x="20" y="20" width="360" height="420" fill="none" stroke="#000" stroke-width="4"/><rect x="20" y="20" width="360" height="60" fill="#b6ff00" stroke="#000" stroke-width="4"/>${S(35, 60, 22, "#000", "INDEX.TXT", 'font-family="Courier New, monospace" font-weight="700"')}${[0, 1, 2, 3].map((i) => `<rect x="40" y="${110 + i * 75}" width="320" height="55" fill="none" stroke="#000" stroke-width="3"/>${S(55, 145 + i * 75, 16, "#000", `[0${i + 1}] ENTRY`, 'font-family="Courier New, monospace"')}`).join("")}` },
  { id: "lib-gradient-type", name: "Gradient headline", style: "bold", w: 400, h: 400,
    description: "Saturated warm gradient, oversized rounded sans headline, big pill CTA, energetic launch-page feel.",
    body: `<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5f6d"/><stop offset="1" stop-color="#ffc371"/></linearGradient></defs><rect width="400" height="400" fill="url(#g1)"/>${S(40, 170, 70, "#fff", "Make", 'font-weight="900"')}${S(40, 240, 70, "#fff", "it big.", 'font-weight="900"')}<rect x="40" y="290" width="170" height="54" rx="27" fill="#1d1d1d"/>${S(125, 323, 16, "#fff", "Get started", 'text-anchor="middle" font-weight="700"')}` },
  { id: "lib-night-dashboard", name: "Night dashboard", style: "dark", w: 400, h: 520,
    description: "Deep navy dark UI, glowing cyan line chart, small stat cards, thin dividers, focused data mood.",
    body: `<rect width="400" height="520" fill="#0b1020"/>${[0, 1].map((i) => `<rect x="${24 + i * 182}" y="30" width="170" height="90" rx="14" fill="#151c33"/>${S(44 + i * 182, 70, 12, "#7f8bb3", i ? "SESSIONS" : "REVENUE")}${S(44 + i * 182, 102, 26, "#e9eeff", i ? "8,412" : "$24k", 'font-weight="700"')}`).join("")}<rect x="24" y="140" width="352" height="220" rx="14" fill="#151c33"/><polyline points="44,320 100,280 150,300 200,220 250,240 300,180 356,200" fill="none" stroke="#39e1ff" stroke-width="3"/>${bars(24, 390, 352, 5, 24, "#1d2747", 10)}` },
  { id: "lib-noir-luxury", name: "Noir luxury", style: "dark", w: 400, h: 560,
    description: "Black background, thin gold serif wordmark, centered symmetry, sparse luxury-retail restraint.",
    body: `<rect width="400" height="560" fill="#0d0c0b"/><rect x="40" y="40" width="320" height="480" fill="none" stroke="#b89a5a" stroke-width="1"/>${T(200, 260, 40, "#d9bf86", "MAISON", 'text-anchor="middle" letter-spacing="10"')}<line x1="160" y1="290" x2="240" y2="290" stroke="#b89a5a"/>${S(200, 320, 10, "#8f7c55", "EST. NOWHERE", 'text-anchor="middle" letter-spacing="4"')}` },
  { id: "lib-neon-city", name: "Neon signal", style: "dark", w: 400, h: 460,
    description: "Charcoal base with magenta and electric-blue neon strokes, glow, nightlife and gaming energy.",
    body: `<defs><filter id="gl"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="400" height="460" fill="#141018"/><g filter="url(#gl)" opacity=".8"><circle cx="200" cy="200" r="110" fill="none" stroke="#ff2bd6" stroke-width="8"/><rect x="110" y="320" width="180" height="60" rx="30" fill="none" stroke="#2bb8ff" stroke-width="8"/></g><circle cx="200" cy="200" r="110" fill="none" stroke="#ffc6f4" stroke-width="2"/><rect x="110" y="320" width="180" height="60" rx="30" fill="none" stroke="#c6ecff" stroke-width="2"/>${S(200, 358, 18, "#c6ecff", "OPEN LATE", 'text-anchor="middle" font-weight="700"')}` },
  { id: "lib-sticker-pop", name: "Sticker pop", style: "playful", w: 400, h: 440,
    description: "Bubblegum pink, chunky outlined stickers, stars and smiley shapes, thick black strokes, cheerful.",
    body: `<rect width="400" height="440" fill="#ffd6e8"/><circle cx="130" cy="150" r="80" fill="#ffe14d" stroke="#111" stroke-width="6"/><circle cx="105" cy="135" r="9" fill="#111"/><circle cx="155" cy="135" r="9" fill="#111"/><path d="M95 175q35 30 70 0" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/><path d="M300 90l18 40 44 4-33 29 10 43-39-22-39 22 10-43-33-29 44-4z" fill="#5ad1ff" stroke="#111" stroke-width="6" stroke-linejoin="round"/><rect x="60" y="290" width="280" height="90" rx="45" fill="#ff5fa2" stroke="#111" stroke-width="6" transform="rotate(-4 200 335)"/>${S(200, 348, 34, "#fff", "yay!", 'text-anchor="middle" font-weight="900" transform="rotate(-4 200 335)"')}` },
  { id: "lib-memphis", name: "Memphis shapes", style: "playful", w: 400, h: 400,
    description: "Scattered squiggles, dots, triangles in teal, coral and yellow on white — 80s-inspired pattern play.",
    body: `<rect width="400" height="400" fill="#fffdf7"/><path d="M30 80q20-30 40 0t40 0 40 0" fill="none" stroke="#ff6b5b" stroke-width="8" stroke-linecap="round"/><polygon points="280,40 340,140 220,140" fill="#ffd23f"/><circle cx="110" cy="260" r="60" fill="#2ec4b6"/>${Array.from({ length: 16 }, (_, i) => `<circle cx="${230 + (i % 4) * 30}" cy="${220 + Math.floor(i / 4) * 30}" r="6" fill="#111"/>`).join("")}<rect x="200" y="330" width="160" height="30" fill="#ff6b5b" transform="rotate(12 280 345)"/>` },
  { id: "lib-kids-app", name: "Rounded friendly", style: "playful", w: 400, h: 540,
    description: "Very rounded soft UI, pastel tiles with simple icons, big friendly buttons, approachable for all ages.",
    body: `<rect width="400" height="540" fill="#eef6ff"/>${[["#ffcf8b", 40, 40], ["#a7e3c2", 210, 40], ["#c9b8ff", 40, 210], ["#ffadad", 210, 210]].map(([c, x, y]) => `<rect x="${x}" y="${y}" width="150" height="150" rx="40" fill="${c}"/><circle cx="${(x as number) + 75}" cy="${(y as number) + 65}" r="28" fill="#fff" opacity=".8"/>`).join("")}<rect x="40" y="400" width="320" height="70" rx="35" fill="#3d7bff"/>${S(200, 445, 22, "#fff", "Let's play", 'text-anchor="middle" font-weight="700"')}` },
  { id: "lib-botanical", name: "Botanical", style: "organic", w: 400, h: 560,
    description: "Sage and moss greens, hand-drawn leaf silhouettes, warm linen background, natural wellness feel.",
    body: `<rect width="400" height="560" fill="#efe9dc"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M200 520 Q ${120 + i * 40} ${380 - i * 50} ${80 + i * 60} ${140 + (i % 2) * 40}" fill="none" stroke="#5f7356" stroke-width="3"/><ellipse cx="${80 + i * 60}" cy="${140 + (i % 2) * 40}" rx="26" ry="50" fill="${["#8da47e", "#5f7356", "#a9b98f", "#7b9070", "#c2cfaa"][i]}" transform="rotate(${-30 + i * 15} ${80 + i * 60} ${140 + (i % 2) * 40})"/>`).join("")}` },
  { id: "lib-clay-forms", name: "Clay forms", style: "organic", w: 400, h: 420,
    description: "Terracotta and sand blobs, soft irregular shapes, matte earthy textures, handmade ceramic warmth.",
    body: `<rect width="400" height="420" fill="#e9d8c4"/><path d="M60 300c-30-90 40-190 130-170s120 120 80 190-180 70-210-20z" fill="#c4694a"/><path d="M230 120c40-40 130-20 130 50s-60 90-110 70-60-80-20-120z" fill="#8e4a35"/><circle cx="300" cy="330" r="40" fill="#f2c9a0"/>` },
  { id: "lib-water-gradient", name: "Soft horizon", style: "organic", w: 400, h: 500,
    description: "Misty blue-to-peach gradient horizon, gentle round sun, calm, airy and meditative atmosphere.",
    body: `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd3e6"/><stop offset=".6" stop-color="#f6d7c3"/><stop offset="1" stop-color="#f2b8a0"/></linearGradient></defs><rect width="400" height="500" fill="url(#g2)"/><circle cx="200" cy="300" r="70" fill="#fff4ea" opacity=".9"/><rect x="0" y="330" width="400" height="170" fill="#a8bfd4" opacity=".55"/>${[0, 1, 2].map((i) => `<line x1="${80 + i * 30}" y1="${360 + i * 30}" x2="${320 - i * 30}" y2="${360 + i * 30}" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`).join("")}` },
  { id: "lib-retro-diner", name: "Retro diner", style: "retro", w: 400, h: 460,
    description: "Cherry red and cream stripes, chunky script-like badge, 1950s diner signage, nostalgic friendliness.",
    body: `<rect width="400" height="460" fill="#fff3dc"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 50}" y="0" width="25" height="140" fill="#d7263d"/>`).join("")}<circle cx="200" cy="270" r="110" fill="#d7263d" stroke="#fff3dc" stroke-width="10"/><circle cx="200" cy="270" r="110" fill="none" stroke="#1b998b" stroke-width="4"/>${T(200, 285, 46, "#fff3dc", "Malt &amp; Co", 'text-anchor="middle" font-style="italic" font-weight="700"')}` },
  { id: "lib-70s-wave", name: "70s waves", style: "retro", w: 400, h: 400,
    description: "Mustard, burnt orange and brown concentric rainbow arcs, groovy warm vintage optimism.",
    body: `<rect width="400" height="400" fill="#f4e4c1"/>${["#5b3a29", "#c1502e", "#e8932c", "#f2c14e"].map((c, i) => `<path d="M${40 + i * 30} 360 a${160 - i * 30} ${160 - i * 30} 0 0 1 ${320 - i * 60} 0" fill="none" stroke="${c}" stroke-width="28"/>`).join("")}` },
  { id: "lib-pixel", name: "Pixel arcade", style: "retro", w: 400, h: 420,
    description: "Chunky pixel grid characters, limited 4-color palette, 8-bit game screen nostalgia.",
    body: `<rect width="400" height="420" fill="#1e1b3a"/>${"0011110001111110110110111111111101111110001001000100001001000000".split("").map((b, i) => (b === "1" ? `<rect x="${120 + (i % 8) * 20}" y="${80 + Math.floor(i / 8) * 20}" width="20" height="20" fill="#7cf29a"/>` : "")).join("")}${Array.from({ length: 10 }, (_, i) => `<rect x="${30 + i * 36}" y="320" width="20" height="20" fill="${i % 2 ? "#ff5e8a" : "#ffd25e"}"/>`).join("")}${S(200, 385, 16, "#fff", "PRESS START", 'text-anchor="middle" font-family="Courier New, monospace" font-weight="700"')}` },
  { id: "lib-blueprint", name: "Blueprint", style: "technical", w: 400, h: 480,
    description: "Blueprint blue with white technical lines, measurement marks, grid, precise engineering aesthetic.",
    body: `<rect width="400" height="480" fill="#1f4e8c"/>${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="480" stroke="#fff" stroke-opacity=".08"/><line x1="0" y1="${i * 24}" x2="400" y2="${i * 24}" stroke="#fff" stroke-opacity=".08"/>`).join("")}<rect x="90" y="120" width="220" height="220" fill="none" stroke="#fff" stroke-width="2"/><circle cx="200" cy="230" r="70" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 6"/><line x1="90" y1="370" x2="310" y2="370" stroke="#fff"/>${S(200, 392, 12, "#fff", "220 mm", 'text-anchor="middle" font-family="Courier New, monospace"')}` },
  { id: "lib-terminal", name: "Terminal", style: "technical", w: 400, h: 400,
    description: "Black terminal window, green monospace lines, blinking cursor block, developer-tool honesty.",
    body: `<rect width="400" height="400" fill="#0a0a0a"/><rect x="20" y="20" width="360" height="360" rx="10" fill="#141414"/>${["#ff5f57", "#febc2e", "#28c840"].map((c, i) => `<circle cx="${45 + i * 20}" cy="45" r="6" fill="${c}"/>`).join("")}${["$ init project", "› compiling…", "✓ 24 modules", "$ deploy --dry"].map((l, i) => S(40, 100 + i * 32, 16, i === 2 ? "#5af78e" : "#cfcfcf", l, 'font-family="Courier New, monospace"')).join("")}<rect x="40" y="215" width="12" height="20" fill="#5af78e"/>` },
  { id: "lib-glass-fintech", name: "Frosted fintech", style: "technical", w: 400, h: 540,
    description: "Translucent frosted glass card over soft violet-teal orbs, crisp numbers, modern finance app polish.",
    body: `<defs><filter id="bl"><feGaussianBlur stdDeviation="30"/></filter></defs><rect width="400" height="540" fill="#e9eef3"/><g filter="url(#bl)"><circle cx="110" cy="160" r="110" fill="#72d6c9"/><circle cx="300" cy="360" r="120" fill="#9fb3ff"/></g><rect x="50" y="150" width="300" height="190" rx="24" fill="#ffffff" fill-opacity=".55" stroke="#fff"/>${S(75, 200, 13, "#4b5563", "Balance")}${S(75, 250, 40, "#0f172a", "$12,480", 'font-weight="700"')}${bars(75, 290, 200, 2, 16, "#cbd5e1", 6)}` },
];

export function libraryDataUrl(ref: LibraryRef): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ref.w} ${ref.h}" width="${ref.w}" height="${ref.h}">${ref.body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}