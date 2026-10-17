import { describe, expect, it } from "vitest";

import { attachmentPath, parseAttachments, sendSchema, validateAttachmentFile } from "./schemas";

const CONV = "6f1c2a3b-1111-4222-8333-944455556666";

describe("sendSchema", () => {
  it("butuh teks atau lampiran", () => {
    expect(sendSchema.safeParse({ body: "  ", attachments: [] }).success).toBe(false);
    expect(sendSchema.safeParse({ body: "Halo", attachments: [] }).success).toBe(true);
    const att = {
      path: attachmentPath(CONV, "x", "png"),
      name: "a.png",
      type: "image/png",
      size: 10,
    };
    expect(sendSchema.safeParse({ body: "", attachments: [att] }).success).toBe(true);
  });

  it("menolak lebih dari 5 lampiran & tipe asing", () => {
    const att = { path: "p", name: "a.png", type: "image/png", size: 10 };
    expect(sendSchema.safeParse({ body: "x", attachments: Array(6).fill(att) }).success).toBe(
      false,
    );
    expect(
      sendSchema.safeParse({ body: "x", attachments: [{ ...att, type: "text/html" }] }).success,
    ).toBe(false);
  });
});

describe("lampiran", () => {
  it("validasi file", () => {
    expect(validateAttachmentFile({ type: "image/webp", size: 100 })).toBeNull();
    expect(validateAttachmentFile({ type: "image/gif", size: 100 })).toMatch(/JPG/);
    expect(validateAttachmentFile({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it("parseAttachments membuang item tidak valid", () => {
    expect(
      parseAttachments([
        { path: "a", name: "a.pdf", type: "application/pdf", size: 1 },
        { path: "b", type: "image/png" },
        "x",
      ]),
    ).toHaveLength(1);
    expect(parseAttachments(null)).toEqual([]);
  });
});
