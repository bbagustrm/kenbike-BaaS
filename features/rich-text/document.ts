/**
 * Dokumen deskripsi produk (format JSON Tiptap/ProseMirror). Disimpan di
 * products.description_doc dan SELALU dibersihkan dengan `sanitizeDoc` sebelum
 * disimpan maupun dirender: hanya node, mark, dan atribut di daftar ini yang lolos.
 */
export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export const MAX_DOC_NODES = 5000;

const BLOCK_NODES = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "hardBreak",
  "text",
  "image",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "youtube",
]);
const MARKS = new Set(["bold", "italic", "underline", "strike", "link"]);

/** Hanya http(s) & mailto — tolak javascript:, data:, dll. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** ID video YouTube dari URL (youtube.com/watch, youtu.be, /embed, /shorts). */
export function youtubeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ??
        null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Gambar hanya dari bucket product-images kita (URL publik Supabase). Mengembalikan
 * path di bucket, mis. "<productId>/content/<uuid>.webp".
 */
export function productImagePathFromSrc(value: unknown, supabaseUrl: string): string | null {
  if (typeof value !== "string") return null;
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/product-images/`;
  if (!value.startsWith(prefix)) return null;
  const path = decodeURIComponent(value.slice(prefix.length).split(/[?#]/)[0] ?? "");
  return /^[\w-]+(\/[\w.-]+)+$/.test(path) && !path.includes("..") ? path : null;
}

function cleanAttrs(
  node: DocNode,
  supabaseUrl: string,
): Record<string, unknown> | null | undefined {
  const a = node.attrs ?? {};
  switch (node.type) {
    case "heading": {
      const level = Number(a.level);
      return { level: level >= 2 && level <= 4 ? level : 2 };
    }
    case "orderedList": {
      const start = Number(a.start);
      return { start: Number.isInteger(start) && start > 0 && start < 10000 ? start : 1 };
    }
    case "tableCell":
    case "tableHeader": {
      const span = (v: unknown) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
      };
      return { colspan: span(a.colspan), rowspan: span(a.rowspan) };
    }
    case "image": {
      const path = productImagePathFromSrc(a.src, supabaseUrl);
      if (!path) return null;
      return {
        src: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/product-images/${path}`,
        alt: typeof a.alt === "string" ? a.alt.slice(0, 200) : "",
      };
    }
    case "youtube": {
      const id = youtubeId(a.src);
      return id ? { src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    default:
      return undefined;
  }
}

/**
 * Salin dokumen dengan hanya node/mark/atribut yang diizinkan. Node tak dikenal
 * dibuang beserta isinya; gambar/video dengan sumber tidak sah dibuang.
 */
export function sanitizeDoc(input: unknown, supabaseUrl: string): DocNode | null {
  let budget = MAX_DOC_NODES;

  const visit = (raw: unknown): DocNode | null => {
    if (budget-- <= 0 || !raw || typeof raw !== "object") return null;
    const node = raw as DocNode;
    if (typeof node.type !== "string" || !BLOCK_NODES.has(node.type)) return null;

    if (node.type === "text") {
      if (typeof node.text !== "string" || node.text.length === 0) return null;
      const marks = (Array.isArray(node.marks) ? node.marks : []).flatMap((m) => {
        if (!m || !MARKS.has(m.type)) return [];
        if (m.type !== "link") return [{ type: m.type }];
        const href = safeHref(m.attrs?.href);
        return href ? [{ type: "link", attrs: { href } }] : [];
      });
      return { type: "text", text: node.text.slice(0, 10000), ...(marks.length ? { marks } : {}) };
    }

    const attrs = cleanAttrs(node, supabaseUrl);
    if (attrs === null) return null;
    const content = Array.isArray(node.content)
      ? node.content.map(visit).filter((n): n is DocNode => n !== null)
      : undefined;
    return {
      type: node.type,
      ...(attrs ? { attrs } : {}),
      ...(content && content.length ? { content } : {}),
    };
  };

  const doc = visit(input);
  return doc?.type === "doc" ? doc : null;
}

/** Teks polos dari dokumen (paragraf/sel dipisah baris) — untuk SEO & pencarian. */
export function docToPlainText(doc: DocNode | null, maxLength = 5000): string {
  if (!doc) return "";
  const parts: string[] = [];
  const BLOCK = new Set(["paragraph", "heading", "listItem", "tableRow", "blockquote"]);
  const walk = (node: DocNode) => {
    if (node.type === "text" && node.text) parts.push(node.text);
    else if (node.type === "hardBreak") parts.push("\n");
    else if (node.type === "tableCell" || node.type === "tableHeader") {
      node.content?.forEach(walk);
      parts.push(" · ");
      return;
    }
    node.content?.forEach(walk);
    if (BLOCK.has(node.type)) parts.push("\n");
  };
  walk(doc);
  return parts
    .join("")
    .replace(/ · \n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/** Dokumen kosong (tanpa teks, gambar, tabel, atau video). */
export function isEmptyDoc(doc: DocNode | null): boolean {
  if (!doc) return true;
  const has = (node: DocNode): boolean =>
    (node.type === "text" && Boolean(node.text?.trim())) ||
    ["image", "youtube", "table"].includes(node.type) ||
    (node.content ?? []).some(has);
  return !has(doc);
}
