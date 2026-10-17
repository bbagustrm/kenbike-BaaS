import { describe, expect, it } from "vitest";

import {
  docToPlainText,
  isEmptyDoc,
  productImagePathFromSrc,
  safeHref,
  sanitizeDoc,
  youtubeId,
} from "./document";

const SB = "https://example.supabase.co";
const img = (path: string) => `${SB}/storage/v1/object/public/product-images/${path}`;

describe("safeHref", () => {
  it("hanya http(s)/mailto", () => {
    expect(safeHref("https://kenbike.id/a")).toBe("https://kenbike.id/a");
    expect(safeHref("mailto:halo@kenbike.id")).toBe("mailto:halo@kenbike.id");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("/relatif")).toBeNull();
  });
});

describe("youtubeId", () => {
  it("berbagai bentuk URL", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/shorts/abcDEF123_-")).toBe("abcDEF123_-");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("productImagePathFromSrc", () => {
  it("hanya bucket product-images kita", () => {
    expect(productImagePathFromSrc(img("p1/content/a.webp"), SB)).toBe("p1/content/a.webp");
    expect(productImagePathFromSrc("https://evil.com/x.png", SB)).toBeNull();
    expect(productImagePathFromSrc(img("../secret.png"), SB)).toBeNull();
  });
});

describe("sanitizeDoc", () => {
  it("membuang node, mark, & sumber berbahaya", () => {
    const doc = sanitizeDoc(
      {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1, onclick: "x" },
            content: [{ type: "text", text: "Spek" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "klik",
                marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
              },
              { type: "text", text: " tebal", marks: [{ type: "bold" }, { type: "evil" }] },
            ],
          },
          { type: "script", content: [{ type: "text", text: "alert(1)" }] },
          { type: "image", attrs: { src: "https://evil.com/x.png" } },
          { type: "image", attrs: { src: img("p1/content/a.webp"), alt: "Frame" } },
          { type: "youtube", attrs: { src: "https://youtu.be/dQw4w9WgXcQ" } },
        ],
      },
      SB,
    );
    expect(doc).toEqual({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Spek" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "klik" },
            { type: "text", text: " tebal", marks: [{ type: "bold" }] },
          ],
        },
        { type: "image", attrs: { src: img("p1/content/a.webp"), alt: "Frame" } },
        { type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" } },
      ],
    });
  });

  it("bukan doc → null", () => {
    expect(sanitizeDoc({ type: "paragraph" }, SB)).toBeNull();
    expect(sanitizeDoc("x", SB)).toBeNull();
  });
});

describe("docToPlainText & isEmptyDoc", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Spesifikasi" }] },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Frame" }] }],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Alloy" }] }],
              },
            ],
          },
        ],
      },
    ],
  };

  it("teks polos per baris", () => {
    expect(docToPlainText(doc)).toContain("Spesifikasi");
    expect(docToPlainText(doc)).toContain("Frame");
    expect(docToPlainText(doc)).toContain("Alloy");
  });

  it("kosong vs berisi", () => {
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(isEmptyDoc(doc)).toBe(false);
    expect(isEmptyDoc(null)).toBe(true);
  });
});
