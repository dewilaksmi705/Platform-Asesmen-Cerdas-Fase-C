import {
  AiProviderOption,
  CognitiveDistribution,
  CognitiveLevel,
  GuideSection,
  LearningObjective,
  QuestionType,
  QuestionTypeDistribution,
  SubjectItem,
} from '../types/assessment';

export const DEMO_DATA_LABEL = 'Data contoh — menunggu impor file TP resmi';
export const DEMO_SUBJECT_NOTICE =
  'Data contoh — belum merupakan katalog kurikulum resmi';

export const QUESTION_TYPES: QuestionType[] = ['PG', 'MCMA', 'KATEGORI'];

export const QUESTION_TYPE_META: Record<
  QuestionType,
  {
    nama: string;
    singkatan: string;
    deskripsi: string;
    aturanPenilaian: string;
    warnaBar: string;
  }
> = {
  PG: {
    nama: 'Pilihan Ganda Tunggal (PG)',
    singkatan: 'PG Tunggal',
    deskripsi: 'Empat pilihan jawaban A–D dengan tepat satu jawaban benar.',
    aturanPenilaian: 'Skor penuh (1 poin) jika memilih satu kunci jawaban yang tepat.',
    warnaBar: 'bg-navy-900',
  },
  MCMA: {
    nama: 'Pilihan Ganda Kompleks MCMA',
    singkatan: 'MCMA',
    deskripsi:
      'Memiliki lebih dari satu pilihan benar; murid memilih semua jawaban yang benar.',
    aturanPenilaian:
      'Skor penuh (1 poin) jika memilih seluruh pilihan benar tanpa pilihan salah (tanpa pengurangan nilai tersembunyi).',
    warnaBar: 'bg-cerulean-600',
  },
  KATEGORI: {
    nama: 'Pilihan Ganda Kompleks Kategori',
    singkatan: 'Kategori (B/S)',
    deskripsi:
      'Tiga pernyataan dalam satu kelompok stimulus; setiap pernyataan dijawab Benar atau Salah.',
    aturanPenilaian:
      'Dinilai transparan berdasarkan ketepatan tiap pernyataan (masing-masing 1/3 poin dari 3 pernyataan).',
    warnaBar: 'bg-toska-600',
  },
};

export const DEFAULT_QUESTION_TYPE_DISTRIBUTION: QuestionTypeDistribution = {
  PG: 18,
  MCMA: 6,
  KATEGORI: 6,
};

export const COGNITIVE_LEVEL_META: Record<
  CognitiveLevel,
  { nama: string; deskripsi: string; warnaBar: string; warnaTeks: string }
> = {
  C1: {
    nama: 'Mengingat',
    deskripsi: 'Mengenali atau mengingat kembali fakta, istilah, atau konsep dasar.',
    warnaBar: 'bg-sky-200',
    warnaTeks: 'text-sky-900',
  },
  C2: {
    nama: 'Memahami',
    deskripsi: 'Menjelaskan makna, merangkum, atau menafsirkan informasi.',
    warnaBar: 'bg-sky-400',
    warnaTeks: 'text-sky-900',
  },
  C3: {
    nama: 'Menerapkan',
    deskripsi: 'Menggunakan konsep atau prosedur pada situasi konkret sehari-hari.',
    warnaBar: 'bg-cerulean-600',
    warnaTeks: 'text-sky-900',
  },
  C4: {
    nama: 'Menganalisis',
    deskripsi: 'Menguraikan informasi, membandingkan pola, dan menemukan hubungan.',
    warnaBar: 'bg-teal-500',
    warnaTeks: 'text-teal-900',
  },
  C5: {
    nama: 'Mengevaluasi',
    deskripsi: 'Menilai gagasan, memilih solusi terbaik, dan memberikan alasan logis.',
    warnaBar: 'bg-navy-700',
    warnaTeks: 'text-navy-900',
  },
  C6: {
    nama: 'Mencipta',
    deskripsi: 'Merancang gagasan baru, menyusun kesimpulan kreatif, atau memprediksi.',
    warnaBar: 'bg-navy-900',
    warnaTeks: 'text-navy-900',
  },
};

export const COGNITIVE_LEVELS: CognitiveLevel[] = [
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
];

export const DEFAULT_COGNITIVE_DISTRIBUTION: CognitiveDistribution = {
  C1: 3,
  C2: 6,
  C3: 9,
  C4: 6,
  C5: 3,
  C6: 3,
};

export const MOCK_SUBJECTS_FASE_C: SubjectItem[] = [
  {
    id: 'matematika',
    nama: 'Matematika',
    singkatan: 'MTK',
    deskripsiSingkat: 'Bilangan cacah besar, pecahan, geometri bangun datar dan ruang, serta analisis data sederhana.',
    fokusFaseC: 'Penalaran numerasi dan pemecahan masalah kontekstual Kelas 5 dan 6.',
  },
  {
    id: 'bahasa-indonesia',
    nama: 'Bahasa Indonesia',
    singkatan: 'BIN',
    deskripsiSingkat: 'Pemahaman teks informasi dan sastra, gagasan pokok, kosakata baku, serta struktur kalimat efektif.',
    fokusFaseC: 'Literasi membaca kritis dan komunikasi tertulis SD Fase C.',
  },
  {
    id: 'ipas',
    nama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    singkatan: 'IPAS',
    deskripsiSingkat: 'Sistem organ tubuh, ekosistem, energi, tata surya, serta interaksi sosial dan sejarah Nusantara.',
    fokusFaseC: 'Inkuiri ilmiah dan pemahaman lingkungan sosial-alam Fase C.',
  },
  {
    id: 'pendidikan-pancasila',
    nama: 'Pendidikan Pancasila',
    singkatan: 'PPKn',
    deskripsiSingkat: 'Nilai-nilai Pancasila dalam kehidupan sehari-hari, norma, hak dan kewajiban, serta kebinekaan.',
    fokusFaseC: 'Pengamalan nilai kewarganegaraan di lingkungan sekolah dan masyarakat.',
  },
  {
    id: 'bahasa-inggris',
    nama: 'Bahasa Inggris',
    singkatan: 'BIG',
    deskripsiSingkat: 'Kosakata aktivitas harian, kalimat sederhana waktu lampau dan akan datang, serta teks pendek.',
    fokusFaseC: 'Pemahaman teks fungsional sederhana dan percakapan dasar Fase C.',
  },
  {
    id: 'seni-rupa',
    nama: 'Seni Rupa',
    singkatan: 'SRP',
    deskripsiSingkat: 'Unsur dan prinsip seni rupa, ritme, proporsi, ragam hias Nusantara, serta apresiasi karya.',
    fokusFaseC: 'Eksplorasi visual dan pengenalan karya kriya daerah SD Fase C.',
  },
];

export const MOCK_LEARNING_OBJECTIVES: LearningObjective[] = [
  // Matematika Kelas 5
  {
    id: 'tp-mtk-5-01',
    kode: 'MTK.C.5.1',
    mataPelajaranId: 'matematika',
    mataPelajaranNama: 'Matematika',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Bilangan',
    rumusan:
      'Peserta didik mampu membaca, menulis, menentukan nilai tempat, membandingkan, dan mengurutkan bilangan cacah sampai 1.000.000 dalam konteks kehidupan sehari-hari.',
    ruangLingkupMateri: 'Bilangan cacah sampai 1.000.000 dan nilai tempat',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-mtk-5-02',
    kode: 'MTK.C.5.2',
    mataPelajaranId: 'matematika',
    mataPelajaranNama: 'Matematika',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Bilangan',
    rumusan:
      'Peserta didik mampu menyelesaikan operasi penjumlahan dan pengurangan pecahan dengan penyebut berbeda serta menerapkannya pada soal cerita sederhana.',
    ruangLingkupMateri: 'Operasi hitung pecahan berpenyebut berbeda',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-mtk-5-03',
    kode: 'MTK.C.5.3',
    mataPelajaranId: 'matematika',
    mataPelajaranNama: 'Matematika',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Pengukuran',
    rumusan:
      'Peserta didik mampu menghitung keliling dan luas berbagai bangun datar gabungan (persegi, persegi panjang, dan segitiga) menggunakan satuan baku.',
    ruangLingkupMateri: 'Keliling dan luas bangun datar gabungan',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // Matematika Kelas 6
  {
    id: 'tp-mtk-6-01',
    kode: 'MTK.C.6.1',
    mataPelajaranId: 'matematika',
    mataPelajaranNama: 'Matematika',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Bilangan',
    rumusan:
      'Peserta didik mampu menyelesaikan masalah yang berkaitan dengan perkalian, pembagian, dan perbandingan rasio pecahan maupun desimal secara tepat.',
    ruangLingkupMateri: 'Operasi pecahan, desimal, dan rasio sederhana',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-mtk-6-02',
    kode: 'MTK.C.6.2',
    mataPelajaranId: 'matematika',
    mataPelajaranNama: 'Matematika',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Geometri',
    rumusan:
      'Peserta didik mampu mengidentifikasi sifat-sifat bangun ruang kubus dan balok serta menghitung volume dan luas permukaannya dalam masalah kontekstual.',
    ruangLingkupMateri: 'Volume dan luas permukaan kubus serta balok',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-mtk-6-03',
    kode: 'MTK.C.6.3',
    mataPelajaranId: 'matematika',
    mataPelajaranNama: 'Matematika',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Analisis Data dan Peluang',
    rumusan:
      'Peserta didik mampu menafsirkan data pada tabel, diagram batang, dan piktogram serta menentukan rata-rata sederhana untuk menarik kesimpulan.',
    ruangLingkupMateri: 'Membaca diagram data dan ukuran pemusatan sederhana',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // Bahasa Indonesia Kelas 5
  {
    id: 'tp-bin-5-01',
    kode: 'BIN.C.5.1',
    mataPelajaranId: 'bahasa-indonesia',
    mataPelajaranNama: 'Bahasa Indonesia',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Membaca dan Memirsa',
    rumusan:
      'Peserta didik mampu mengidentifikasi ide pokok, gagasan pendukung, dan informasi tersurat dari teks informasional bertema lingkungan sekitar.',
    ruangLingkupMateri: 'Ide pokok dan gagasan pendukung teks informasional',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-bin-5-02',
    kode: 'BIN.C.5.2',
    mataPelajaranId: 'bahasa-indonesia',
    mataPelajaranNama: 'Bahasa Indonesia',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Menulis',
    rumusan:
      'Peserta didik mampu menggunakan kaidah imbuhan, tanda baca, dan kalimat majemuk setara secara tepat dalam paragraf deskriptif pendek.',
    ruangLingkupMateri: 'Imbuhan, tanda baca, dan kalimat majemuk setara',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // Bahasa Indonesia Kelas 6
  {
    id: 'tp-bin-6-01',
    kode: 'BIN.C.6.1',
    mataPelajaranId: 'bahasa-indonesia',
    mataPelajaranNama: 'Bahasa Indonesia',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Membaca dan Memirsa',
    rumusan:
      'Peserta didik mampu membedakan pernyataan fakta dan opini serta mengevaluasi kesesuaian informasi dalam teks eksplanasi maupun berita anak.',
    ruangLingkupMateri: 'Fakta, opini, dan informasi teks eksplanasi',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-bin-6-02',
    kode: 'BIN.C.6.2',
    mataPelajaranId: 'bahasa-indonesia',
    mataPelajaranNama: 'Bahasa Indonesia',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Menyimak dan Membaca',
    rumusan:
      'Peserta didik mampu menyimpulkan amanat, watak tokoh, dan makna ungkapan atau majas sederhana yang terdapat dalam cerita fiksi anak.',
    ruangLingkupMateri: 'Unsur intrinsik cerita dan makna ungkapan',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // IPAS Kelas 5
  {
    id: 'tp-ipas-5-01',
    kode: 'IPAS.C.5.1',
    mataPelajaranId: 'ipas',
    mataPelajaranNama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Pemahaman IPAS (Sains)',
    rumusan:
      'Peserta didik mampu menganalisis sifat-sifat cahaya dan bunyi serta keterkaitannya dengan cara kerja indra penglihatan dan pendengaran manusia.',
    ruangLingkupMateri: 'Sifat cahaya, sifat bunyi, dan organ indra manusia',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-ipas-5-02',
    kode: 'IPAS.C.5.2',
    mataPelajaranId: 'ipas',
    mataPelajaranNama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Pemahaman IPAS (Sains)',
    rumusan:
      'Peserta didik mampu menjelaskan hubungan antarmakhluk hidup dalam rantai makanan dan jaring-jaring makanan serta dampak gangguan keseimbangan ekosistem.',
    ruangLingkupMateri: 'Rantai makanan dan keseimbangan ekosistem',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-ipas-5-03',
    kode: 'IPAS.C.5.3',
    mataPelajaranId: 'ipas',
    mataPelajaranNama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Pemahaman IPAS (Sosial)',
    rumusan:
      'Peserta didik mampu mengidentifikasi kondisi geografis wilayah Indonesia serta pengaruhnya terhadap keragaman kegiatan ekonomi masyarakat.',
    ruangLingkupMateri: 'Letak geografis Indonesia dan kegiatan ekonomi lokal',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // IPAS Kelas 6
  {
    id: 'tp-ipas-6-01',
    kode: 'IPAS.C.6.1',
    mataPelajaranId: 'ipas',
    mataPelajaranNama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Pemahaman IPAS (Sains)',
    rumusan:
      'Peserta didik mampu menjelaskan fungsi rangka, sendi, otot, dan sistem saraf dalam mendukung gerak manusia serta cara menjaga kesehatannya.',
    ruangLingkupMateri: 'Sistem gerak manusia dan kesehatan tulang-otot',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-ipas-6-02',
    kode: 'IPAS.C.6.2',
    mataPelajaranId: 'ipas',
    mataPelajaranNama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Pemahaman IPAS (Sains)',
    rumusan:
      'Peserta didik mampu membedakan peristiwa rotasi dan revolusi Bumi serta dampaknya terhadap pembagian waktu, pergantian siang-malam, dan musim.',
    ruangLingkupMateri: 'Sistem tata surya, rotasi, dan revolusi Bumi',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // Pendidikan Pancasila Kelas 5 & 6
  {
    id: 'tp-pp-5-01',
    kode: 'PP.C.5.1',
    mataPelajaranId: 'pendidikan-pancasila',
    mataPelajaranNama: 'Pendidikan Pancasila',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Pancasila',
    rumusan:
      'Peserta didik mampu mengidentifikasi contoh penerapan nilai-nilai Pancasila dalam kegiatan gotong royong di lingkungan keluarga dan sekolah.',
    ruangLingkupMateri: 'Pengamalan nilai Pancasila dan gotong royong',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-pp-5-02',
    kode: 'PP.C.5.2',
    mataPelajaranId: 'pendidikan-pancasila',
    mataPelajaranNama: 'Pendidikan Pancasila',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Undang-Undang Dasar 1945',
    rumusan:
      'Peserta didik mampu membedakan bentuk norma, hak, dan kewajiban sebagai anak di rumah maupun sebagai warga sekolah secara seimbang.',
    ruangLingkupMateri: 'Norma, hak, dan kewajiban di sekolah dan rumah',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-pp-6-01',
    kode: 'PP.C.6.1',
    mataPelajaranId: 'pendidikan-pancasila',
    mataPelajaranNama: 'Pendidikan Pancasila',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Bhinneka Tunggal Ika',
    rumusan:
      'Peserta didik mampu mengevaluasi sikap menghargai keberagaman budaya, suku, dan agama guna menjaga persatuan di lingkungan masyarakat.',
    ruangLingkupMateri: 'Keberagaman budaya dan persatuan bangsa',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // Bahasa Inggris Kelas 5 & 6
  {
    id: 'tp-big-5-01',
    kode: 'BIG.C.5.1',
    mataPelajaranId: 'bahasa-inggris',
    mataPelajaranNama: 'Bahasa Inggris',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Membaca - Memirsa',
    rumusan:
      'Peserta didik mampu memahami kosakata dan kalimat sederhana mengenai rasa makanan, harga, serta aktivitas sehari-hari dari teks bergambar pendek.',
    ruangLingkupMateri: 'Daily routines, food tastes, and simple descriptions',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-big-6-01',
    kode: 'BIG.C.6.1',
    mataPelajaranId: 'bahasa-inggris',
    mataPelajaranNama: 'Bahasa Inggris',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Membaca - Memirsa',
    rumusan:
      'Peserta didik mampu mengidentifikasi informasi spesifik pada teks pendek berbentuk pengalaman masa lalu (simple past tense) dan rencana kegiatan.',
    ruangLingkupMateri: 'Past experience sentences and future plans',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  // Seni Rupa Kelas 5 & 6
  {
    id: 'tp-srp-5-01',
    kode: 'SRP.C.5.1',
    mataPelajaranId: 'seni-rupa',
    mataPelajaranNama: 'Seni Rupa',
    jenjang: 'SD',
    fase: 'C',
    kelas: 5,
    elemen: 'Mengalami dan Merefleksikan',
    rumusan:
      'Peserta didik mampu mengenali unsur garis, warna, tekstur, serta prinsip ritme dan keseimbangan dalam karya ragam hias Nusantara.',
    ruangLingkupMateri: 'Unsur seni rupa dan prinsip ritme pada ragam hias',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
  {
    id: 'tp-srp-6-01',
    kode: 'SRP.C.6.1',
    mataPelajaranId: 'seni-rupa',
    mataPelajaranNama: 'Seni Rupa',
    jenjang: 'SD',
    fase: 'C',
    kelas: 6,
    elemen: 'Menciptakan dan Berdampak',
    rumusan:
      'Peserta didik mampu menganalisis teknik dasar anyaman dan karya kriya ramah lingkungan serta membedakan fungsi estetis dan fungsi pakainya.',
    ruangLingkupMateri: 'Teknik anyaman dan karya kriya daur ulang',
    sumberDokumen: DEMO_DATA_LABEL,
    isMockData: true,
  },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'membuat-asesmen',
    urutan: '01',
    judul: 'Cara Membuat Asesmen',
    ringkasan:
      'Susun rancangan asesmen sumatif SD Fase C secara bertahap berdasarkan tujuan pembelajaran yang ingin diukur.',
    langkah: [
      {
        judul: 'Buka halaman Buat Asesmen',
        uraian:
          'Klik tombol "Buat Asesmen" dari Dashboard atau menu navigasi di sisi kiri layar.',
      },
      {
        judul: 'Tentukan identitas kelas dan mata pelajaran',
        uraian:
          'Isi judul asesmen, pastikan jenjang SD dan Fase C sudah sesuai, lalu pilih Kelas 5 atau Kelas 6 beserta mata pelajaran.',
      },
      {
        judul: 'Pilih satu atau beberapa Tujuan Pembelajaran (TP)',
        uraian:
          'Centang TP yang relevan dengan materi sumatif yang telah dipelajari murid agar soal yang disusun tepat sasaran.',
      },
      {
        judul: 'Atur jumlah soal, distribusi C1–C6, dan durasi',
        uraian:
          'Tetapkan jumlah soal pilihan ganda A–D (bawaan 30 soal), sesuaikan sebaran level kognitif C1 sampai C6, serta durasi pengerjaan dalam menit.',
      },
      {
        judul: 'Periksa dan setujui soal sebelum diterbitkan',
        uraian:
          'Saat fitur generasi AI aktif nanti, guru wajib meninjau, menyunting bila perlu, dan menyetujui setiap butir soal sebelum asesmen dibagikan kepada murid.',
      },
    ],
    catatanPenting:
      'Seluruh asesmen pada platform ini dirancang khusus untuk Sekolah Dasar Fase C (Kelas 5 dan Kelas 6).',
  },
  {
    id: 'memasukkan-api-key',
    urutan: '02',
    judul: 'Cara Memasukkan API Key AI',
    ringkasan:
      'ASESMEN CERDAS menerapkan konsep BYOK (Bring Your Own Key) agar guru memegang kendali penuh atas penggunaan layanan AI.',
    langkah: [
      {
        judul: 'Siapkan API Key pribadi dari penyedia AI',
        uraian:
          'Pada tahap integrasi nanti, guru menyiapkan kunci API pribadi dari penyedia layanan AI yang dipilih pada halaman Pengaturan.',
      },
      {
        judul: 'Masukkan API Key hanya saat proses pembuatan soal',
        uraian:
          'API Key dimasukkan secara khusus untuk sesi pembuatan asesmen yang sedang berlangsung.',
      },
      {
        judul: 'Tidak disimpan secara permanen',
        uraian:
          'Demi keamanan dan privasi, sistem tidak menyimpan API Key guru secara permanen di database ataupun riwayat akun.',
      },
    ],
    catatanPenting:
      'Pada tahap kerangka antarmuka saat ini, aplikasi belum meminta, memproses, atau menyimpan API Key sungguhan.',
  },
  {
    id: 'kode-peserta',
    urutan: '03',
    judul: 'Cara Membuat Kode Peserta',
    ringkasan:
      'Karena guru tidak menggunakan akun permanen, pelaksanaan asesmen dihubungkan melalui kode asesmen dan kode peserta.',
    langkah: [
      {
        judul: 'Terbitkan asesmen yang telah disetujui',
        uraian:
          'Setelah seluruh butir soal diperiksa dan disetujui guru, sistem akan menghasilkan kode asesmen untuk dibagikan ke kelas.',
      },
      {
        judul: 'Bagikan kode kepada murid kelas 5 atau 6',
        uraian:
          'Tuliskan kode asesmen di papan tulis atau kirimkan melalui grup kelas agar mudah diketik oleh murid.',
      },
      {
        judul: 'Murid mengisi identitas secara mandiri',
        uraian:
          'Data murid tidak perlu diunggah sebelumnya. Murid memasukkan nama lengkap, kelas, dan nomor absen bersama kode peserta yang disediakan sistem.',
      },
    ],
    catatanPenting:
      'Jika terdeteksi identitas ganda, sistem hanya akan memunculkan peringatan kepada guru dan tidak otomatis menolak peserta agar pelaksanaan ujian tetap inklusif bagi murid SD.',
  },
  {
    id: 'murid-mengerjakan',
    urutan: '04',
    judul: 'Cara Murid Mengerjakan Asesmen',
    ringkasan:
      'Antarmuka pengerjaan dirancang sederhana, ramah anak SD kelas 5 dan 6, serta nyaman diakses dari laptop, tablet, maupun smartphone.',
    langkah: [
      {
        judul: 'Masukkan kode asesmen dan identitas diri',
        uraian:
          'Murid membuka tautan asesmen, mengetik kode dari guru, lalu mengisi nama dan kelas dengan benar.',
      },
      {
        judul: 'Baca petunjuk dan perhatikan waktu pengerjaan',
        uraian:
          'Murid dapat melihat jumlah soal dan sisa durasi waktu dalam menit yang tampil jelas di layar.',
      },
      {
        judul: 'Pilih jawaban A, B, C, atau D',
        uraian:
          'Murid menjawab setiap soal pilihan ganda dengan tenang dan dapat meninjau ulang nomor soal sebelum menekan tombol selesai.',
      },
    ],
  },
  {
    id: 'unduh-laporan',
    urutan: '05',
    judul: 'Cara Mengunduh Laporan',
    ringkasan:
      'Analisis hasil asesmen membantu guru memetakan capaian murid per Tujuan Pembelajaran dan tingkat kognitif C1–C6.',
    langkah: [
      {
        judul: 'Tunggu seluruh peserta menyelesaikan asesmen',
        uraian:
          'Guru memantau kelengkapan pengiriman jawaban peserta pada sesi asesmen yang sedang berjalan.',
      },
      {
        judul: 'Tinjau ringkasan nilai dan analisis per TP',
        uraian:
          'Lihat nilai setiap murid, butir soal yang paling menantang, serta ketercapaian masing-masing Tujuan Pembelajaran Fase C.',
      },
      {
        judul: 'Unduh laporan segera setelah sesi selesai',
        uraian:
          'Simpan file laporan hasil asesmen ke perangkat guru. Karena tidak ada akun permanen atau riwayat asesmen permanen di dashboard, pastikan laporan sudah diunduh sebelum menutup sesi.',
      },
    ],
  },
];

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: 'gemini',
    nama: 'Google Gemini',
    penyedia: 'Google AI',
    modelRencana: 'Model Gemini terbaik dipilih otomatis',
    deskripsi:
      'Gratis dengan API Key dari Google AI Studio. Aplikasi otomatis memilih model Gemini terbaru yang tersedia, dan berpindah ke model lain bila satu model sedang sibuk.',
  },
];
