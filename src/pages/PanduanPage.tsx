import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { EditorialImage } from '../components/BrandMark';
import { GUIDE_SECTIONS } from '../data/mockFaseCData';
import { PageId } from '../types/assessment';

interface PanduanPageProps {
  initialSectionId?: string | null;
  onClearInitialSection?: () => void;
  onNavigate: (page: PageId) => void;
}

const GUIDE_IMAGE_PATH = '/src/assets/images/guide_asesmen_murid_1795612948714.jpg';

export function PanduanPage({
  initialSectionId,
  onClearInitialSection,
  onNavigate,
}: PanduanPageProps) {
  const [activeTopicId, setActiveTopicId] = useState<string>(
    initialSectionId || GUIDE_SECTIONS[0].id
  );
  const [expandedIds, setExpandedIds] = useState<string[]>(
    GUIDE_SECTIONS.map((s) => s.id)
  );

  useEffect(() => {
    if (initialSectionId) {
      setActiveTopicId(initialSectionId);
      setExpandedIds((prev) =>
        prev.includes(initialSectionId) ? prev : [...prev, initialSectionId]
      );
      const target = document.getElementById(`panduan-${initialSectionId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      onClearInitialSection?.();
    }
  }, [initialSectionId, onClearInitialSection]);

  const handleJumpTopic = (sectionId: string) => {
    setActiveTopicId(sectionId);
    setExpandedIds((prev) =>
      prev.includes(sectionId) ? prev : [...prev, sectionId]
    );
    const el = document.getElementById(`panduan-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header & Ilustrasi Panduan */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            <p className="text-xs font-medium text-toska-600 mb-2">
              Dokumentasi Guru &amp; Pelaksanaan Kelas · SD Fase C
            </p>
            <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-navy-900">
              Panduan Penggunaan ASESMEN CERDAS
            </h1>
            <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-xl">
              Pelajari alur lengkap dari penyusunan soal berbantuan kecerdasan
              artifisial, penggunaan API Key pribadi per sesi, hingga cara murid
              kelas 5 dan kelas 6 mengerjakan asesmen serta pengunduhan laporan.
            </p>

            {/* Navigasi cepat 5 topik panduan */}
            <div className="mt-6 flex flex-wrap gap-2">
              {GUIDE_SECTIONS.map((sec) => {
                const isActive = activeTopicId === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleJumpTopic(sec.id)}
                    className={`px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-navy-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-navy-900'
                    }`}
                  >
                    {sec.urutan}. {sec.judul}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-sky-50/70 border-t lg:border-t-0 lg:border-l border-slate-200 min-h-[200px] lg:min-h-full">
            <EditorialImage
              src={GUIDE_IMAGE_PATH}
              alt="Ilustrasi murid SD Fase C mengerjakan asesmen dengan tenang menggunakan tablet di kelas"
              fallbackTitle="Pelaksanaan Asesmen Ramah Anak SD"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Daftar 5 Bagian Panduan */}
      <div className="space-y-4">
        {GUIDE_SECTIONS.map((section) => {
          const isOpen = expandedIds.includes(section.id);
          return (
            <article
              key={section.id}
              id={`panduan-${section.id}`}
              className="scroll-mt-24 bg-white border border-slate-200 rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-toska-600 mb-1">
                    <span>Panduan {section.urutan}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-navy-900">
                    {section.judul}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-3xl">
                    {section.ringkasan}
                  </p>
                </div>

                <span className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-1">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-5">
                  <ol className="space-y-4 pt-3">
                    {section.langkah.map((step, index) => (
                      <li key={step.judul} className="flex items-start gap-3.5">
                        <span className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200/70 text-cerulean-600 font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-navy-900">
                            {step.judul}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                            {step.uraian}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {section.catatanPenting && (
                    <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-navy-900">
                      <Info className="w-4 h-4 text-cerulean-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <span className="font-semibold">Catatan Penting:</span>{' '}
                        {section.catatanPenting}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Ajakan Aksi Bawah */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-navy-900">
            Siap mencoba alur penyusunan asesmen?
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Coba formulir bertahap Buat Asesmen atau tinjau rancangan pengaturan
            BYOK.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('pengaturan')}
            className="px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-medium text-navy-900 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            Lihat Pengaturan
          </button>
          <button
            type="button"
            onClick={() => onNavigate('buat-asesmen')}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 transition-colors whitespace-nowrap"
          >
            <span>Buat Asesmen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
