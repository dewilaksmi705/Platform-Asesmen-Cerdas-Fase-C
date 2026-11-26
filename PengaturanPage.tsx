import { useState } from 'react';
import {
  Check,
  Cpu,
  Info,
  KeyRound,
  Lock,
  Shield,
} from 'lucide-react';
import { AI_PROVIDER_OPTIONS } from '../data/mockFaseCData';

export function PengaturanPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    AI_PROVIDER_OPTIONS[0].id
  );

  const selectedProvider =
    AI_PROVIDER_OPTIONS.find((p) => p.id === selectedProviderId) ||
    AI_PROVIDER_OPTIONS[0];

  const privacyPoints = [
    {
      judul: 'Tanpa Akun Permanen Guru',
      uraian:
        'Guru dapat langsung menggunakan ASESMEN CERDAS tanpa mendaftar atau membuat akun permanen. Tidak ada penyimpanan riwayat asesmen permanen pada dashboard.',
    },
    {
      judul: 'API Key Pribadi Bersifat Sesi (BYOK)',
      uraian:
        'API Key AI hanya akan dimasukkan guru setiap kali memulai proses pembuatan soal dan tidak pernah disimpan secara permanen di server maupun database.',
    },
    {
      judul: 'Input Mandiri Murid Berbasis Kode Peserta',
      uraian:
        'Data murid diperoleh secara mandiri saat murid memasukkan kode peserta yang dihasilkan sistem, sehingga guru tidak perlu mengunggah daftar data pribadi murid terlebih dahulu.',
    },
    {
      judul: 'Penanganan Identitas Ganda yang Inklusif',
      uraian:
        'Apabila terdapat kesamaan identitas peserta pada satu sesi, sistem hanya menampilkan peringatan kepada guru dan tidak otomatis menolak peserta.',
    },
    {
      judul: 'Cakupan Khusus SD Fase C',
      uraian:
        'Platform dikunci secara konsisten untuk Sekolah Dasar Fase C (Kelas 5 dan Kelas 6) agar seluruh alur dan kosakata tetap fokus dan ramah anak.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-toska-600 mb-1">
          Konfigurasi &amp; Transparansi Sistem
        </p>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-navy-900">
          Pengaturan
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Rancangan pengaturan penyedia kecerdasan artifisial, kebijakan API Key
          pribadi guru, privasi data, serta informasi versi aplikasi ASESMEN
          CERDAS.
        </p>
      </div>

      {/* 1. Pengaturan Penyedia AI */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-cerulean-600 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-navy-900">
              Pengaturan Penyedia AI
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Pilih preferensi penyedia layanan AI yang direncanakan untuk
              membantu penyusunan draf soal SD Fase C.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-4"
          role="radiogroup"
          aria-label="Pilihan penyedia AI"
        >
          {AI_PROVIDER_OPTIONS.map((provider) => {
            const active = selectedProviderId === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedProviderId(provider.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                  active
                    ? 'bg-sky-50/90 border-cerulean-600'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-navy-900">
                      {provider.nama}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-cerulean-600 border-cerulean-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {provider.penyedia}
                  </p>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {provider.deskripsi}
                  </p>
                </div>

                <p className="mt-4 pt-3 border-t border-slate-200/70 text-[11px] font-medium text-toska-600">
                  {provider.modelRencana}
                </p>
              </button>
            );
          })}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-slate-700">
          <Info className="w-4 h-4 text-cerulean-600 shrink-0 mt-0.5" />
          <p>
            Pilihan saat ini: <strong className="text-navy-900">{selectedProvider.nama}</strong>{' '}
            (hanya simulasi antarmuka lokal). Koneksi ke API penyedia AI belum
            diaktifkan pada tahap pertama ini.
          </p>
        </div>
      </section>

      {/* 2. Informasi Penggunaan API Key Pribadi Guru (BYOK) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-toska-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-navy-900">
              Informasi Penggunaan API Key Pribadi Guru (BYOK)
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Kebijakan Bring Your Own Key untuk menjaga keamanan dan kendali
              penuh di tangan guru.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-700 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Dimasukkan Per Proses Pembuatan Asesmen
            </h3>
            <p>
              Ketika integrasi AI tersedia nanti, API Key pribadi guru akan
              diminta tepat saat proses pembuatan draf soal berlangsung dan
              hanya digunakan untuk memproses permintaan pada sesi tersebut.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Tidak Pernah Disimpan Secara Permanen
            </h3>
            <p>
              ASESMEN CERDAS tidak menyimpan API Key pada penyimpanan permanen,
              database, atau profil pengguna. Setelah sesi pembuatan selesai,
              kunci tidak tertinggal di sistem.
            </p>
          </div>
        </div>

        <div className="bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-3.5 flex items-start gap-3 text-xs sm:text-sm text-navy-900">
          <Lock className="w-4 h-4 text-toska-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold">Status Tahap Pertama:</span> Pada
            tahap kerangka antarmuka ini, aplikasi{' '}
            <span className="font-semibold">
              tidak meminta maupun menyimpan API Key sungguhan
            </span>
            . Kolom input kunci API sengaja tidak diaktifkan agar guru tidak
            memasukkan kredensial pribadi sebelum integrasi resmi siap.
          </p>
        </div>
      </section>

      {/* 3. Informasi Privasi dan Penyimpanan Data */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-navy-900 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-navy-900">
              Informasi Privasi dan Penyimpanan Data
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Prinsip pengelolaan data yang dirancang ringan, aman, dan sesuai
              kebutuhan sekolah dasar.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {privacyPoints.map((item) => (
            <div
              key={item.judul}
              className="py-4 first:pt-1 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6"
            >
              <h3 className="md:col-span-4 text-sm font-semibold text-navy-900">
                {item.judul}
              </h3>
              <p className="md:col-span-8 text-sm text-slate-600 leading-relaxed">
                {item.uraian}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Informasi Versi Aplikasi */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-base sm:text-lg font-bold text-navy-900">
            Informasi Versi Aplikasi
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Identitas dan tahap pengembangan platform saat ini.
          </p>
        </div>

        <dl className="divide-y divide-slate-100 text-sm">
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-slate-500">Nama Aplikasi</dt>
            <dd className="sm:col-span-2 font-bold text-navy-900">
              ASESMEN CERDAS
            </dd>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-slate-500">Tagline</dt>
            <dd className="sm:col-span-2 text-navy-900">
              Asesmen Lebih Cerdas, Pembelajaran Lebih Bermakna.
            </dd>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-slate-500">Cakupan Jenjang &amp; Fase</dt>
            <dd className="sm:col-span-2 font-medium text-navy-900">
              Sekolah Dasar (SD) · Fase C · Kelas 5 dan Kelas 6
            </dd>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-slate-500">Versi Antarmuka</dt>
            <dd className="sm:col-span-2 font-mono text-navy-900 tabular-nums">
              0.1.0 (Tahap 1 — Kerangka Antarmuka Frontend)
            </dd>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-slate-500">Status Integrasi</dt>
            <dd className="sm:col-span-2 text-slate-700">
              Pratinjau antarmuka lokal menggunakan data contoh (belum terhubung
              ke database, autentikasi, atau API AI).
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
