import crypto from 'crypto';
import type {
  ActiveStudentSession,
  AssessmentDraft,
  AssessmentSubmissionResult,
  GradedQuestionResult,
  GradedStatementDetail,
  KelasFaseC,
  OptionLabel,
  PublicStudentQuestion,
  QuestionType,
  StatementId,
  StudentAnswerPayload,
  StudentAnswersMap,
  TeacherAssessmentRecord,
  TeacherQuestion,
  TeacherSessionSummary,
  TpScoreSummary,
  TypeScoreSummary,
} from '../src/types/assessment';

interface StoredAssessment extends TeacherAssessmentRecord {
  teacherToken: string;
}

interface StoredStudentSession {
  sessionId: string;
  sessionToken: string;
  assessmentId: string;
  assessmentCode: string;
  studentName: string;
  studentClass: KelasFaseC;
  studentAbsen: string;
  questionOrder: string[];
  answers: StudentAnswersMap;
  startedAt: string;
  expiresAt: string;
  lastSavedAt: string | null;
  status: 'in_progress' | 'submitted';
  submittedAt: string | null;
  result: AssessmentSubmissionResult | null;
}

const VALID_OPTION_LABELS: OptionLabel[] = ['A', 'B', 'C', 'D'];
const VALID_STATEMENT_IDS: StatementId[] = ['P1', 'P2', 'P3'];

const assessmentsById = new Map<string, StoredAssessment>();
const assessmentIdByCode = new Map<string, string>();
const studentSessionsById = new Map<string, StoredStudentSession>();

function safeTokenEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateAssessmentCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = 'AC-';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    if (!assessmentIdByCode.has(code)) {
      return code;
    }
  }
  return `AC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function cryptoShuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Serializer publik yang secara eksplisit HANYA menyalin kolom soal untuk murid.
 * Kunci jawaban (kunciPg, kunciMcma, kunciKategori) dan pembahasan TIDAK PERNAH disertakan.
 */
export function toPublicStudentQuestion(
  question: TeacherQuestion,
  nomorUrut: number
): PublicStudentQuestion {
  const base: PublicStudentQuestion = {
    id: question.id,
    nomorUrut,
    type: question.type,
    cognitiveLevel: question.cognitiveLevel,
    tpCode: question.tpCode,
    tpGrade: question.tpGrade,
    stimulus: question.stimulus,
    pertanyaan: question.pertanyaan,
  };

  if (question.type === 'PG' || question.type === 'MCMA') {
    base.opsi = (question.opsi ?? []).map((o) => ({
      label: o.label,
      teks: o.teks,
    }));
  } else if (question.type === 'KATEGORI') {
    base.pernyataan = (question.pernyataan ?? []).map((p) => ({
      id: p.id,
      teks: p.teks,
    }));
  }

  return base;
}

export function sanitizeTeacherAssessment(
  record: StoredAssessment
): TeacherAssessmentRecord {
  return {
    id: record.id,
    code: record.code,
    status: record.status,
    createdAt: record.createdAt,
    publishedAt: record.publishedAt,
    providerName: record.providerName,
    draft: record.draft,
    questions: record.questions,
  };
}

export function createTeacherAssessment(
  draft: AssessmentDraft,
  questions: TeacherQuestion[],
  providerName: string
): { assessment: TeacherAssessmentRecord; teacherToken: string } {
  const id = `asm_${crypto.randomBytes(8).toString('hex')}`;
  const teacherToken = generateSecureToken();
  const stored: StoredAssessment = {
    id,
    code: null,
    status: 'draft_review',
    createdAt: new Date().toISOString(),
    publishedAt: null,
    providerName,
    draft,
    questions,
    teacherToken,
  };
  assessmentsById.set(id, stored);
  return {
    assessment: sanitizeTeacherAssessment(stored),
    teacherToken,
  };
}

export function getAuthorizedTeacherAssessment(
  assessmentId: string,
  token: string
): StoredAssessment | null {
  const found = assessmentsById.get(assessmentId);
  if (!found || !token) return null;
  if (!safeTokenEqual(token, found.teacherToken)) return null;
  return found;
}

export function updateTeacherQuestion(
  assessmentId: string,
  token: string,
  questionId: string,
  patch: Partial<TeacherQuestion>
): TeacherAssessmentRecord | null {
  const assessment = getAuthorizedTeacherAssessment(assessmentId, token);
  if (!assessment) return null;

  const idx = assessment.questions.findIndex((q) => q.id === questionId);
  if (idx === -1) return null;

  const current = assessment.questions[idx];
  const updated: TeacherQuestion = {
    ...current,
    indikatorSoal:
      typeof patch.indikatorSoal === 'string'
        ? patch.indikatorSoal.trim().slice(0, 600)
        : current.indikatorSoal,
    stimulus:
      typeof patch.stimulus === 'string'
        ? patch.stimulus.trim().slice(0, 2000)
        : current.stimulus,
    pertanyaan:
      typeof patch.pertanyaan === 'string' && patch.pertanyaan.trim()
        ? patch.pertanyaan.trim().slice(0, 1200)
        : current.pertanyaan,
    pembahasan:
      typeof patch.pembahasan === 'string'
        ? patch.pembahasan.trim().slice(0, 1500)
        : current.pembahasan,
    approved:
      typeof patch.approved === 'boolean' ? patch.approved : current.approved,
  };

  if (current.type === 'PG' || current.type === 'MCMA') {
    if (Array.isArray(patch.opsi) && patch.opsi.length === 4) {
      updated.opsi = VALID_OPTION_LABELS.map((label, i) => ({
        label,
        teks: String(patch.opsi?.[i]?.teks ?? current.opsi?.[i]?.teks ?? '')
          .trim()
          .slice(0, 500),
      }));
    }
  }

  if (current.type === 'PG' && patch.kunciPg) {
    if (VALID_OPTION_LABELS.includes(patch.kunciPg)) {
      updated.kunciPg = patch.kunciPg;
    }
  }

  if (current.type === 'MCMA' && Array.isArray(patch.kunciMcma)) {
    const cleaned = Array.from(
      new Set(
        patch.kunciMcma.filter((lbl): lbl is OptionLabel =>
          VALID_OPTION_LABELS.includes(lbl)
        )
      )
    ).sort();
    if (cleaned.length >= 1) {
      updated.kunciMcma = cleaned;
    }
  }

  if (current.type === 'KATEGORI') {
    if (Array.isArray(patch.pernyataan) && patch.pernyataan.length === 3) {
      updated.pernyataan = VALID_STATEMENT_IDS.map((id, i) => ({
        id,
        teks: String(
          patch.pernyataan?.[i]?.teks ?? current.pernyataan?.[i]?.teks ?? ''
        )
          .trim()
          .slice(0, 500),
      }));
    }
    if (patch.kunciKategori && typeof patch.kunciKategori === 'object') {
      const nextKey: Record<StatementId, boolean> = {
        P1: Boolean(patch.kunciKategori.P1),
        P2: Boolean(patch.kunciKategori.P2),
        P3: Boolean(patch.kunciKategori.P3),
      };
      updated.kunciKategori = nextKey;
    }
  }

  assessment.questions[idx] = updated;
  return sanitizeTeacherAssessment(assessment);
}

export function updateTeacherAssessmentSettings(
  assessmentId: string,
  token: string,
  patch: { durasiMenit?: number; acakSoal?: boolean; approveAll?: boolean }
): TeacherAssessmentRecord | null {
  const assessment = getAuthorizedTeacherAssessment(assessmentId, token);
  if (!assessment) return null;

  if (typeof patch.durasiMenit === 'number' && !Number.isNaN(patch.durasiMenit)) {
    assessment.draft.durasiMenit = Math.max(
      10,
      Math.min(180, Math.round(patch.durasiMenit))
    );
  }
  if (typeof patch.acakSoal === 'boolean') {
    assessment.draft.acakSoal = patch.acakSoal;
  }
  if (patch.approveAll === true) {
    assessment.questions = assessment.questions.map((q) => ({
      ...q,
      approved: true,
    }));
  }

  return sanitizeTeacherAssessment(assessment);
}

export function publishTeacherAssessment(
  assessmentId: string,
  token: string
): { assessment?: TeacherAssessmentRecord; error?: string } {
  const assessment = getAuthorizedTeacherAssessment(assessmentId, token);
  if (!assessment) {
    return { error: 'Akses ditolak atau asesmen tidak ditemukan.' };
  }

  const unapprovedCount = assessment.questions.filter((q) => !q.approved).length;
  if (unapprovedCount > 0) {
    return {
      error: `Masih ada ${unapprovedCount} butir soal yang belum disetujui guru. Periksa dan setujui seluruh soal sebelum menerbitkan.`,
    };
  }

  if (!assessment.code) {
    const code = generateAssessmentCode();
    assessment.code = code;
    assessmentIdByCode.set(code, assessment.id);
  }

  assessment.status = 'published';
  assessment.publishedAt = new Date().toISOString();

  return { assessment: sanitizeTeacherAssessment(assessment) };
}

export function getTeacherAssessmentResults(
  assessmentId: string,
  token: string
): TeacherSessionSummary[] | null {
  const assessment = getAuthorizedTeacherAssessment(assessmentId, token);
  if (!assessment) return null;

  const matching = Array.from(studentSessionsById.values()).filter(
    (s) => s.assessmentId === assessment.id
  );

  const identityCounts = new Map<string, number>();
  for (const s of matching) {
    const key = `${s.studentName.trim().toLowerCase()}::${s.studentClass}`;
    identityCounts.set(key, (identityCounts.get(key) ?? 0) + 1);
  }

  return matching
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => {
      const key = `${s.studentName.trim().toLowerCase()}::${s.studentClass}`;
      return {
        sessionId: s.sessionId,
        studentName: s.studentName,
        studentClass: s.studentClass,
        studentAbsen: s.studentAbsen,
        status: s.status,
        startedAt: s.startedAt,
        submittedAt: s.submittedAt,
        nilaiAkhir: s.result ? s.result.nilaiAkhir : null,
        totalSkorDiperoleh: s.result ? s.result.totalSkorDiperoleh : null,
        totalSkorMaksimal: s.result ? s.result.totalSkorMaksimal : null,
        duplicateWarning: (identityCounts.get(key) ?? 0) > 1,
      };
    });
}

export function sanitizeAnswerPayload(
  raw: unknown,
  questionType: QuestionType
): StudentAnswerPayload {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;

  if (questionType === 'PG') {
    const pg =
      typeof obj.pg === 'string' &&
      VALID_OPTION_LABELS.includes(obj.pg as OptionLabel)
        ? (obj.pg as OptionLabel)
        : null;
    return { pg };
  }

  if (questionType === 'MCMA') {
    const rawArr = Array.isArray(obj.mcma) ? obj.mcma : [];
    const cleaned = Array.from(
      new Set(
        rawArr.filter(
          (v): v is OptionLabel =>
            typeof v === 'string' &&
            VALID_OPTION_LABELS.includes(v as OptionLabel)
        )
      )
    ).sort();
    return { mcma: cleaned };
  }

  // KATEGORI
  const rawKat =
    obj.kategori && typeof obj.kategori === 'object'
      ? (obj.kategori as Record<string, unknown>)
      : {};
  const cleanedKat: Partial<Record<StatementId, boolean>> = {};
  for (const sid of VALID_STATEMENT_IDS) {
    if (typeof rawKat[sid] === 'boolean') {
      cleanedKat[sid] = rawKat[sid] as boolean;
    }
  }
  return { kategori: cleanedKat };
}

export function startStudentSession(params: {
  assessmentCode: string;
  studentName: string;
  studentClass: KelasFaseC;
  studentAbsen: string;
}): { session?: ActiveStudentSession; error?: string } {
  const normalizedCode = params.assessmentCode.trim().toUpperCase();
  const assessmentId = assessmentIdByCode.get(normalizedCode);
  if (!assessmentId) {
    return {
      error: `Kode asesmen "${normalizedCode}" tidak ditemukan. Periksa kembali kode yang dibagikan guru.`,
    };
  }

  const assessment = assessmentsById.get(assessmentId);
  if (!assessment || assessment.status !== 'published') {
    return {
      error: 'Asesmen belum diterbitkan oleh guru sehingga belum dapat dikerjakan.',
    };
  }

  const orderedQuestions = assessment.draft.acakSoal
    ? cryptoShuffle(assessment.questions)
    : [...assessment.questions];

  const sessionId = `ses_${crypto.randomBytes(8).toString('hex')}`;
  const sessionToken = generateSecureToken();
  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const expiresAt = new Date(
    now + assessment.draft.durasiMenit * 60 * 1000
  ).toISOString();

  const storedSession: StoredStudentSession = {
    sessionId,
    sessionToken,
    assessmentId: assessment.id,
    assessmentCode: normalizedCode,
    studentName: params.studentName.trim().slice(0, 100),
    studentClass: params.studentClass,
    studentAbsen: params.studentAbsen.trim().slice(0, 20),
    questionOrder: orderedQuestions.map((q) => q.id),
    answers: {},
    startedAt,
    expiresAt,
    lastSavedAt: null,
    status: 'in_progress',
    submittedAt: null,
    result: null,
  };

  studentSessionsById.set(sessionId, storedSession);

  return {
    session: buildActiveStudentSessionView(storedSession, assessment),
  };
}

function buildActiveStudentSessionView(
  session: StoredStudentSession,
  assessment: StoredAssessment
): ActiveStudentSession {
  const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));
  const publicQuestions: PublicStudentQuestion[] = [];
  session.questionOrder.forEach((qid, idx) => {
    const q = questionMap.get(qid);
    if (q) {
      publicQuestions.push(toPublicStudentQuestion(q, idx + 1));
    }
  });

  return {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    assessmentId: assessment.id,
    assessmentCode: session.assessmentCode,
    judul: assessment.draft.judul,
    mataPelajaranNama: assessment.draft.mataPelajaranNama,
    jenjang: assessment.draft.jenjang,
    fase: assessment.draft.fase,
    kelasPeserta: assessment.draft.kelas ?? session.studentClass,
    durasiMenit: assessment.draft.durasiMenit,
    acakSoal: assessment.draft.acakSoal,
    studentName: session.studentName,
    studentClass: session.studentClass,
    studentAbsen: session.studentAbsen,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    questions: publicQuestions,
    savedAnswers: session.answers,
    lastSavedAt: session.lastSavedAt,
  };
}

export function getAuthorizedStudentSession(
  sessionId: string,
  token: string
): { session: StoredStudentSession; assessment: StoredAssessment } | null {
  const session = studentSessionsById.get(sessionId);
  if (!session || !token) return null;
  if (!safeTokenEqual(token, session.sessionToken)) return null;
  const assessment = assessmentsById.get(session.assessmentId);
  if (!assessment) return null;
  return { session, assessment };
}

export function getPublicStudentSessionState(
  sessionId: string,
  token: string
): {
  status: 'in_progress' | 'submitted';
  session?: ActiveStudentSession;
  result?: AssessmentSubmissionResult;
} | null {
  const found = getAuthorizedStudentSession(sessionId, token);
  if (!found) return null;

  if (found.session.status === 'submitted' && found.session.result) {
    return {
      status: 'submitted',
      result: found.session.result,
    };
  }

  return {
    status: 'in_progress',
    session: buildActiveStudentSessionView(found.session, found.assessment),
  };
}

export function autosaveStudentAnswers(
  sessionId: string,
  token: string,
  incomingAnswers: Record<string, unknown>
): { savedAt?: string; error?: string } {
  const found = getAuthorizedStudentSession(sessionId, token);
  if (!found) {
    return { error: 'Sesi pengerjaan tidak valid atau telah berakhir.' };
  }

  if (found.session.status === 'submitted') {
    return { error: 'Asesmen ini sudah dikumpulkan.' };
  }

  const questionMap = new Map(found.assessment.questions.map((q) => [q.id, q]));

  for (const [qid, rawPayload] of Object.entries(incomingAnswers)) {
    const q = questionMap.get(qid);
    if (!q) continue;
    found.session.answers[qid] = sanitizeAnswerPayload(rawPayload, q.type);
  }

  const savedAt = new Date().toISOString();
  found.session.lastSavedAt = savedAt;
  return { savedAt };
}

/**
 * Penilaian otomatis transparan di server (kunci jawaban hanya dibuka setelah submitted):
 * - PG: 1 poin jika pilihan tepat sama dengan 1 kunci jawaban; 0 jika salah/kosong.
 * - MCMA: Default skor penuh (1 poin) jika memilih SEMUA pilihan benar TANPA pilihan salah;
 *   0 jika kurang/ada pilihan salah/kosong. Tanpa pengurangan nilai tersembunyi.
 * - KATEGORI: Dinilai berdasarkan ketepatan tiap pernyataan (masing-masing 1/3 poin dari 3 pernyataan).
 */
export function gradeAndSubmitStudentSession(
  sessionId: string,
  token: string,
  finalAnswers?: Record<string, unknown>,
  autoSubmittedByTimeout = false
): { result?: AssessmentSubmissionResult; error?: string } {
  const found = getAuthorizedStudentSession(sessionId, token);
  if (!found) {
    return { error: 'Sesi pengerjaan tidak valid.' };
  }

  if (found.session.status === 'submitted' && found.session.result) {
    return { result: found.session.result };
  }

  const questionMap = new Map(found.assessment.questions.map((q) => [q.id, q]));

  if (finalAnswers && typeof finalAnswers === 'object') {
    for (const [qid, rawPayload] of Object.entries(finalAnswers)) {
      const q = questionMap.get(qid);
      if (!q) continue;
      found.session.answers[qid] = sanitizeAnswerPayload(rawPayload, q.type);
    }
  }

  const rincianSoal: GradedQuestionResult[] = [];
  const typeTotals: Record<
    QuestionType,
    { jumlahSoal: number; skorDiperoleh: number; skorMaksimal: number }
  > = {
    PG: { jumlahSoal: 0, skorDiperoleh: 0, skorMaksimal: 0 },
    MCMA: { jumlahSoal: 0, skorDiperoleh: 0, skorMaksimal: 0 },
    KATEGORI: { jumlahSoal: 0, skorDiperoleh: 0, skorMaksimal: 0 },
  };
  const tpTotals = new Map<
    string,
    {
      tpCode: string;
      tpGrade: KelasFaseC;
      jumlahSoal: number;
      skorDiperoleh: number;
      skorMaksimal: number;
    }
  >();

  let totalSkorDiperoleh = 0;
  let totalSkorMaksimal = 0;

  found.session.questionOrder.forEach((qid, idx) => {
    const q = questionMap.get(qid);
    if (!q) return;

    const ans = found.session.answers[qid] ?? {};
    const skorMaksimal = 1;
    let skorDiperoleh = 0;
    let statusJawaban: GradedQuestionResult['statusJawaban'] = 'kosong';
    let keteranganPenilaian = '';
    let gradedStatements: GradedStatementDetail[] | undefined;

    if (q.type === 'PG') {
      const chosen = ans.pg ?? null;
      if (!chosen) {
        skorDiperoleh = 0;
        statusJawaban = 'kosong';
        keteranganPenilaian = `Belum dijawab. Kunci jawaban: ${q.kunciPg}.`;
      } else if (chosen === q.kunciPg) {
        skorDiperoleh = 1;
        statusJawaban = 'benar';
        keteranganPenilaian = `Tepat (${chosen}). Skor penuh 1/1 poin.`;
      } else {
        skorDiperoleh = 0;
        statusJawaban = 'salah';
        keteranganPenilaian = `Jawaban murid (${chosen}) belum sesuai kunci (${q.kunciPg}). Skor 0/1 poin.`;
      }
    } else if (q.type === 'MCMA') {
      const chosen = Array.from(new Set(ans.mcma ?? [])).sort();
      const expected = Array.from(new Set(q.kunciMcma ?? [])).sort();
      const exactMatch =
        chosen.length === expected.length &&
        chosen.every((val, i) => val === expected[i]);

      if (chosen.length === 0) {
        skorDiperoleh = 0;
        statusJawaban = 'kosong';
        keteranganPenilaian = `Belum memilih jawaban. Seluruh pilihan benar: ${expected.join(', ')}.`;
      } else if (exactMatch) {
        skorDiperoleh = 1;
        statusJawaban = 'benar';
        keteranganPenilaian = `Skor penuh (1/1 poin): seluruh pilihan benar (${expected.join(', ')}) dipilih tanpa pilihan salah.`;
      } else {
        skorDiperoleh = 0;
        statusJawaban = 'salah';
        keteranganPenilaian = `Skor 0/1 poin (tanpa pengurangan nilai tersembunyi): pilihan murid (${chosen.join(', ')}) belum sama persis dengan seluruh kunci (${expected.join(', ')}).`;
      }
    } else if (q.type === 'KATEGORI') {
      const chosenMap = ans.kategori ?? {};
      const expectedMap = q.kunciKategori ?? { P1: true, P2: false, P3: true };
      let benarCount = 0;
      let answeredCount = 0;

      gradedStatements = VALID_STATEMENT_IDS.map((sid) => {
        const stmtText =
          q.pernyataan?.find((p) => p.id === sid)?.teks ?? `Pernyataan ${sid}`;
        const studentVal =
          typeof chosenMap[sid] === 'boolean' ? chosenMap[sid]! : null;
        const expectedVal = Boolean(expectedMap[sid]);
        if (studentVal !== null) answeredCount += 1;
        const isCorrect = studentVal !== null && studentVal === expectedVal;
        if (isCorrect) benarCount += 1;
        return {
          id: sid,
          teks: stmtText,
          jawabanMurid: studentVal,
          kunciJawaban: expectedVal,
          benar: isCorrect,
        };
      });

      skorDiperoleh = Number((benarCount / 3).toFixed(4));
      if (answeredCount === 0) {
        statusJawaban = 'kosong';
        keteranganPenilaian = 'Belum menjawab pernyataan Benar/Salah (0/3 pernyataan tepat).';
      } else if (benarCount === 3) {
        statusJawaban = 'benar';
        keteranganPenilaian = 'Skor penuh (3/3 pernyataan tepat = 1,00 poin).';
      } else if (benarCount > 0) {
        statusJawaban = 'sebagian';
        keteranganPenilaian = `${benarCount} dari 3 pernyataan dijawab tepat (${benarCount}/3 = ${skorDiperoleh.toFixed(2)} poin).`;
      } else {
        statusJawaban = 'salah';
        keteranganPenilaian = '0 dari 3 pernyataan dijawab tepat (0,00 poin).';
      }
    }

    totalSkorDiperoleh += skorDiperoleh;
    totalSkorMaksimal += skorMaksimal;

    typeTotals[q.type].jumlahSoal += 1;
    typeTotals[q.type].skorDiperoleh += skorDiperoleh;
    typeTotals[q.type].skorMaksimal += skorMaksimal;

    const tpKey = `${q.tpCode}::${q.tpGrade}`;
    const existingTp = tpTotals.get(tpKey) ?? {
      tpCode: q.tpCode,
      tpGrade: q.tpGrade,
      jumlahSoal: 0,
      skorDiperoleh: 0,
      skorMaksimal: 0,
    };
    existingTp.jumlahSoal += 1;
    existingTp.skorDiperoleh += skorDiperoleh;
    existingTp.skorMaksimal += skorMaksimal;
    tpTotals.set(tpKey, existingTp);

    rincianSoal.push({
      questionId: q.id,
      nomorUrut: idx + 1,
      type: q.type,
      cognitiveLevel: q.cognitiveLevel,
      tpCode: q.tpCode,
      tpGrade: q.tpGrade,
      indikatorSoal: q.indikatorSoal,
      stimulus: q.stimulus,
      pertanyaan: q.pertanyaan,
      opsi: q.opsi,
      pernyataan: gradedStatements,
      jawabanMurid: ans,
      kunciPg: q.kunciPg,
      kunciMcma: q.kunciMcma,
      kunciKategori: q.kunciKategori,
      pembahasan: q.pembahasan,
      skorDiperoleh: Number(skorDiperoleh.toFixed(2)),
      skorMaksimal,
      statusJawaban,
      keteranganPenilaian,
    });
  });

  const ringkasanTipe: TypeScoreSummary[] = (
    ['PG', 'MCMA', 'KATEGORI'] as QuestionType[]
  )
    .filter((t) => typeTotals[t].jumlahSoal > 0)
    .map((t) => {
      const entry = typeTotals[t];
      return {
        type: t,
        jumlahSoal: entry.jumlahSoal,
        skorDiperoleh: Number(entry.skorDiperoleh.toFixed(2)),
        skorMaksimal: entry.skorMaksimal,
        persentase:
          entry.skorMaksimal > 0
            ? Number(((entry.skorDiperoleh / entry.skorMaksimal) * 100).toFixed(1))
            : 0,
      };
    });

  const ringkasanTp: TpScoreSummary[] = Array.from(tpTotals.values()).map(
    (entry) => ({
      tpCode: entry.tpCode,
      tpGrade: entry.tpGrade,
      jumlahSoal: entry.jumlahSoal,
      skorDiperoleh: Number(entry.skorDiperoleh.toFixed(2)),
      skorMaksimal: entry.skorMaksimal,
      persentase:
        entry.skorMaksimal > 0
          ? Number(((entry.skorDiperoleh / entry.skorMaksimal) * 100).toFixed(1))
          : 0,
    })
  );

  const submittedAt = new Date().toISOString();
  const nilaiAkhir =
    totalSkorMaksimal > 0
      ? Number(((totalSkorDiperoleh / totalSkorMaksimal) * 100).toFixed(1))
      : 0;

  const result: AssessmentSubmissionResult = {
    sessionId: found.session.sessionId,
    assessmentCode: found.session.assessmentCode,
    judul: found.assessment.draft.judul,
    mataPelajaranNama: found.assessment.draft.mataPelajaranNama,
    studentName: found.session.studentName,
    studentClass: found.session.studentClass,
    studentAbsen: found.session.studentAbsen,
    submittedAt,
    autoSubmittedByTimeout,
    totalSkorDiperoleh: Number(totalSkorDiperoleh.toFixed(2)),
    totalSkorMaksimal,
    nilaiAkhir,
    ringkasanTipe,
    ringkasanTp,
    rincianSoal,
  };

  found.session.status = 'submitted';
  found.session.submittedAt = submittedAt;
  found.session.result = result;

  return { result };
}

/**
 * Inisialisasi paket simulasi bawaan di server (`SIMULASI-C`) agar guru/murid
 * dapat mencoba pengalaman pengerjaan PG, MCMA, Kategori, timer, pengacakan,
 * autosave, serta penilaian otomatis sisi server secara langsung.
 * Kunci jawaban tetap disimpan hanya di server.
 */
function seedSimulationAssessment(): void {
  const simCode = 'SIMULASI-C';
  if (assessmentIdByCode.has(simCode)) return;

  const simId = 'asm_simulasi_fase_c';
  const simQuestions: TeacherQuestion[] = [
    {
      id: 'sim-q-1',
      nomor: 1,
      type: 'PG',
      cognitiveLevel: 'C2',
      tpCode: 'IPAS.C.5.2',
      tpGrade: 5,
      tpElement: 'Pemahaman IPAS (Sains)',
      tpText:
        'Peserta didik mampu menjelaskan hubungan antarmakhluk hidup dalam rantai makanan dan jaring-jaring makanan.',
      indikatorSoal:
        'Disajikan ilustrasi rantai makanan sawah, murid dapat menentukan peran organisme sebagai konsumen tingkat II.',
      stimulus:
        'Di sebuah sawah terdapat tanaman padi, belalang, katak, ular, dan burung elang yang saling terhubung dalam satu rantai makanan.',
      pertanyaan:
        'Berdasarkan rantai makanan tersebut, makhluk hidup manakah yang berperan sebagai konsumen tingkat II?',
      opsi: [
        { label: 'A', teks: 'Tanaman padi' },
        { label: 'B', teks: 'Belalang' },
        { label: 'C', teks: 'Katak' },
        { label: 'D', teks: 'Ular' },
      ],
      kunciPg: 'C',
      pembahasan:
        'Tanaman padi adalah produsen, belalang adalah konsumen tingkat I (pemakan tumbuhan), dan katak adalah konsumen tingkat II yang memakan belalang.',
      approved: true,
    },
    {
      id: 'sim-q-2',
      nomor: 2,
      type: 'PG',
      cognitiveLevel: 'C3',
      tpCode: 'MTK.C.6.2',
      tpGrade: 6,
      tpElement: 'Geometri',
      tpText:
        'Peserta didik mampu menghitung volume bangun ruang kubus dan balok dalam masalah kontekstual.',
      indikatorSoal:
        'Murid dapat menghitung volume bak penampungan air berbentuk balok dari ukuran panjang, lebar, dan tinggi yang diberikan.',
      stimulus:
        'Sekolah membuat bak penampungan air hujan berbentuk balok di dekat kebun kelas. Panjang bak tersebut 10 dm, lebarnya 5 dm, dan tingginya 6 dm.',
      pertanyaan:
        'Berapa liter air maksimal yang dapat ditampung bak tersebut saat terisi penuh? (1 dm³ = 1 liter)',
      opsi: [
        { label: 'A', teks: '150 liter' },
        { label: 'B', teks: '210 liter' },
        { label: 'C', teks: '300 liter' },
        { label: 'D', teks: '360 liter' },
      ],
      kunciPg: 'C',
      pembahasan:
        'Volume balok = panjang × lebar × tinggi = 10 × 5 × 6 = 300 dm³ = 300 liter.',
      approved: true,
    },
    {
      id: 'sim-q-3',
      nomor: 3,
      type: 'MCMA',
      cognitiveLevel: 'C4',
      tpCode: 'IPAS.C.5.1',
      tpGrade: 5,
      tpElement: 'Pemahaman IPAS (Sains)',
      tpText:
        'Peserta didik mampu menganalisis sifat-sifat cahaya serta penerapannya dalam kehidupan sehari-hari.',
      indikatorSoal:
        'Disajikan empat peristiwa sehari-hari, murid dapat memilih semua peristiwa yang menunjukkan sifat cahaya dapat dibiaskan atau dipantulkan secara tepat.',
      stimulus:
        'Raka melakukan percobaan sederhana di kelas menggunakan senter, cermin datar, gelas berisi air bening, dan pensil.',
      pertanyaan:
        'Pilihlah SEMUA pernyataan yang tepat tentang sifat cahaya dalam kehidupan sehari-hari!',
      opsi: [
        {
          label: 'A',
          teks: 'Pensil yang dicelupkan ke gelas berisi air tampak patah karena cahaya mengalami pembiasan.',
        },
        {
          label: 'B',
          teks: 'Bayangan tubuh kita terbentuk karena cahaya dapat menembus benda gelap secara sempurna.',
        },
        {
          label: 'C',
          teks: 'Cermin datar pada kaca spion dapat memantulkan cahaya sehingga benda terlihat.',
        },
        {
          label: 'D',
          teks: 'Pelangi muncul setelah hujan karena cahaya matahari dapat diuraikan oleh titik air.',
        },
      ],
      kunciMcma: ['A', 'C', 'D'],
      pembahasan:
        'Pilihan A (pembiasan), C (pemantulan), dan D (penguraian) benar. Pilihan B salah karena bayangan justru terbentuk akibat cahaya tidak dapat menembus benda gelap.',
      approved: true,
    },
    {
      id: 'sim-q-4',
      nomor: 4,
      type: 'MCMA',
      cognitiveLevel: 'C4',
      tpCode: 'PP.C.5.1',
      tpGrade: 5,
      tpElement: 'Pancasila',
      tpText:
        'Peserta didik mampu mengidentifikasi contoh penerapan nilai-nilai Pancasila dalam kegiatan gotong royong di lingkungan sekolah.',
      indikatorSoal:
        'Murid dapat memilih semua perilaku di kelas yang mencerminkan semangat persatuan dan musyawarah.',
      stimulus:
        'Menjelang lomba kebersihan sekolah, murid kelas 5 dan kelas 6 berdiskusi membagi tugas membersihkan halaman serta menghias mading.',
      pertanyaan:
        'Manakah sikap berikut yang mencerminkan penerapan nilai gotong royong dan musyawarah di sekolah? (Pilih semua jawaban yang benar)',
      opsi: [
        {
          label: 'A',
          teks: 'Mendengarkan usulan teman dengan sopan meskipun berbeda pendapat.',
        },
        {
          label: 'B',
          teks: 'Menyerahkan seluruh pekerjaan kelas hanya kepada ketua kelas.',
        },
        {
          label: 'C',
          teks: 'Melaksanakan jadwal piket yang sudah disepakati bersama dengan tanggung jawab.',
        },
        {
          label: 'D',
          teks: 'Membantu teman yang kesulitan mengangkat pot tanaman di taman sekolah.',
        },
      ],
      kunciMcma: ['A', 'C', 'D'],
      pembahasan:
        'Sikap A, C, dan D mencerminkan musyawarah, tanggung jawab bersama, dan tolong-menolong. Sikap B bertentangan dengan nilai gotong royong.',
      approved: true,
    },
    {
      id: 'sim-q-5',
      nomor: 5,
      type: 'KATEGORI',
      cognitiveLevel: 'C5',
      tpCode: 'IPAS.C.6.2',
      tpGrade: 6,
      tpElement: 'Pemahaman IPAS (Sains)',
      tpText:
        'Peserta didik mampu membedakan peristiwa rotasi dan revolusi Bumi serta dampaknya.',
      indikatorSoal:
        'Disajikan stimulus mengenai pergerakan Bumi, murid dapat menilai ketepatan (Benar/Salah) tiga pernyataan tentang akibat rotasi dan revolusi Bumi.',
      stimulus:
        'Bumi melakukan dua gerak sekaligus, yaitu berputar pada porosnya (rotasi) selama sekitar 24 jam dan mengelilingi Matahari (revolusi) selama sekitar 365¼ hari.',
      pertanyaan:
        'Tentukan apakah setiap pernyataan berikut Benar atau Salah berdasarkan bacaan di atas!',
      pernyataan: [
        {
          id: 'P1',
          teks: 'Pergantian siang dan malam terjadi akibat peristiwa rotasi Bumi pada porosnya.',
        },
        {
          id: 'P2',
          teks: 'Perbedaan waktu antara wilayah WIB, WITA, dan WIT disebabkan oleh revolusi Bumi.',
        },
        {
          id: 'P3',
          teks: 'Satu kali revolusi Bumi mengelilingi Matahari menjadi dasar perhitungan tahun Masehi.',
        },
      ],
      kunciKategori: {
        P1: true,
        P2: false,
        P3: true,
      },
      pembahasan:
        'P1 Benar (siang-malam akibat rotasi). P2 Salah (perbedaan zona waktu WIB/WITA/WIT juga akibat rotasi Bumi, bukan revolusi). P3 Benar (revolusi Bumi 365¼ hari menjadi dasar kalender Masehi).',
      approved: true,
    },
    {
      id: 'sim-q-6',
      nomor: 6,
      type: 'KATEGORI',
      cognitiveLevel: 'C4',
      tpCode: 'BIN.C.6.1',
      tpGrade: 6,
      tpElement: 'Membaca dan Memirsa',
      tpText:
        'Peserta didik mampu membedakan pernyataan fakta dan opini serta mengevaluasi kesesuaian informasi teks.',
      indikatorSoal:
        'Disajikan kutipan teks informasional singkat tentang perpustakaan sekolah, murid dapat mengevaluasi kesesuaian tiga pernyataan sebagai Benar atau Salah.',
      stimulus:
        'Perpustakaan SD Nusantara dibuka setiap hari Senin sampai Jumat pukul 07.30 hingga 14.00. Saat ini terdapat 1.250 buku cerita anak dan buku pengetahuan. Menurut sebagian murid, sudut baca dekat jendela adalah tempat paling nyaman di sekolah.',
      pertanyaan:
        'Evaluasilah ketiga pernyataan berikut berdasarkan isi teks, lalu pilih Benar atau Salah untuk masing-masing pernyataan!',
      pernyataan: [
        {
          id: 'P1',
          teks: 'Kalimat yang menyebutkan jumlah 1.250 buku di perpustakaan merupakan pernyataan fakta.',
        },
        {
          id: 'P2',
          teks: 'Perpustakaan SD Nusantara tetap buka melayani peminjaman buku pada hari Sabtu pagi.',
        },
        {
          id: 'P3',
          teks: 'Anggapan bahwa sudut baca dekat jendela adalah tempat paling nyaman termasuk opini.',
        },
      ],
      kunciKategori: {
        P1: true,
        P2: false,
        P3: true,
      },
      pembahasan:
        'P1 Benar karena 1.250 buku dapat dibuktikan datanya. P2 Salah karena teks menyatakan buka Senin sampai Jumat. P3 Benar karena kata "paling nyaman" merupakan penilaian subjektif (opini).',
      approved: true,
    },
  ];

  const simRecord: StoredAssessment = {
    id: simId,
    code: simCode,
    status: 'published',
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    providerName: 'Paket Simulasi Bawaan Server',
    teacherToken: generateSecureToken(),
    draft: {
      judul: 'Simulasi Asesmen Sumatif Terpadu SD Fase C (PG, MCMA, Kategori)',
      jenjang: 'SD',
      fase: 'C',
      kelas: 5,
      mataPelajaranNama: 'Simulasi Lintas Mapel Fase C',
      selectedTps: [],
      jumlahSoal: simQuestions.length,
      distribusiTipeSoal: { PG: 2, MCMA: 2, KATEGORI: 2 },
      distribusiKognitif: { C1: 0, C2: 1, C3: 1, C4: 3, C5: 1, C6: 0 },
      durasiMenit: 20,
      acakSoal: true,
    },
    questions: simQuestions,
  };

  assessmentsById.set(simId, simRecord);
  assessmentIdByCode.set(simCode, simId);
}

seedSimulationAssessment();
