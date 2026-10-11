/**
 * Nomor halaman yang ditampilkan: selalu halaman pertama, terakhir, dan
 * tetangga halaman aktif; celah diisi "ellipsis".
 */
export function pageItems(current: number, total: number, siblings = 1): (number | "ellipsis")[] {
  if (total <= 1) return total === 1 ? [1] : [];
  const pages = new Set([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  sorted.forEach((page, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && page - prev > 1)
      items.push(page - prev === 2 ? page - 1 : "ellipsis");
    items.push(page);
  });
  return items;
}
