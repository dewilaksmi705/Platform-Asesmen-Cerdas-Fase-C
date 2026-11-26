export type PageId =
  | 'dashboard'
  | 'buat-asesmen'
  | 'konfigurasi-ai'
  | 'tinjau-soal'
  | 'pengerjaan-murid'
  | 'katalog-tp'
  | 'panduan'
  | 'pengaturan';

/**
 * Ruang lingkup produk terkunci khusus SD Fase C (Kelas 5 dan Kelas 6).
 */
export type JenjangPendidikan = 'SD';
export type FaseKurikulum = 'C';
export type KelasFaseC = 5 | 6;

export type CognitiveLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
export type CognitiveDistribution = Record<CognitiveLevel, number>;

/**
 * Tiga bentuk soal asesmen sumatif SD Fase C.
 * - PG: Pilihan Ganda Tunggal (A–D, tepat 1 jawaban benar)
 * - MCMA: Pilihan Ganda Kompleks MCMA (beberapa pilihan benar, murid memilih semua yang benar)
 * - KATEGORI: Pilihan Ganda Kompleks Kategori (3 pernyataan dalam 1 stimulus, masing-masing Benar/Salah)
 */
export type QuestionType = 'PG' | 'MCMA' | 'KATEGORI';
export type QuestionTypeDistribution = Record<QuestionType, number>;

export type OptionLabel = 'A' | 'B' | 'C' | 'D';
export type StatementId = 'P1' | 'P2' | 'P3';

export interface QuestionOption {
  label: OptionLabel;
  teks: string;
}

export interface CategoryStatement {
  id: StatementId;
  teks: string;
}

export interface SubjectItem {
  id: string;
  nama: string;
  singkatan: string;
  deskripsiSingkat: string;
  fokusFaseC: string;
}

export interface LearningObjective {
  id: string;
  kode: string;
  mataPelajaranId: string;
  mataPelajaranNama: string;
  jenjang: JenjangPendidikan;
  fase: FaseKurikulum;
  kelas: KelasFaseC;
  elemen: string;
  rumusan: string;
  ruangLingkupMateri: string;
  sumberDokumen: string;
  isMockData: true;
}

/**
 * Representasi baris dari view Supabase `public.v_learning_objectives_catalog`.
 */
export interface CatalogLearningObjective {
  id: string;
  subject_name: string;
  phase: FaseKurikulum;
  grade: KelasFaseC;
  element: string;
  tp_code: string;
  tp_text: string;
  material_scope: string;
}

export interface AssessmentDraft {
  judul: string;
  jenjang: JenjangPendidikan;
  fase: FaseKurikulum;
  kelas: KelasFaseC | null;
  mataPelajaranNama: string;
  selectedTps: CatalogLearningObjective[];
  jumlahSoal: number;
  distribusiTipeSoal: QuestionTypeDistribution;
  distribusiKognitif: CognitiveDistribution;
  durasiMenit: number;
  acakSoal: boolean;
}

/**
 * Soal lengkap milik guru (disimpan aman di server bersama kunci jawaban).
 */
export interface TeacherQuestion {
  id: string;
  nomor: number;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  tpCode: string;
  tpGrade: KelasFaseC;
  tpElement: string;
  tpText: string;
  indikatorSoal: string;
  stimulus: string;
  pertanyaan: string;
  opsi?: QuestionOption[];
  pernyataan?: CategoryStatement[];
  kunciPg?: OptionLabel;
  kunciMcma?: OptionLabel[];
  kunciKategori?: Record<StatementId, boolean>;
  pembahasan: string;
  approved: boolean;
}

/**
 * Soal publik yang dikirim ke browser murid sebelum selesai.
 * TIDAK PERNAH memuat kunci jawaban maupun pembahasan.
 */
export interface PublicStudentQuestion {
  id: string;
  nomorUrut: number;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  tpCode: string;
  tpGrade: KelasFaseC;
  stimulus: string;
  pertanyaan: string;
  opsi?: QuestionOption[];
  pernyataan?: CategoryStatement[];
}

export interface TeacherAssessmentRecord {
  id: string;
  code: string | null;
  status: 'draft_review' | 'published';
  createdAt: string;
  publishedAt: string | null;
  providerName: string;
  draft: AssessmentDraft;
  questions: TeacherQuestion[];
}

export interface StudentAnswerPayload {
  pg?: OptionLabel | null;
  mcma?: OptionLabel[];
  kategori?: Partial<Record<StatementId, boolean>>;
}

export type StudentAnswersMap = Record<string, StudentAnswerPayload>;

export interface ActiveStudentSession {
  sessionId: string;
  sessionToken: string;
  assessmentId: string;
  assessmentCode: string;
  judul: string;
  mataPelajaranNama: string;
  jenjang: JenjangPendidikan;
  fase: FaseKurikulum;
  kelasPeserta: KelasFaseC;
  durasiMenit: number;
  acakSoal: boolean;
  studentName: string;
  studentClass: KelasFaseC;
  studentAbsen: string;
  startedAt: string;
  expiresAt: string;
  questions: PublicStudentQuestion[];
  savedAnswers: StudentAnswersMap;
  lastSavedAt: string | null;
}

export interface GradedStatementDetail {
  id: StatementId;
  teks: string;
  jawabanMurid: boolean | null;
  kunciJawaban: boolean;
  benar: boolean;
}

export interface GradedQuestionResult {
  questionId: string;
  nomorUrut: number;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  tpCode: string;
  tpGrade: KelasFaseC;
  indikatorSoal: string;
  stimulus: string;
  pertanyaan: string;
  opsi?: QuestionOption[];
  pernyataan?: GradedStatementDetail[];
  jawabanMurid: StudentAnswerPayload;
  kunciPg?: OptionLabel;
  kunciMcma?: OptionLabel[];
  kunciKategori?: Record<StatementId, boolean>;
  pembahasan: string;
  skorDiperoleh: number;
  skorMaksimal: number;
  statusJawaban: 'benar' | 'sebagian' | 'salah' | 'kosong';
  keteranganPenilaian: string;
}

export interface TypeScoreSummary {
  type: QuestionType;
  jumlahSoal: number;
  skorDiperoleh: number;
  skorMaksimal: number;
  persentase: number;
}

export interface TpScoreSummary {
  tpCode: string;
  tpGrade: KelasFaseC;
  jumlahSoal: number;
  skorDiperoleh: number;
  skorMaksimal: number;
  persentase: number;
}

export interface AssessmentSubmissionResult {
  sessionId: string;
  assessmentCode: string;
  judul: string;
  mataPelajaranNama: string;
  studentName: string;
  studentClass: KelasFaseC;
  studentAbsen: string;
  submittedAt: string;
  autoSubmittedByTimeout: boolean;
  totalSkorDiperoleh: number;
  totalSkorMaksimal: number;
  nilaiAkhir: number;
  ringkasanTipe: TypeScoreSummary[];
  ringkasanTp: TpScoreSummary[];
  rincianSoal: GradedQuestionResult[];
}

export interface TeacherSessionSummary {
  sessionId: string;
  studentName: string;
  studentClass: KelasFaseC;
  studentAbsen: string;
  status: 'in_progress' | 'submitted';
  startedAt: string;
  submittedAt: string | null;
  nilaiAkhir: number | null;
  totalSkorDiperoleh: number | null;
  totalSkorMaksimal: number | null;
  duplicateWarning: boolean;
}

export interface GuideStep {
  judul: string;
  uraian: string;
}

export interface GuideSection {
  id: string;
  urutan: string;
  judul: string;
  ringkasan: string;
  langkah: GuideStep[];
  catatanPenting?: string;
}

export interface AiProviderOption {
  id: string;
  nama: string;
  penyedia: string;
  modelRencana: string;
  deskripsi: string;
}
