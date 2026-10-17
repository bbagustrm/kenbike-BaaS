import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { DocNode } from "../document";

/**
 * Gaya konten deskripsi — dipakai bersama oleh editor & tampilan agar yang
 * dilihat admin saat menulis sama dengan yang dilihat pembeli.
 */
export const richTextClassName = cn(
  "space-y-3 text-sm leading-relaxed text-muted-foreground",
  "[&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-foreground",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4",
  "[&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_hr]:my-6",
  "[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  // Tabel spesifikasi: kolom pertama tebal, garis halus.
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground",
  "[&_tr>td:first-child]:font-medium [&_tr>td:first-child]:text-foreground",
  "[&_td_p]:m-0 [&_th_p]:m-0",
  // Editor: placeholder & sel terpilih.
  "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground/60 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
  "[&_.selectedCell]:bg-primary/10",
);

function renderMarks(node: DocNode, text: ReactNode): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "underline":
        return <u>{acc}</u>;
      case "strike":
        return <s>{acc}</s>;
      case "link":
        return (
          <a href={String(mark.attrs?.href)} target="_blank" rel="noopener noreferrer nofollow">
            {acc}
          </a>
        );
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: DocNode, key: number): ReactNode {
  const children = node.content?.map(renderNode);
  switch (node.type) {
    case "text":
      return <Fragment key={key}>{renderMarks(node, node.text)}</Fragment>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const level = node.attrs?.level;
      const Tag = level === 3 ? "h3" : level === 4 ? "h4" : "h2";
      return <Tag key={key}>{children}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={Number(node.attrs?.start ?? 1)}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "image":
      return (
        // URL sudah dibatasi ke bucket product-images oleh sanitizeDoc.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={String(node.attrs?.src)}
          alt={String(node.attrs?.alt ?? "")}
          loading="lazy"
          decoding="async"
        />
      );
    case "youtube":
      return (
        <div key={key} className="my-3 aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <iframe
            src={String(node.attrs?.src)}
            title="Video produk"
            className="size-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    case "table":
      return (
        // Tabel lebar bisa di-scroll horizontal di HP.
        <div key={key} className="my-3 overflow-x-auto">
          <table>
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableHeader":
    case "tableCell": {
      const Tag = node.type === "tableHeader" ? "th" : "td";
      const colSpan = Number(node.attrs?.colspan ?? 1);
      const rowSpan = Number(node.attrs?.rowspan ?? 1);
      return (
        <Tag
          key={key}
          colSpan={colSpan > 1 ? colSpan : undefined}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
        >
          {children}
        </Tag>
      );
    }
    default:
      return null;
  }
}

/**
 * Tampilkan dokumen deskripsi yang SUDAH dibersihkan (sanitizeDoc). Tidak
 * memakai dangerouslySetInnerHTML: setiap node dipetakan ke elemen React.
 */
export function RichTextView({ doc, className }: { doc: DocNode; className?: string }) {
  return <div className={cn(richTextClassName, className)}>{doc.content?.map(renderNode)}</div>;
}
