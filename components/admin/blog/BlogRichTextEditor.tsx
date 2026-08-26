'use client';

import type { JSONContent, Editor } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { Mathematics } from '@tiptap/extension-mathematics';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Code2,
  Columns3,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Sigma,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const lowlight = createLowlight(common);

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: { rel: 'noopener noreferrer' },
    },
  }),
  CodeBlockLowlight.configure({
    lowlight,
    enableTabIndentation: true,
    tabSize: 2,
    defaultLanguage: 'plaintext',
  }),
  Image.configure({
    allowBase64: false,
    resize: {
      enabled: true,
      directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      minWidth: 120,
      minHeight: 80,
      alwaysPreserveAspectRatio: true,
    },
  }),
  TableKit.configure({
    table: {
      resizable: true,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({
    placeholder: 'Yazınızı buraya yazın. “/” yerine araç çubuğunu kullanabilirsiniz…',
  }),
  CharacterCount.configure({ limit: 250_000 }),
  Mathematics.configure({
    katexOptions: { throwOnError: false, strict: 'warn' },
  }),
];

export interface RichEditorValue {
  json: Record<string, unknown>;
  html: string;
  text: string;
  words: number;
  characters: number;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
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
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? 'bg-amber-400 text-stone-950'
          : 'text-stone-600 hover:bg-stone-200 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [, setVersion] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
    };
  }, [editor]);

  function setLink() {
    const previous = editor.getAttributes('link').href as string | undefined;
    const value = window.prompt('Bağlantı adresi', previous || 'https://');
    if (value === null) return;
    if (!value.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    let href = value.trim();
    if (!/^(https?:|mailto:)/i.test(href)) href = `https://${href}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    const alt = window.prompt('Görseli açıklayan alternatif metin')?.trim();
    if (!alt) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('purpose', 'blog');
      body.set('altText', alt);
      const response = await fetch('/api/upload', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error || 'Görsel yüklenemedi.');
      }
      editor
        .chain()
        .focus()
        .setImage({ src: payload.asset.url, alt })
        .run();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Görsel yüklenemedi.');
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = '';
    }
  }

  function insertMath(block: boolean) {
    const latex = window.prompt(
      block ? 'Blok LaTeX formülü' : 'Satır içi LaTeX formülü',
      block ? '\\sum_{i=1}^{n} i' : 'E = mc^2'
    );
    if (!latex?.trim()) return;
    if (block) {
      editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run();
    } else {
      editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
    }
  }

  return (
    <div className="sticky top-16 z-20 flex flex-wrap gap-1 border-b border-stone-200 bg-[#faf8f3]/95 p-2 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/95">
      <ToolbarButton label="Geri al" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Yinele" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-9 w-px bg-stone-200 dark:bg-stone-700" />
      <ToolbarButton label="Paragraf" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Başlık 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Başlık 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Başlık 4" active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><span>H4</span></ToolbarButton>
      <span className="mx-1 h-9 w-px bg-stone-200 dark:bg-stone-700" />
      <ToolbarButton label="Kalın" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="İtalik" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Altı çizili" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Üstü çizili" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Satır içi kod" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code2 className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-9 w-px bg-stone-200 dark:bg-stone-700" />
      <ToolbarButton label="Madde listesi" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Numaralı liste" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Görev listesi" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Alıntı" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Kod bloğu" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Braces className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Yatay çizgi" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-9 w-px bg-stone-200 dark:bg-stone-700" />
      <ToolbarButton label="Bağlantı ekle" active={editor.isActive('link')} onClick={setLink}><Link2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Bağlantıyı kaldır" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label={uploading ? 'Yükleniyor' : 'Görsel ekle'} disabled={uploading} onClick={() => imageInput.current?.click()}><ImagePlus className="h-4 w-4" /></ToolbarButton>
      <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
      <ToolbarButton label="Tablo ekle" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 className="h-4 w-4" /></ToolbarButton>
      {editor.isActive('table') ? (
        <>
          <ToolbarButton label="Sütun ekle" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Satır ekle" onClick={() => editor.chain().focus().addRowAfter().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Tabloyu sil" onClick={() => editor.chain().focus().deleteTable().run()}><Table2 className="h-4 w-4 text-red-600" /></ToolbarButton>
        </>
      ) : null}
      <ToolbarButton label="Satır içi formül" onClick={() => insertMath(false)}><Sigma className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Blok formül" onClick={() => insertMath(true)}><span>∑□</span></ToolbarButton>
      <span className="mx-1 h-9 w-px bg-stone-200 dark:bg-stone-700" />
      <ToolbarButton label="Sola hizala" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Ortala" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Sağa hizala" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="İki yana yasla" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></ToolbarButton>
    </div>
  );
}

export function BlogRichTextEditor({
  initialContent,
  onChange,
}: {
  initialContent: JSONContent | string;
  onChange: (value: RichEditorValue) => void;
}) {
  const editor = useEditor({
    extensions,
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        spellcheck: 'true',
        'aria-label': 'Blog yazısı metin editörü',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange({
        json: current.getJSON() as Record<string, unknown>,
        html: current.getHTML(),
        text: current.getText({ blockSeparator: '\n\n' }),
        words: current.storage.characterCount.words(),
        characters: current.storage.characterCount.characters(),
      });
    },
  });

  if (!editor) {
    return <div className="min-h-[34rem] animate-pulse bg-stone-100 dark:bg-stone-900" />;
  }

  return (
    <div className="blog-editor-content overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-4 py-2.5 text-[11px] font-bold text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        <span>{editor.storage.characterCount.words()} kelime · yaklaşık {Math.max(1, Math.ceil(editor.storage.characterCount.words() / 200))} dk okuma</span>
        <span>{editor.storage.characterCount.characters().toLocaleString('tr-TR')} / 250.000 karakter</span>
      </div>
    </div>
  );
}
