import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  RemoveFormatting,
  Undo,
  Redo,
  Minus,
  Sparkles,
} from 'lucide-react';

export interface WordEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
}

/**
 * Converts legacy markdown (if any note or lesson was saved with markdown)
 * to clean HTML so the user never sees raw # or ** tags.
 */
export function formatToHtml(raw: string): string {
  if (!raw) return '<p></p>';

  // If already contains HTML tags, return as is
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw;
  }

  // Convert markdown-style headers
  let html = raw
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; font-weight: 700; color: #1E3A8A; margin: 1rem 0 0.5rem 0;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.35rem; font-weight: 700; color: #0F172A; margin: 1.25rem 0 0.5rem 0;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 1.5rem 0 0.75rem 0;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    .replace(/^- \[x\] (.*$)/gim, '<p style="margin: 0.35rem 0; color: #059669;">✓ <strong>$1</strong></p>')
    .replace(/^- \[ \] (.*$)/gim, '<p style="margin: 0.35rem 0; color: #475569;">• $1</p>')
    .replace(/^- (.*$)/gim, '<li style="margin: 0.25rem 0;">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li style="margin: 0.25rem 0;">$2</li>');

  // Wrap loose <li> tags into <ul>
  html = html.replace(/(<li[\s\S]*?<\/li>)+/g, '<ul style="padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: disc;">$&</ul>');

  // Convert plain newlines to paragraphs
  const paragraphs = html
    .split(/\n\n+/)
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<p')) {
        return trimmed;
      }
      return `<p style="margin: 0.5rem 0; line-height: 1.65;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return paragraphs || '<p></p>';
}

export const WordEditor: React.FC<WordEditorProps> = ({
  value,
  onChange,
  placeholder = 'Comece a digitar seu texto aqui como no Word...',
  minHeight = '360px',
  className = '',
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentBlock, setCurrentBlock] = useState('p');
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });

  // Sync incoming content with contentEditable (avoid resetting cursor when typing)
  useEffect(() => {
    if (!editorRef.current) return;
    const initialHtml = formatToHtml(value);
    if (editorRef.current.innerHTML !== initialHtml && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [value]);

  const updateActiveStates = useCallback(() => {
    if (!document) return;
    setActiveStyles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
    });
  }, []);

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (readOnly) return;
    document.execCommand(command, false, arg);
    updateActiveStates();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleBlockChange = (tag: string) => {
    if (readOnly) return;
    setCurrentBlock(tag);
    if (tag === 'p') {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${tag}>`);
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
    updateActiveStates();
  };

  return (
    <div className={`flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs ${className}`}>
      {/* Word-like Document Ribbon Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#0F172A] text-xs">
          {/* Paragraph Style Dropdown */}
          <select
            value={currentBlock}
            onChange={(e) => handleBlockChange(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            title="Estilo de Texto"
          >
            <option value="p">Texto Normal</option>
            <option value="h1">Título Principal</option>
            <option value="h2">Subtítulo</option>
            <option value="h3">Seção / Destaque</option>
          </select>

          <div className="h-5 w-px bg-[#E2E8F0] mx-1" />

          {/* Basic Formatting */}
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className={`p-1.5 rounded-md transition-colors ${
              activeStyles.bold ? 'bg-[#DBEAFE] text-[#2563EB] font-bold' : 'hover:bg-slate-200/60 text-[#64748B]'
            }`}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className={`p-1.5 rounded-md transition-colors ${
              activeStyles.italic ? 'bg-[#DBEAFE] text-[#2563EB]' : 'hover:bg-slate-200/60 text-[#64748B]'
            }`}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className={`p-1.5 rounded-md transition-colors ${
              activeStyles.underline ? 'bg-[#DBEAFE] text-[#2563EB]' : 'hover:bg-slate-200/60 text-[#64748B]'
            }`}
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className={`p-1.5 rounded-md transition-colors ${
              activeStyles.strike ? 'bg-[#DBEAFE] text-[#2563EB]' : 'hover:bg-slate-200/60 text-[#64748B]'
            }`}
            title="Tachado"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => executeCommand('hiliteColor', '#FEF08A')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Marca-texto (Realce Amarelo)"
          >
            <Highlighter className="w-4 h-4 text-amber-500" />
          </button>

          <div className="h-5 w-px bg-[#E2E8F0] mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Centralizar"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Alinhar à Direita"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-[#E2E8F0] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Lista com Marcadores"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Lista Numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertHorizontalRule')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Linha Divisória"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-[#E2E8F0] mx-1" />

          {/* Undo / Redo / Clear */}
          <button
            type="button"
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Refazer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded-md hover:bg-slate-200/60 text-[#64748B]"
            title="Limpar Formatação"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document Sheet Canvas - Authentic clean page like Microsoft Word / Google Docs */}
      <div className="p-6 sm:p-8 bg-white flex-1 overflow-y-auto cursor-text text-left">
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onInput={handleInput}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="word-document-body focus:outline-none text-[#0F172A] text-sm leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 empty:before:pointer-events-none"
        />
      </div>
    </div>
  );
};
