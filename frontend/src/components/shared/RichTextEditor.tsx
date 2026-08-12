"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { toast } from "sonner";
import { uploadRichTextImage } from "@/lib/api/media";
import { ApiRequestError } from "@/lib/api/client";

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50 ${
        active ? "bg-muted text-primary" : "text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [value, setValue] = useState(editor.getAttributes("link").href ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function apply() {
    const url = value.trim();
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    onClose();
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 p-1.5">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        placeholder="https://..."
        className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={apply}
        className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        დამატება
      </button>
      <button
        type="button"
        onClick={onClose}
        className="h-7 shrink-0 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        გაუქმება
      </button>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadRichTextImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სურათის ატვირთვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        <ToolbarButton
          label="სქელი"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="დახრილი"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          label="გადახაზული"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="ჩამონათვალი"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •—
        </ToolbarButton>
        <ToolbarButton
          label="დანომრილი სია"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="ბმული"
          active={editor.isActive("link") || linkPopoverOpen}
          onClick={() => setLinkPopoverOpen((open) => !open)}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          label="სურათი"
          disabled={uploadingImage}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingImage ? "..." : "🖼"}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />
      </div>
      {linkPopoverOpen && <LinkPopover editor={editor} onClose={() => setLinkPopoverOpen(false)} />}
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      // Inline style (not a class) — email clients routinely strip <style>
      // blocks and CSS classes, but an element's own style attribute
      // survives, which matters since this content can end up in a
      // newsletter/campaign email as well as rendered on-site.
      Image.configure({
        HTMLAttributes: { style: "max-width:100%;height:auto;border-radius:8px;" },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-3 py-2 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_a]:text-primary [&_a]:underline",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
