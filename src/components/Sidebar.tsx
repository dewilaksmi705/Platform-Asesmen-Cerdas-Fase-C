import {
  BookOpen,
  BookOpenCheck,
  FilePlus2,
  HelpCircle,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { PageId } from '../types/assessment';
import { BrandMark } from './BrandMark';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'buat-asesmen', label: 'Buat Asesmen', icon: FilePlus2 },
  { id: 'pengerjaan-murid', label: 'Pengerjaan Murid', icon: BookOpenCheck },
  { id: 'katalog-tp', label: 'Katalog Tujuan Pembelajaran', icon: BookOpen },
  { id: 'panduan', label: 'Panduan Penggunaan', icon: HelpCircle },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

export function Sidebar({
  activePage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (page: PageId) => {
    onNavigate(page);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-navy-900 text-white select-none">
      {/* Identitas aplikasi bagian atas */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-3 text-left group focus-visible:outline-sky-400 rounded-lg"
        >
          <BrandMark className="w-9 h-9 shrink-0 transition-transform duration-150 group-hover:scale-[1.03]" />
          <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
            ASESMEN CERDAS
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 -mr-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Tutup menu navigasi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Menu navigasi utama */}
      <nav
        className="flex-1 px-3 py-5 space-y-1 overflow-y-auto"
        aria-label="Navigasi utama"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activePage === item.id ||
            ((activePage === 'konfigurasi-ai' ||
              activePage === 'tinjau-soal') &&
              item.id === 'buat-asesmen');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors duration-150 text-left ${
                isActive
                  ? 'bg-white/12 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/6 hover:text-white'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                  isActive ? 'text-toska-500' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Informasi bagian bawah sidebar */}
      <div className="px-5 py-4 border-t border-white/10 shrink-0">
        <p className="text-xs font-medium text-slate-200 leading-relaxed">
          Platform Asesmen Sumatif SD Fase C
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Khusus Kelas 5 &amp; Kelas 6 SD
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar tetap untuk desktop */}
      <aside className="hidden lg:block lg:w-[272px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-navy-950/20">
        {sidebarContent}
      </aside>

      {/* Overlay & drawer untuk mobile / tablet */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi ASESMEN CERDAS"
        >
          <div
            className="fixed inset-0 bg-navy-950/50 backdrop-blur-[2px] transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[284px] max-w-[85vw] h-full shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
