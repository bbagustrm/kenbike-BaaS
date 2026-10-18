"use client";

import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, type Editor, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  Columns3Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  Rows3Icon,
  StrikethroughIcon,
  TableIcon,
  Trash2Icon,
  UnderlineIcon,
  Undo2Icon,
  FilmIcon,
} from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { compressImage } from "@/features/reviews/compress";
import { ALLOWED_IMAGE_TYPES, validateImageFile } from "@/features/admin/products/images";
import { productImageUrl, PRODUCT_IMAGE_BUCKET } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { type DocNode, safeHref, youtubeId } from "../document";
import { richTextClassName } from "./rich-text-view";

/**
 * Editor deskripsi produk (Tiptap): heading, format teks, daftar, kutipan,
 * link, gambar (unggah ke product-images/content/), tabel, dan video YouTube.
 * Nilai berupa dokumen JSON; server membersihkannya lagi sebelum disimpan.
 */
type RichTextEditorProps = {
  value: DocNode | null;
  onChange: (doc: DocNode) => void;
  id?: string;
  invalid?: boolean;
};

const noopSubscribe = () => () => {};

export function RichTextEditor(props: RichTextEditorProps) {
  // Tiptap memakai nilai acak saat dibuat → hanya dirender di browser (bukan saat prerender).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="h-10 border-b bg-muted/40" />
        <div className="min-h-48" />
      </div>
    );
  }
  return <TiptapEditor {...props} />;
}

function TiptapEditor({ value, onChange, id, invalid }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url) => safeHref(url) !== null,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Image.configure({ inline: false }),
      TableKit.configure({ table: { resizable: false } }),
      Youtube.configure({ nocookie: true, controls: true, width: 640, height: 360 }),
      Placeholder.configure({
        placeholder: "Tulis deskripsi: keunggulan, spesifikasi (pakai tabel), isi paket…",
      }),
    ],
    content: value ?? undefined,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        "aria-label": "Deskripsi produk",
        class: cn(richTextClassName, "min-h-48 px-3 py-2 outline-none"),
      },
    },
    // ProseMirror membuat attrs dengan Object.create(null); objek tanpa prototipe
    // tidak bisa dikirim ke Server Action, jadi salin jadi JSON biasa.
    onUpdate: ({ editor }) => onChange(JSON.parse(JSON.stringify(editor.getJSON())) as DocNode),
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b bg-muted/40" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  function setLink() {
    const current = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("URL link (kosongkan untuk menghapus)", current ?? "https://");
    if (input === null) return;
    if (input.trim() === "") return void chain().extendMarkRange("link").unsetLink().run();
    const href = safeHref(input);
    if (!href) return void toast.error("Link harus diawali https://, http://, atau mailto:");
    chain().extendMarkRange("link").setLink({ href }).run();
  }

  function addYoutube() {
    const input = window.prompt("Tempel link video YouTube");
    if (!input) return;
    if (!youtubeId(input)) return void toast.error("Link YouTube tidak dikenali.");
    chain().setYoutubeVideo({ src: input }).run();
  }

  async function uploadImage(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) return void toast.error(invalid);
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1600, 0.85);
      const ext = ALLOWED_IMAGE_TYPES[compressed.type as keyof typeof ALLOWED_IMAGE_TYPES];
      const path = `content/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient()
        .storage.from(PRODUCT_IMAGE_BUCKET)
        .upload(path, compressed, { contentType: compressed.type, cacheControl: "31536000" });
      if (error) throw error;
      chain()
        .setImage({ src: productImageUrl(path), alt: file.name.replace(/\.\w+$/, "") })
        .run();
    } catch {
      toast.error("Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Format deskripsi"
      className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1"
    >
      <Tool
        label="Heading 2"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2Icon />
      </Tool>
      <Tool
        label="Heading 3"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3Icon />
      </Tool>
      <Divider />
      <Tool label="Tebal" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon />
      </Tool>
      <Tool label="Miring" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicIcon />
      </Tool>
      <Tool
        label="Garis bawah"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </Tool>
      <Tool label="Coret" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <StrikethroughIcon />
      </Tool>
      <Tool label="Link" active={state.link} onClick={setLink}>
        <LinkIcon />
      </Tool>
      <Divider />
      <Tool
        label="Daftar poin"
        active={state.bullet}
        onClick={() => chain().toggleBulletList().run()}
      >
        <ListIcon />
      </Tool>
      <Tool
        label="Daftar nomor"
        active={state.ordered}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </Tool>
      <Tool label="Kutipan" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <QuoteIcon />
      </Tool>
      <Tool label="Garis pemisah" onClick={() => chain().setHorizontalRule().run()}>
        <MinusIcon />
      </Tool>
      <Divider />
      <Tool label="Sisipkan gambar" disabled={uploading} onClick={() => fileInput.current?.click()}>
        {uploading ? <Spinner /> : <ImageIcon />}
      </Tool>
      <input
        ref={fileInput}
        type="file"
        accept={Object.keys(ALLOWED_IMAGE_TYPES).join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadImage(file);
        }}
      />
      <Tool
        label="Sisipkan tabel spesifikasi"
        onClick={() => chain().insertTable({ rows: 4, cols: 2, withHeaderRow: false }).run()}
      >
        <TableIcon />
      </Tool>
      <Tool label="Sisipkan video YouTube" onClick={addYoutube}>
        <FilmIcon />
      </Tool>
      {state.table && (
        <>
          <Divider />
          <Tool label="Tambah baris" onClick={() => chain().addRowAfter().run()}>
            <Rows3Icon />
          </Tool>
          <Tool label="Tambah kolom" onClick={() => chain().addColumnAfter().run()}>
            <Columns3Icon />
          </Tool>
          <Tool label="Hapus baris" onClick={() => chain().deleteRow().run()}>
            <span className="text-[10px] font-semibold">−B</span>
          </Tool>
          <Tool label="Hapus kolom" onClick={() => chain().deleteColumn().run()}>
            <span className="text-[10px] font-semibold">−K</span>
          </Tool>
          <Tool label="Hapus tabel" onClick={() => chain().deleteTable().run()}>
            <Trash2Icon />
          </Tool>
        </>
      )}
      <div className="ml-auto flex">
        <Tool label="Urungkan" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          <Undo2Icon />
        </Tool>
        <Tool label="Ulangi" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          <Redo2Icon />
        </Tool>
      </div>
    </div>
  );
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40 [&_svg]:size-4",
        active && "bg-background text-foreground shadow-xs",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />;
}
