import { ArrowLeft, Menu, Plus } from 'lucide-react';
import { PageId } from '../types/assessment';

interface TopBarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenMobileMenu: () => void;
}

const PAGE_BREADCRUMBS: Record<PageId, string> = {
  dashboard: 'Dashboard',
  'buat-asesmen': 'Buat Asesmen',
  'konfigurasi-ai': 'Konfigurasi AI (BYOK)',
  'tinjau-soal': 'Peninjauan & Persetujuan Soal',
  'pengerjaan-murid': 'Pengerjaan Murid',
  'katalog-tp': 'Katalog Tujuan Pembelajaran',
  panduan: 'Panduan Penggunaan',
  pengaturan: 'Pengaturan',
};

export function TopBar({
  activePage,
  onNavigate,
  onOpenMobileMenu,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-navy-900 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-400 whitespace-nowrap shrink-0">
            SD Fase C
          </span>
          <span
            className="hidden sm:inline text-slate-300 shrink-0"
            aria-hidden="true"
          >
            /
          </span>
          <span className="font-semibold text-navy-900 truncate">
            {PAGE_BREADCRUMBS[activePage]}
          </span>
        </div>
      </div>

      <div className="flex items-center shrink-0">
        {activePage === 'konfigurasi-ai' ? (
          <button
            type="button"
            onClick={() => onNavigate('buat-asesmen')}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium text-slate-700 hover:text-navy-900 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Buat Asesmen</span>
          </button>
        ) : activePage === 'buat-asesmen' ? (
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium text-slate-700 hover:text-navy-900 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('buat-asesmen')}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold text-white bg-cerulean-600 hover:bg-sky-700 active:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Asesmen</span>
          </button>
        )}
      </div>
    </header>
  );
}
