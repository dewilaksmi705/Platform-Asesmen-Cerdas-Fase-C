import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpenCheck,
  Cpu,
  FilePlus2,
} from 'lucide-react';
import { EditorialImage } from '../components/BrandMark';
import { PageId } from '../types/assessment';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  onNavigateGuideSection: (sectionId: string) => void;
}

const HERO_IMAGE_PATH = '/src/assets/images/hero_asesmen_cerdas_1795612947279.jpg';

export function DashboardPage({
  onNavigate,
  onNavigateGuideSection,
}: DashboardPageProps) {
  const featureCards = [
    {
      title: 'Mata Pelajaran Fase C',
      description:
        'Terstruktur khusus untuk mata pelajaran Sekolah Dasar Kelas 5 dan Kelas 6 sesuai cakupan Fase C.',
      actionLabel: 'Lihat mata pelajaran',
      icon: BookOpenCheck,
      iconBg: 'bg-sky-50 text-cerulean-600',
      onClick: () => onNavigate('katalog-tp'),
    },
    {
      title: 'Katalog Tujuan Pembelajaran',
      description:
        'Telusuri rumusan Tujuan Pembelajaran per kelas dan elemen untuk memastikan soal tepat sasaran.',
      actionLabel: 'Buka katalog TP',
      icon: BookMarked,
      iconBg: 'bg-teal-50 text-toska-600',
      onClick: () => onNavigate('katalog-tp'),
    },
    {
      title: 'Generasi Soal Berbantuan AI',
      description:
        'Susun draf soal pilihan ganda A–D berdasarkan distribusi tingkat kognitif C1–C6 dengan persetujuan penuh guru.',
      actionLabel: 'Rancang asesmen',
      icon: Cpu,
      iconBg: 'bg-sky-50 text-navy-900',
      onClick: () => onNavigate('buat-asesmen'),
    },
    {
      title: 'Analisis Hasil Asesmen',
      description:
        'Pahami pola capaian murid per Tujuan Pembelajaran dan unduh laporan hasil setelah sesi asesmen berakhir.',
      actionLabel: 'Pelajari alur laporan',
      icon: BarChart3,
      iconBg: 'bg-teal-50 text-toska-600',
      onClick: () => onNavigateGuideSection('unduh-laporan'),
    },
  ];

  const platformSteps = [
    {
      number: '01',
      title: 'Pilih mata pelajaran dan tujuan pembelajaran.',
      detail:
        'Tentukan kelas 5 atau kelas 6, pilih mata pelajaran Fase C, lalu tandai Tujuan Pembelajaran yang hendak diujikan.',
    },
    {
      number: '02',
      title: 'Generate dan tinjau soal menggunakan AI.',
      detail:
        'Atur jumlah soal dan sebaran kognitif C1–C6, lalu periksa serta setujui seluruh butir soal sebelum diterbitkan.',
    },
    {
      number: '03',
      title: 'Bagikan kode asesmen kepada murid dan analisis hasilnya.',
      detail:
        'Murid bergabung secara mandiri menggunakan kode peserta, lalu guru meninjau analisis capaian dan mengunduh laporan.',
    },
  ];

  return (
    <div className="space-y-10">
      {/* 1. Header Sapaan */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-toska-600 mb-3">
              <span>Sekolah Dasar</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Fase C (Kelas 5 &amp; Kelas 6)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-navy-900 leading-[1.2]">
              Selamat Datang di ASESMEN CERDAS
            </h1>

            <p className="mt-2 text-base font-medium text-cerulean-600">
              Asesmen Lebih Cerdas, Pembelajaran Lebih Bermakna.
            </p>

            <p className="mt-4 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-xl">
              Platform pembuatan dan pelaksanaan asesmen sumatif berbantuan
              kecerdasan artifisial yang dirancang khusus bagi guru dan murid
              Sekolah Dasar Fase C. Praktis tanpa akun permanen, ramah anak, dan
              seluruh soal tetap berada di bawah kendali guru.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('buat-asesmen')}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 active:bg-navy-950 transition-colors whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Buat Asesmen</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('panduan')}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-navy-900 bg-slate-100 hover:bg-slate-200/80 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Baca Panduan Singkat</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-sky-50/70 border-t lg:border-t-0 lg:border-l border-slate-200 min-h-[220px] lg:min-h-full">
            <EditorialImage
              src={HERO_IMAGE_PATH}
              alt="Ilustrasi guru SD menyiapkan asesmen sumatif Fase C menggunakan laptop dan buku kurikulum"
              fallbackTitle="Persiapan Asesmen SD Fase C"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 2. Ringkasan Fitur (Tanpa angka statistik palsu) */}
      <section aria-labelledby="ringkasan-fitur-heading">
        <div className="mb-5">
          <h2
            id="ringkasan-fitur-heading"
            className="text-lg sm:text-xl font-bold text-navy-900"
          >
            Ringkasan Fitur Utama
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Dirancang sederhana agar mudah digunakan oleh setiap guru SD Kelas 5
            dan Kelas 6.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className="group text-left bg-white border border-slate-200 hover:border-cerulean-500/60 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-150"
              >
                <div>
                  <div
                    className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-navy-900 leading-snug">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-cerulean-600 group-hover:text-navy-900 transition-colors">
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Area Mulai Membuat Asesmen */}
      <section aria-labelledby="mulai-asesmen-heading">
        <div className="bg-navy-900 text-white rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-toska-500 mb-2">
              Langkah Awal Penyusunan Soal
            </p>
            <h2
              id="mulai-asesmen-heading"
              className="text-xl sm:text-2xl font-bold tracking-tight text-white"
            >
              Mulai Membuat Asesmen
            </h2>
            <p className="mt-2.5 text-sm sm:text-[15px] text-slate-200 leading-relaxed">
              Buat asesmen sumatif berdasarkan tujuan pembelajaran Fase C dengan
              bantuan kecerdasan artifisial.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>Jenjang SD · Fase C</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span>Kelas 5 &amp; Kelas 6</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span>Pilihan Ganda A–D</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span>Wajib Tinjauan Guru</span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('buat-asesmen')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[48px] rounded-xl text-sm font-semibold text-navy-950 bg-toska-500 hover:bg-teal-400 active:bg-teal-300 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Buat Asesmen Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Informasi Platform: Tiga Langkah Penggunaan */}
      <section
        aria-labelledby="langkah-penggunaan-heading"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-6 border-b border-slate-200">
          <div>
            <h2
              id="langkah-penggunaan-heading"
              className="text-lg sm:text-xl font-bold text-navy-900"
            >
              Alur Penggunaan ASESMEN CERDAS
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Tiga langkah terstruktur dari perencanaan tujuan pembelajaran
              hingga analisis hasil murid.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('panduan')}
            className="text-sm font-semibold text-cerulean-600 hover:text-navy-900 transition-colors text-left sm:text-right whitespace-nowrap shrink-0"
          >
            Lihat panduan lengkap
          </button>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-6">
          {platformSteps.map((step) => (
            <li key={step.number} className="flex flex-col">
              <span className="font-mono text-sm font-semibold text-toska-600 tabular-nums">
                Langkah {step.number}
              </span>
              <h3 className="mt-2 text-[15px] font-semibold text-navy-900 leading-snug">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
