import { describe, expect, it } from "vitest";

import { pickPrimaryImage } from "./product-images";

const img = (storage_path: string, sort_order: number, variant_id: string | null = null) => ({
  storage_path,
  sort_order,
  variant_id,
});

describe("pickPrimaryImage", () => {
  const images = [img("v-red", 0, "red"), img("general-2", 2), img("general-1", 1)];

  it("mendahulukan foto umum dengan urutan terkecil", () => {
    expect(pickPrimaryImage(images)?.storage_path).toBe("general-1");
  });

  it("memakai foto varian bila diminta dan tersedia", () => {
    expect(pickPrimaryImage(images, "red")?.storage_path).toBe("v-red");
    expect(pickPrimaryImage(images, "blue")?.storage_path).toBe("general-1");
  });

  it("jatuh ke foto apa pun bila tidak ada foto umum", () => {
    expect(pickPrimaryImage([img("v", 0, "red")])?.storage_path).toBe("v");
    expect(pickPrimaryImage([])).toBeUndefined();
  });
});
