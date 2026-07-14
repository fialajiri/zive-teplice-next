"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListIcon,
  ListOrderedIcon,
  Heading2Icon,
  Heading3Icon,
  LinkIcon,
  Link2OffIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
};

// WYSIWYG editor whose HTML output is written into a controlled hidden field in
// the parent form. Tiptap is client-only and manages its own document state, so
// `value` seeds the initial content once — it is intentionally not re-synced on
// every keystroke (that would fight the cursor).
export function RichTextEditor({
  id,
  value,
  onChange,
  ariaInvalid,
  ariaDescribedby,
}: RichTextEditorProps) {
  // Tiptap mutates the editor imperatively; a tick forces the toolbar to reflect
  // the current selection's active marks/nodes.
  const [, setTick] = useState(0);

  const editor = useEditor({
    // Required under Next SSR — defer first render to the client to avoid a
    // hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-40 max-w-none rounded-b-lg px-3 py-2 leading-relaxed outline-none",
          "[&_a]:text-primary [&_a]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc [&_p]:mb-2",
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: () => setTick((n) => n + 1),
    onTransaction: () => setTick((n) => n + 1),
  });

  // Until the client mounts the editor, render a matching placeholder box so the
  // form doesn't shift.
  if (!editor) {
    return (
      <div
        className="border-input bg-background h-52 rounded-lg border"
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "border-input bg-background focus-within:border-ring focus-within:ring-ring/50 rounded-lg border focus-within:ring-3",
        ariaInvalid && "border-destructive",
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        id={id}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedby}
      />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function handleLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Odkaz (URL):", previous ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formátování textu"
      className="border-input flex flex-wrap items-center gap-0.5 border-b p-1"
    >
      <ToolbarButton
        label="Tučné"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Kurzíva"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Podtržení"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Nadpis 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Nadpis 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3Icon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Odrážkový seznam"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Číslovaný seznam"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Vložit odkaz"
        active={editor.isActive("link")}
        onClick={handleLink}
      >
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Odebrat odkaz"
        active={false}
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2OffIcon />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
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
      onClick={onClick}
      className={cn(
        "hover:bg-muted focus-visible:ring-ring/50 inline-flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="bg-border mx-1 h-5 w-px" aria-hidden />;
}
