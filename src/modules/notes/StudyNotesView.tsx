import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Volume2,
  Pin,
  CheckCircle2,
  Clock,
  Download,
  Share2,
  FileText,
  FolderOpen
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../shared/design-system/Button';
import { LearningAsset } from '../../shared/types';
import { useToast } from '../../shared/design-system/Toast';
import { WordEditor, formatToHtml } from '../../shared/design-system/WordEditor';

export interface StudyNote {
  id: string;
  title: string;
  category: 'Gramática' | 'Vocabulário' | 'Reuniões' | 'Pronúncia' | 'Tarefas' | 'Geral';
  content: string;
  isPinned?: boolean;
  updatedAt: string;
  tags?: string[];
}

const DEFAULT_NOTES: StudyNote[] = [
  {
    id: 'note-01',
    title: 'Conditional Sentences in Business Negotiations',
    category: 'Gramática',
    isPinned: true,
    tags: ['Conditionals', 'B2', 'Business'],
    content: `<h2>Second vs Third Conditional in Negotiations</h2>
<p><strong>Second Conditional (Hypothetical future)</strong><br/>
Estrutura: <em>If + Past Simple, ... would + verbo base</em></p>
<ul>
  <li>"If we offered a 10% volume discount, would you commit to 500 units?"</li>
  <li>Use quando estiver apresentando propostas ou concessões de forma diplomática sem se comprometer imediatamente.</li>
</ul>
<p><strong>Third Conditional (Past regrets / alternatives)</strong><br/>
Estrutura: <em>If + Past Perfect, ... would have + particípio</em></p>
<ul>
  <li>"If we had finalized the contract in May, delivery would have started by now."</li>
  <li>Dica de tom executivo: Suavize sempre com a expressão "With hindsight, if we had..."</li>
</ul>
<h3>Próximos Passos de Prática:</h3>
<ul>
  <li>Gravar áudio de pronúncia da frase 1</li>
  <li>Criar 3 frases para a reunião com o fornecedor</li>
  <li>Revisar na próxima mentoria com o professor</li>
</ul>`,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'note-02',
    title: 'Idiomatic Expressions for International Meetings',
    category: 'Reuniões',
    isPinned: true,
    tags: ['Idioms', 'Executive', 'Meetings'],
    content: `<h2>Expressões Essenciais para Reuniões de Negócios</h2>
<ul>
  <li><strong>To park an idea:</strong> "Let's park that topic for next week's session." (Deixar uma ideia para depois).</li>
  <li><strong>To touch base:</strong> "I will touch base with the logistics team tomorrow morning." (Entrar em contato brevemente).</li>
  <li><strong>In the loop:</strong> "Please keep our regional director in the loop." (Manter informado).</li>
  <li><strong>Ballpark figure:</strong> "Can you give us a ballpark figure on the budget?" (Uma estimativa aproximada).</li>
  <li><strong>Meet in the middle:</strong> "Let's compromise and meet halfway." (Chegar a um acordo mútuo).</li>
</ul>
<h3>Vocabulário Complementar:</h3>
<ol>
  <li><strong>Cross that bridge when we come to it:</strong> Lidar com a questão somente no momento necessário.</li>
  <li><strong>On the same page:</strong> Alinhados, com o mesmo entendimento.</li>
</ol>`,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'note-03',
    title: 'Connected Speech & Linking Sounds',
    category: 'Pronúncia',
    isPinned: false,
    tags: ['Phonetics', 'Fluency'],
    content: `<h2>Regras Práticas de Fala Conectada em Inglês</h2>
<p><strong>1. Conexão de Consoante com Vogal:</strong></p>
<ul>
  <li>"Hold on" é pronunciado naturalmente como <em>"hol-don"</em></li>
  <li>"Pick it up" soa fluido como <em>"pi-ki-tup"</em></li>
</ul>
<p><strong>2. Flapping do T no Inglês Americano:</strong></p>
<ul>
  <li>A palavra "water" soa como <em>"wah-der"</em></li>
  <li>Treine o posicionamento da ponta da língua no palato superior (crista alveolar).</li>
</ul>`,
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'note-04',
    title: 'High-Impact Verbs for Presentations',
    category: 'Vocabulário',
    isPinned: false,
    tags: ['Presentations', 'Vocabulary'],
    content: `<h2>Verbos de Alto Impacto para Apresentações Executivas</h2>
<p>Em vez de dizer "We made the process better", prefira:</p>
<ul>
  <li>"We <strong>streamlined</strong> operational workflows."</li>
  <li>"We <strong>spearheaded</strong> the international expansion initiative."</li>
  <li>"We <strong>maximized</strong> client retention by 34%."</li>
</ul>
<p><strong>Conectivos recomendados:</strong> Furthermore, As a consequence, In light of these metrics.</p>`,
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export const StudyNotesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, info } = useToast();

  const [activeTab, setActiveTab] = useState<'notes' | 'materials'>('notes');
  const [notes, setNotes] = useState<StudyNote[]>(() => {
    const saved = localStorage.getItem('easy_english_study_notes');
    if (saved) {
      try {
        const parsed: StudyNote[] = JSON.parse(saved);
        // Automatically clean legacy markdown into clean HTML
        return parsed.map((n) => ({
          ...n,
          content: formatToHtml(n.content),
        }));
      } catch {
        return DEFAULT_NOTES;
      }
    }
    return DEFAULT_NOTES;
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || 'note-01');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Active note editor state
  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];
  const [editTitle, setEditTitle] = useState(activeNote?.title || '');
  const [editCategory, setEditCategory] = useState<StudyNote['category']>(activeNote?.category || 'Geral');
  const [editContent, setEditContent] = useState(activeNote?.content || '');
  const [isSaved, setIsSaved] = useState(true);

  // Materials from teacher
  const [materials, setMaterials] = useState<LearningAsset[]>([]);

  // Auto-save changes to notes list and localStorage
  useEffect(() => {
    localStorage.setItem('easy_english_study_notes', JSON.stringify(notes));
  }, [notes]);

  // Sync editor when note selection changes
  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title);
      setEditCategory(activeNote.category);
      setEditContent(formatToHtml(activeNote.content));
      setIsSaved(true);
    }
  }, [selectedNoteId]);

  // Load teacher materials
  useEffect(() => {
    async function loadMaterials() {
      try {
        const snap = await getDocs(collection(db, 'learningAssets'));
        const list: LearningAsset[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LearningAsset));
        setMaterials(list);
      } catch (err) {
        console.warn('Materials preview loaded fallback', err);
      }
    }
    loadMaterials();
  }, []);

  // Compute clean text words & read time
  const stats = useMemo(() => {
    const plainText = editContent.replace(/<[^>]*>/g, ' ').trim();
    const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const readMinutes = Math.max(1, Math.ceil(words / 150));
    return { words, readMinutes };
  }, [editContent]);

  // Handle Speech Pronunciation
  const handleListenPronunciation = () => {
    if (!('speechSynthesis' in window)) {
      info('Recurso de voz não disponível no navegador atual.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const plainText = (editTitle + '. ' + editContent.replace(/<[^>]*>/g, ' ')).slice(0, 400);
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
    info('Reproduzindo pronúncia em inglês (en-US)...');
  };

  const handleCreateNote = () => {
    const newNote: StudyNote = {
      id: `note-${Date.now()}`,
      title: 'Anotação sem título',
      category: 'Geral',
      isPinned: false,
      content: '<p>Comece a escrever o conteúdo da sua aula aqui...</p>',
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    success('Nova anotação criada com sucesso!');
  };

  const handleUpdateActiveNote = (updates: Partial<StudyNote>) => {
    if (!activeNote) return;
    const updatedList = notes.map((n) =>
      n.id === activeNote.id
        ? {
            ...n,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : n
    );
    setNotes(updatedList);
    setIsSaved(true);
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (notes.length <= 1) {
      info('Mantenha ao menos uma anotação em seu caderno.');
      return;
    }
    const filtered = notes.filter((n) => n.id !== id);
    setNotes(filtered);
    if (selectedNoteId === id) {
      setSelectedNoteId(filtered[0]?.id || '');
    }
    success('Anotação removida.');
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const matchesCategory =
          selectedCategory === 'all' ||
          (selectedCategory === 'pinned' && n.isPinned) ||
          n.category === selectedCategory;

        const term = search.toLowerCase();
        const matchesSearch =
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term);

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, selectedCategory, search]);

  return (
    <div className="space-y-6 text-left">
      {/* Clean Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Anotações e Materiais de Estudo
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Caderno de anotações com edição normal de texto e materiais liberados pelo professor
          </p>
        </div>

        {/* Quiet Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-[#E2E8F0] shrink-0">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-white text-[#2563EB] shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Caderno de Anotações
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'materials'
                ? 'bg-white text-[#2563EB] shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Materiais do Professor ({materials.length})
          </button>
        </div>
      </div>

      {activeTab === 'notes' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Note List (Clean, minimal, 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search & New Note Action */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar anotações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1E3A8A] transition-colors shadow-2xs shrink-0"
                title="Criar Nova Anotação"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova</span>
              </button>
            </div>

            {/* Quiet Category Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                    : 'text-[#64748B] hover:bg-slate-100'
                }`}
              >
                Todas ({notes.length})
              </button>
              <button
                onClick={() => setSelectedCategory('pinned')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'pinned'
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                    : 'text-[#64748B] hover:bg-slate-100'
                }`}
              >
                Fixadas
              </button>
              {['Gramática', 'Vocabulário', 'Reuniões', 'Pronúncia'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                      : 'text-[#64748B] hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Note Cards List */}
            <div className="space-y-2 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white border border-[#E2E8F0] rounded-xl">
                  Nenhuma anotação encontrada.
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = note.id === selectedNoteId;
                  // Strip HTML tags for clean snippet preview
                  const plainSnippet = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#EFF6FF] border-[#93C5FD] shadow-2xs'
                          : 'bg-white border-[#E2E8F0] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-[#1E3A8A]' : 'text-[#0F172A]'}`}>
                          {note.title || 'Anotação sem título'}
                        </h3>
                        <button
                          onClick={(e) => handleTogglePin(note.id, e)}
                          className={`p-0.5 rounded transition-colors ${
                            note.isPinned ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
                          }`}
                          title={note.isPinned ? 'Desafixar' : 'Fixar no topo'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1 leading-relaxed">
                        {plainSnippet || 'Documento em branco...'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                        <span className="text-[#2563EB] font-medium">{note.category}</span>
                        <span>
                          {new Date(note.updatedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Word-like Document Canvas (Clean 8 cols) */}
          <div className="lg:col-span-8">
            {activeNote ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
                {/* Note Document Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      setIsSaved(false);
                      handleUpdateActiveNote({ title: e.target.value });
                    }}
                    placeholder="Título da Anotação..."
                    className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight bg-transparent focus:outline-none flex-1 placeholder:text-slate-300"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Category Selector */}
                    <select
                      value={editCategory}
                      onChange={(e) => {
                        const newCat = e.target.value as StudyNote['category'];
                        setEditCategory(newCat);
                        handleUpdateActiveNote({ category: newCat });
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-slate-50 text-[#64748B] focus:outline-none"
                    >
                      <option value="Gramática">Gramática</option>
                      <option value="Vocabulário">Vocabulário</option>
                      <option value="Reuniões">Reuniões</option>
                      <option value="Pronúncia">Pronúncia</option>
                      <option value="Tarefas">Tarefas</option>
                      <option value="Geral">Geral</option>
                    </select>

                    {/* Pronunciation */}
                    <button
                      onClick={handleListenPronunciation}
                      className={`p-1.5 rounded-lg border border-[#E2E8F0] text-xs transition-colors ${
                        isSpeaking ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-[#64748B]'
                      }`}
                      title="Ouvir pronúncia do texto em inglês"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteNote(activeNote.id)}
                      className="p-1.5 rounded-lg border border-[#E2E8F0] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Excluir Anotação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Word Document Editor (Visual text editor like Microsoft Word) */}
                <WordEditor
                  value={editContent}
                  onChange={(newHtml) => {
                    setEditContent(newHtml);
                    setIsSaved(false);
                    handleUpdateActiveNote({ content: newHtml });
                  }}
                  minHeight="420px"
                  placeholder="Digite suas anotações de estudo aqui com texto normal formatado..."
                />

                {/* Document Footer Status */}
                <div className="flex items-center justify-between text-xs text-[#64748B] pt-2">
                  <div className="flex items-center gap-3">
                    <span>{stats.words} palavras</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> ~{stats.readMinutes} min de leitura
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isSaved ? 'Salvo no caderno' : 'Salvando...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-slate-400 text-xs">
                Selecione uma anotação na lista ao lado ou crie uma nova.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Teacher Materials Tab - Clean Card Grid */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span className="font-semibold text-[#2563EB] uppercase">{m.assetType}</span>
                    <span>{(m.sizeBytes / 1024).toFixed(0)} KB</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{m.title}</h3>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-3">
                    {m.description || 'Material oficial fornecido para acompanhamento de aula.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs mt-4">
                  <span className="text-emerald-600 font-medium">Disponível</span>
                  <a
                    href={m.externalUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] font-semibold transition-colors text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
