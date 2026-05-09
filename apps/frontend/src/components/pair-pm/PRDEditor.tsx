"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";

interface PRDEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function PRDEditor({ content, onChange }: PRDEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        orderedList: false,
        dropcursor: false,
      }),
    ],
    content: content || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(editor.getHTML());
      }, 2000);
    },
    onBlur: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes into editor (e.g. on thread switch)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "<p></p>", { emitUpdate: false });
    }
  }, [content, editor]);

  const setHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor],
  );

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <button
          onClick={() => setHeading(1)}
          className={cn(
            "rounded px-2 py-1 text-xs font-semibold transition-colors",
            editor.isActive("heading", { level: 1 })
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          H1
        </button>
        <button
          onClick={() => setHeading(2)}
          className={cn(
            "rounded px-2 py-1 text-xs font-semibold transition-colors",
            editor.isActive("heading", { level: 2 })
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          H2
        </button>
        <button
          onClick={setParagraph}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            editor.isActive("paragraph")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          P
        </button>
        <button
          onClick={toggleBulletList}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            editor.isActive("bulletList")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          • List
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
