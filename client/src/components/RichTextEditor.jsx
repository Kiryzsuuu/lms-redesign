import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Label } from './ui';

// ── SVG icon helpers ──────────────────────────────────────────────────────────
function Ico({ d, size = 14, viewBox = '0 0 24 24' }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  bold:        'M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z',
  italic:      'M19 4h-9M14 20H5M15 4L9 20',
  underline:   'M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3M4 21h16',
  strike:      'M17.3 12H6.7M10 7.7C10.4 6.6 11.6 6 13 6c2.2 0 3.5 1.5 3 3M7.4 16.6C7.8 18 9.3 19 11 19c2.5 0 4-1.7 4-3.5 0-.5-.1-1-.3-1.5',
  code:        'M16 18l6-6-6-6M8 6l-6 6 6 6',
  codeBlock:   'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  quote:       'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z',
  hr:          'M5 12h14',
  ul:          'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  ol:          'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  link:        'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  unlink:      'M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71M8 12l8 0',
  image:       'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21',
  alignL:      'M21 6H3M15 12H3M17 18H3',
  alignC:      'M21 6H3M17 12H7M19 18H5',
  alignR:      'M21 6H3M21 12H9M21 18H11',
  alignJ:      'M21 6H3M21 12H3M21 18H3',
  highlight:   'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  undo:        'M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13',
  redo:        'M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13',
  clear:       'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
  table:       'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  addColR:     'M14 3h7v18h-7zM3 12h7M6.5 8.5v7',
  addRowB:     'M3 14v7h18v-7zM12 3v7M8.5 6.5h7',
  delCol:      'M14 3h7v18h-7zM3 10l6 4-6 4',
  delRow:      'M3 14v7h18v-7zM10 3l4 6-4 6',
  mergeCells:  'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8zM9 7h6M12 4v6',
};

function Btn({ active, disabled, title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 5, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#0C628D' : 'transparent',
        color: active ? '#fff' : disabled ? '#cbd5e1' : '#475569',
        transition: 'background .12s, color .12s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = '#f1f5f9'; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 3px', flexShrink: 0 }} />;
}

// Draggable resize handle
function ResizeHandle({ onDrag }) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  function onMouseDown(e) {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = onDrag(null); // get current height
    e.preventDefault();
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return;
      const delta = e.clientY - startY.current;
      onDrag(Math.max(120, startH.current + delta));
    }
    function onUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        height: 8, background: 'transparent', cursor: 'ns-resize',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <div style={{ width: 36, height: 3, borderRadius: 9999, background: '#cbd5e1' }} />
    </div>
  );
}

const MAX_ROWS = 10;
const MAX_COLS = 10;

function TablePicker({ onPick, onClose }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div
      style={{
        position: 'absolute', zIndex: 100, background: '#fff',
        border: '1.5px solid #e2e8f0', borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, top: 32, left: 0,
      }}
      onMouseLeave={() => setHover({ r: 0, c: 0 })}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAX_COLS}, 18px)`, gap: 2, marginBottom: 6 }}>
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
          const r = Math.floor(i / MAX_COLS) + 1;
          const c = (i % MAX_COLS) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <div
              key={i}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => { onPick(hover.r, hover.c); onClose(); }}
              style={{
                width: 18, height: 18, border: `1.5px solid ${active ? '#0C628D' : '#e2e8f0'}`,
                background: active ? '#e0f0fa' : '#f8fafc', borderRadius: 2, cursor: 'pointer',
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: '0.75rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
        {hover.r > 0 && hover.c > 0 ? `${hover.r} × ${hover.c}` : 'Pilih ukuran tabel'}
      </div>
    </div>
  );
}

export function RichTextEditor({
  label,
  valueHtml,
  onChangeHtml,
  placeholder = 'Tulis di sini...',
  onUploadImage,
  minHeight = 220,
}) {
  const [imgUploading, setImgUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [editorHeight, setEditorHeight] = useState(minHeight);
  const containerRef = useRef(null);

  const getHeight = useCallback((newH) => {
    if (newH === null) return editorHeight;
    setEditorHeight(newH);
    return newH;
  }, [editorHeight]);

  const extensions = useMemo(() => [
    StarterKit.configure({
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-blue-600 underline' },
    }),
    Image.configure({ inline: false, allowBase64: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
  ], []);

  const editor = useEditor({
    extensions,
    content: valueHtml || '',
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none p-3 focus:outline-none h-full',
        'data-placeholder': placeholder,
      },
      handlePaste(view, event) {
        try {
          const html = event?.clipboardData?.getData('text/html') || '';
          const text = event?.clipboardData?.getData('text/plain') || '';
          const looksLikeWordList = /MsoListParagraph|mso-list|<\s*o:p\s*>/i.test(html);
          if (!looksLikeWordList && /<\s*(ul|ol|li)\b/i.test(html)) return false;

          const rawText = text || (looksLikeWordList
            ? (() => { try { return new DOMParser().parseFromString(html, 'text/html').body?.innerText || ''; } catch { return ''; } })()
            : '');

          const lines = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length < 1) return false;

          const bulletRe = /^(?:[•\-–—*]|•)\s*/;
          const orderedRe = /^\d+(?:\.|[)])\s*/;
          const bulletCount = lines.filter(l => bulletRe.test(l)).length;
          const orderedCount = lines.filter(l => orderedRe.test(l)).length;
          if (bulletCount < 1 && orderedCount < 1) return false;

          event.preventDefault();
          const { schema, tr } = view.state;
          const li = schema.nodes.listItem, p = schema.nodes.paragraph;

          if (orderedCount >= bulletCount) {
            const items = lines.filter(l => orderedRe.test(l)).map(l => l.replace(orderedRe, '').trim()).filter(Boolean);
            const ol = schema.nodes.orderedList;
            if (items.length && li && p && ol) {
              const node = ol.createAndFill({ order: 1 }, items.map(t => li.createAndFill(null, p.create(null, schema.text(t)))).filter(Boolean));
              if (node) { view.dispatch(tr.replaceSelectionWith(node).scrollIntoView()); return true; }
            }
          }
          const items = lines.filter(l => bulletRe.test(l)).map(l => l.replace(bulletRe, '').trim()).filter(Boolean);
          const ul = schema.nodes.bulletList;
          if (items.length && li && p && ul) {
            const node = ul.createAndFill(null, items.map(t => li.createAndFill(null, p.create(null, schema.text(t)))).filter(Boolean));
            if (node) { view.dispatch(tr.replaceSelectionWith(node).scrollIntoView()); return true; }
          }
          return false;
        } catch { return false; }
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChangeHtml?.(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = valueHtml || '';
    if (current !== incoming) editor.commands.setContent(incoming, false);
  }, [editor, valueHtml]);

  if (!editor) return null;

  const can = editor.can();

  return (
    <div ref={containerRef}>
      {label && <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>}

      <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Toolbar */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '5px 8px', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {/* Undo / Redo */}
          <Btn title="Undo (Ctrl+Z)" disabled={!can.undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Ico d={ICONS.undo} />
          </Btn>
          <Btn title="Redo (Ctrl+Y)" disabled={!can.redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Ico d={ICONS.redo} />
          </Btn>
          <Sep />

          {/* Headings */}
          {[1, 2, 3].map(lvl => (
            <Btn key={lvl} title={`Heading ${lvl}`} active={editor.isActive('heading', { level: lvl })}
              onClick={() => editor.chain().focus().toggleHeading({ level: lvl }).run()}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '-0.02em' }}>H{lvl}</span>
            </Btn>
          ))}
          <Sep />

          {/* Text formatting */}
          <Btn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Ico d={ICONS.bold} />
          </Btn>
          <Btn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Ico d={ICONS.italic} />
          </Btn>
          <Btn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <Ico d={ICONS.underline} />
          </Btn>
          <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Ico d={ICONS.strike} />
          </Btn>
          <Btn title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <Ico d={ICONS.highlight} />
          </Btn>
          <Btn title="Inline Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Ico d={ICONS.code} />
          </Btn>
          <Sep />

          {/* Lists */}
          <Btn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <Ico d={ICONS.ul} />
          </Btn>
          <Btn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <Ico d={ICONS.ol} />
          </Btn>
          <Btn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Ico d={ICONS.quote} />
          </Btn>
          <Btn title="Code Block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Ico d={ICONS.codeBlock} />
          </Btn>
          <Sep />

          {/* Alignment */}
          {[['left', ICONS.alignL], ['center', ICONS.alignC], ['right', ICONS.alignR], ['justify', ICONS.alignJ]].map(([align, ico]) => (
            <Btn key={align} title={`Align ${align}`} active={editor.isActive({ textAlign: align })}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}>
              <Ico d={ico} />
            </Btn>
          ))}
          <Sep />

          {/* Horizontal rule */}
          <Btn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Ico d={ICONS.hr} />
          </Btn>

          {/* Link */}
          <Btn title="Link" active={editor.isActive('link')}
            onClick={() => { setLinkDraft(editor.getAttributes('link')?.href || ''); setShowLink(s => !s); }}>
            <Ico d={ICONS.link} />
          </Btn>
          {editor.isActive('link') && (
            <Btn title="Remove Link" onClick={() => editor.chain().focus().unsetLink().run()}>
              <Ico d={ICONS.unlink} />
            </Btn>
          )}

          {/* Image upload */}
          <label style={{ display: 'inline-flex', cursor: imgUploading ? 'not-allowed' : 'pointer' }} title="Insert Image">
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 5, border: 'none',
              background: 'transparent', color: imgUploading ? '#cbd5e1' : '#475569',
            }}>
              <Ico d={ICONS.image} />
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={imgUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImgUploading(true);
                try {
                  if (!onUploadImage) throw new Error('Upload handler not provided');
                  const url = await onUploadImage(file);
                  editor.chain().focus().setImage({ src: url }).run();
                } finally { setImgUploading(false); e.target.value = ''; }
              }} />
          </label>
          <Sep />

          {/* Clear formatting */}
          <Btn title="Clear Formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Tx</span>
          </Btn>
          <Sep />

          {/* Table */}
          <div style={{ position: 'relative' }}>
            <Btn title="Insert Table" active={editor.isActive('table') || showTablePicker}
              onClick={() => setShowTablePicker(s => !s)}>
              <Ico d={ICONS.table} />
            </Btn>
            {showTablePicker && !editor.isActive('table') && (
              <TablePicker
                onPick={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()}
                onClose={() => setShowTablePicker(false)}
              />
            )}
          </div>
          {editor.isActive('table') && (<>
            <Btn title="Add Column Right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Ico d={ICONS.addColR} />
            </Btn>
            <Btn title="Add Row Below" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Ico d={ICONS.addRowB} />
            </Btn>
            <Btn title="Delete Column" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <Ico d={ICONS.delCol} />
            </Btn>
            <Btn title="Delete Row" onClick={() => editor.chain().focus().deleteRow().run()}>
              <Ico d={ICONS.delRow} />
            </Btn>
            <Btn title="Merge/Split Cells" onClick={() => editor.chain().focus().mergeOrSplit().run()}>
              <Ico d={ICONS.mergeCells} />
            </Btn>
            <Btn title="Delete Table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444' }}>✕Tbl</span>
            </Btn>
          </>)}
        </div>

        {/* Link input bar */}
        {showLink && (
          <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', alignItems: 'center' }}>
            <input
              value={linkDraft}
              onChange={e => setLinkDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { editor.chain().focus().setLink({ href: linkDraft.trim() }).run(); setShowLink(false); }
                if (e.key === 'Escape') setShowLink(false);
              }}
              placeholder="https://..."
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
              autoFocus
            />
            <button type="button" onClick={() => { editor.chain().focus().setLink({ href: linkDraft.trim() }).run(); setShowLink(false); }}
              style={{ padding: '4px 12px', background: '#0C628D', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Simpan
            </button>
            <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setShowLink(false); }}
              style={{ padding: '4px 10px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Hapus
            </button>
          </div>
        )}

        {/* Editor content — grows with content, minHeight draggable */}
        <div style={{ minHeight: editorHeight, paddingBottom: '2rem' }}>
          <EditorContent editor={editor} />
        </div>

        {/* Drag-to-resize handle (controls minHeight) */}
        <ResizeHandle onDrag={getHeight} />
      </div>
    </div>
  );
}
