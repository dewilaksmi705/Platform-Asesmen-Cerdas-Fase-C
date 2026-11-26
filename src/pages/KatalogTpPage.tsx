import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { fetchAllFaseCCatalog } from '../services/tpCatalogService';
import {
  CatalogLearningObjective,
  KelasFaseC,
} from '../types/assessment';

interface KatalogTpPageProps {
  onUseTpInAssessment: (tp: CatalogLearningObjective) => void;
}

type KelasFilter = 'semua' | KelasFaseC;

export function KatalogTpPage({ onUseTpInAssessment }: KatalogTpPageProps) {
  const [catalog, setCatalog] = useState<CatalogLearningObjective[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [kelasFilter, setKelasFilter] = useState<KelasFilter>('semua');
  const [subjectFilter, setSubjectFilter] = useState<string>('semua');
  const [selectedTpId, setSelectedTpId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchAllFaseCCatalog()
      .then((items) => {
        if (cancelled) return;
        setCatalog(items);
        if (items.length > 0) {
          setSelectedTpId((prev) =>
            items.some((item) => item.id === prev) ? prev : items[0].id
          );
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCatalog([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat katalog Tujuan Pembelajaran dari Supabase.'
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const dynamicSubjects = useMemo(() => {
    const filteredByGrade =
      kelasFilter === 'semua'
        ? catalog
        : catalog.filter((item) => item.grade === kelasFilter);
    const set = new Set<string>();
    filteredByGrade.forEach((item) => set.add(item.subject_name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [catalog, kelasFilter]);

  // Reset filter mata pelajaran jika tidak lagi tersedia pada kelas terpilih
  useEffect(() => {
    if (subjectFilter !== 'semua' && !dynamicSubjects.includes(subjectFilter)) {
      setSubjectFilter('semua');
    }
  }, [dynamicSubjects, subjectFilter]);

  const filteredObjectives = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((tp) => {
      const matchKelas = kelasFilter === 'semua' || tp.grade === kelasFilter;
      const matchSubject =
        subjectFilter === 'semua' || tp.subject_name === subjectFilter;
      const matchQuery =
        !q ||
        tp.subject_name.toLowerCase().includes(q) ||
        tp.tp_code.toLowerCase().includes(q) ||
        tp.element.toLowerCase().includes(q) ||
        tp.tp_text.toLowerCase().includes(q) ||
        tp.material_scope.toLowerCase().includes(q);
      return matchKelas && matchSubject && matchQuery;
    });
  }, [catalog, searchQuery, kelasFilter, subjectFilter]);

  const activeTp = useMemo(() => {
    return (
      filteredObjectives.find((tp) => tp.id === selectedTpId) ||
      filteredObjectives[0] ||
      null
    );
  }, [filteredObjectives, selectedTpId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setKelasFilter('semua');
    setSubjectFilter('semua');
  };

  return (
    <div className="space-y-6">
      {/* Header halaman */}
      <div>
        <p className="text-xs font-medium text-toska-600 mb-1">
          Referensi Kurikulum · SD Fase C
        </p>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
          Katalog Tujuan Pembelajaran
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Telusuri rumusan Tujuan Pembelajaran (TP) untuk Sekolah Dasar Fase C
          (Kelas 5 dan Kelas 6) satu tahun pembelajaran penuh dari katalog
          Supabase.
        </p>
      </div>

      {/* Informasi sumber database */}
      <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl px-4 py-3.5 flex items-start gap-3">
        <Database className="w-4 h-4 text-cerulean-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-navy-900 leading-relaxed">
          <span className="font-semibold">Sumber Data Langsung Supabase:</span>{' '}
          Seluruh daftar mata pelajaran dan rumusan TP dimuat dari view{' '}
          <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-sky-200">
            public.v_learning_objectives_catalog
          </code>{' '}
          tanpa data contoh lokal.
        </div>
      </div>

      {/* Bilah pencarian dan filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Pencarian mata pelajaran / kata kunci */}
          <div className="lg:col-span-6 relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading || Boolean(error)}
              placeholder="Cari mata pelajaran, kode TP, elemen, atau ruang lingkup materi..."
              aria-label="Cari mata pelajaran atau tujuan pembelajaran"
              className="w-full pl-10 pr-9 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 placeholder:text-slate-400 focus:border-cerulean-600 disabled:bg-slate-50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-navy-900"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Mata Pelajaran Dinamis */}
          <div className="lg:col-span-3">
            <label htmlFor="filter-mapel" className="sr-only">
              Filter mata pelajaran
            </label>
            <select
              id="filter-mapel"
              value={subjectFilter}
              disabled={loading || Boolean(error) || dynamicSubjects.length === 0}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm text-navy-900 focus:border-cerulean-600 disabled:bg-slate-50 transition-colors"
            >
              <option value="semua">Semua Mata Pelajaran</option>
              {dynamicSubjects.map((subjectName) => (
                <option key={subjectName} value={subjectName}>
                  {subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas 5 dan 6 (Hanya Fase C) */}
          <div
            className="lg:col-span-3 flex items-center gap-1 p-1 bg-slate-100 rounded-xl"
            role="group"
            aria-label="Filter kelas Fase C"
          >
            {(
              [
                { value: 'semua', label: 'Semua' },
                { value: 5, label: 'Kelas 5' },
                { value: 6, label: 'Kelas 6' },
              ] as { value: KelasFilter; label: string }[]
            ).map((opt) => {
              const active = kelasFilter === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setKelasFilter(opt.value)}
                  className={`flex-1 px-2.5 py-2 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white text-navy-900 shadow-xs'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <span className="tabular-nums">
            {loading ? (
              'Memuat katalog dari Supabase...'
            ) : error ? (
              'Katalog tidak dapat dimuat.'
            ) : (
              <>
                Menampilkan{' '}
                <strong className="text-navy-900">
                  {filteredObjectives.length}
                </strong>{' '}
                Tujuan Pembelajaran Fase C
              </>
            )}
          </span>
          {(searchQuery ||
            kelasFilter !== 'semua' ||
            subjectFilter !== 'semua') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-cerulean-600 hover:text-navy-900 transition-colors"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      </div>

      {/* Kondisi Loading */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="w-7 h-7 text-cerulean-600 animate-spin" />
          <div>
            <p className="text-sm font-bold text-navy-900">
              Memuat Katalog Tujuan Pembelajaran...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Menghubungkan ke Supabase untuk mengambil data SD Fase C (Kelas 5
              &amp; Kelas 6).
            </p>
          </div>
        </div>
      )}

      {/* Kondisi Error (Tanpa Fallback Dummy) */}
      {!loading && error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4 text-red-950"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold">
                Koneksi Katalog Supabase Gagal
              </h2>
              <p className="text-sm text-red-900 leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="pl-8">
            <button
              type="button"
              onClick={() => setReloadTick((n) => n + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        </div>
      )}

      {/* Kondisi Kosong */}
      {!loading && !error && filteredObjectives.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-navy-900">
            Tujuan Pembelajaran Tidak Ditemukan
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
            {catalog.length === 0
              ? 'Belum ada data Tujuan Pembelajaran SD Fase C pada view public.v_learning_objectives_catalog.'
              : 'Tidak ada TP Fase C yang sesuai dengan kata kunci atau filter yang dipilih.'}
          </p>
          {catalog.length > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 transition-colors"
            >
              Tampilkan Semua TP
            </button>
          )}
        </div>
      )}

      {/* Daftar TP + Panel Detail Rumusan TP */}
      {!loading && !error && filteredObjectives.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Daftar TP */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
            {filteredObjectives.map((tp) => {
              const isSelected = activeTp?.id === tp.id;
              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => setSelectedTpId(tp.id)}
                  className={`w-full text-left p-4 sm:p-5 transition-colors block ${
                    isSelected
                      ? 'bg-sky-50/90'
                      : 'bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono font-semibold text-navy-900">
                        {tp.tp_code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-cerulean-600">
                        {tp.subject_name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Kelas {tp.grade}</span>
                    </div>
                    <span className="text-[11px] text-toska-600 font-medium">
                      {tp.element}
                    </span>
                  </div>

                  <p className="text-sm text-navy-900 leading-relaxed">
                    {tp.tp_text}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Ruang lingkup materi: {tp.material_scope}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detail Rumusan TP */}
          {activeTp && (
            <aside
              aria-label="Detail Tujuan Pembelajaran"
              className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 xl:sticky xl:top-24 space-y-5"
            >
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                  <span className="font-mono font-semibold text-navy-900">
                    {activeTp.tp_code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>SD Fase {activeTp.phase}</span>
                  <span aria-hidden="true">·</span>
                  <span>Kelas {activeTp.grade}</span>
                </div>
                <h2 className="text-lg font-bold text-navy-900">
                  {activeTp.subject_name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Elemen: {activeTp.element}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Detail Rumusan Tujuan Pembelajaran
                </h3>
                <p className="text-sm sm:text-[15px] text-navy-900 leading-relaxed">
                  {activeTp.tp_text}
                </p>
              </div>

              <dl className="divide-y divide-slate-100 border-t border-slate-200 pt-3 text-sm">
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">
                    Ruang Lingkup Materi
                  </dt>
                  <dd className="font-medium text-navy-900 mt-0.5">
                    {activeTp.material_scope}
                  </dd>
                </div>

                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">Sumber Katalog</dt>
                  <dd className="mt-1 flex items-start gap-2 text-xs font-medium text-navy-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-cerulean-600 shrink-0 mt-0.5" />
                    <span>
                      Supabase · public.v_learning_objectives_catalog (SD Fase
                      C)
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onUseTpInAssessment(activeTp)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 transition-colors"
                >
                  <span>Gunakan TP Ini di Buat Asesmen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
