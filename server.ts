import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { generateQuestionsViaAi } from './server/aiQuestionGenerator';
import {
  autosaveStudentAnswers,
  createTeacherAssessment,
  getAuthorizedTeacherAssessment,
  getPublicStudentSessionState,
  getTeacherAssessmentResults,
  gradeAndSubmitStudentSession,
  publishTeacherAssessment,
  sanitizeTeacherAssessment,
  startStudentSession,
  updateTeacherAssessmentSettings,
  updateTeacherQuestion,
} from './server/assessmentStore';
import type {
  AssessmentDraft,
  KelasFaseC,
  TeacherQuestion,
} from './src/types/assessment';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function extractBearerToken(req: Request): string {
  const auth = req.header('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return '';
  return auth.slice(7).trim();
}

function validateAssessmentDraft(raw: unknown): AssessmentDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;

  const kelas = d.kelas === 5 || d.kelas === 6 ? (d.kelas as KelasFaseC) : null;
  if (!kelas) return null;

  const mataPelajaranNama =
    typeof d.mataPelajaranNama === 'string' ? d.mataPelajaranNama.trim() : '';
  if (!mataPelajaranNama) return null;

  const jumlahSoal = Number(d.jumlahSoal);
  if (!Number.isInteger(jumlahSoal) || jumlahSoal < 3 || jumlahSoal > 60) {
    return null;
  }

  const durasiMenit = Number(d.durasiMenit);
  if (!Number.isInteger(durasiMenit) || durasiMenit < 10 || durasiMenit > 180) {
    return null;
  }

  const tipe = d.distribusiTipeSoal as Record<string, unknown> | undefined;
  const kog = d.distribusiKognitif as Record<string, unknown> | undefined;
  if (!tipe || !kog) return null;

  const pg = Number(tipe.PG ?? 0);
  const mcma = Number(tipe.MCMA ?? 0);
  const kategori = Number(tipe.KATEGORI ?? 0);
  if (
    !Number.isInteger(pg) ||
    !Number.isInteger(mcma) ||
    !Number.isInteger(kategori) ||
    pg < 0 ||
    mcma < 0 ||
    kategori < 0 ||
    pg + mcma + kategori !== jumlahSoal
  ) {
    return null;
  }

  const c1 = Number(kog.C1 ?? 0);
  const c2 = Number(kog.C2 ?? 0);
  const c3 = Number(kog.C3 ?? 0);
  const c4 = Number(kog.C4 ?? 0);
  const c5 = Number(kog.C5 ?? 0);
  const c6 = Number(kog.C6 ?? 0);
  if (
    [c1, c2, c3, c4, c5, c6].some((n) => !Number.isInteger(n) || n < 0) ||
    c1 + c2 + c3 + c4 + c5 + c6 !== jumlahSoal
  ) {
    return null;
  }

  if (!Array.isArray(d.selectedTps) || d.selectedTps.length === 0) {
    return null;
  }

  return {
    judul:
      typeof d.judul === 'string' && d.judul.trim()
        ? d.judul.trim().slice(0, 180)
        : `Asesmen Sumatif ${mataPelajaranNama} Kelas ${kelas}`,
    jenjang: 'SD',
    fase: 'C',
    kelas,
    mataPelajaranNama: mataPelajaranNama.slice(0, 120),
    selectedTps: d.selectedTps as AssessmentDraft['selectedTps'],
    jumlahSoal,
    distribusiTipeSoal: { PG: pg, MCMA: mcma, KATEGORI: kategori },
    distribusiKognitif: { C1: c1, C2: c2, C3: c3, C4: c4, C5: c5, C6: c6 },
    durasiMenit,
    acakSoal: Boolean(d.acakSoal),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 1. Generasi soal berbantuan AI di sisi server (BYOK — kunci API hanya digunakan pada request ini, tidak disimpan)
  app.post('/api/assessments/generate', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        draft?: unknown;
        providerId?: unknown;
        apiKey?: unknown;
      };

      const validDraft = validateAssessmentDraft(body.draft);
      if (!validDraft) {
        res.status(400).json({
          error:
            'Rancangan asesmen tidak valid. Pastikan kelas, mata pelajaran, minimal 1 TP, total tipe soal, dan total C1–C6 sesuai jumlah soal.',
        });
        return;
      }

      // Hanya Google Gemini yang didukung; providerId dari klien diabaikan.
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

      if (!apiKey || apiKey.length < 8) {
        res.status(400).json({
          error:
            'API Key Gemini pribadi guru (BYOK) wajib diisi sebelum membuat soal.',
        });
        return;
      }

      const { questions, providerName } = await generateQuestionsViaAi({
        draft: validDraft,
        apiKey,
      });

      const created = createTeacherAssessment(
        validDraft,
        questions,
        providerName
      );

      res.status(201).json(created);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Terjadi kendala saat membuat soal dengan AI.';
      res.status(502).json({ error: message });
    }
  });

  // 2. Ambil asesmen lengkap untuk peninjauan guru (wajib Authorization: Bearer <teacherToken>)
  app.get('/api/assessments/:id', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const assessment = getAuthorizedTeacherAssessment(
      String(req.params.id),
      token
    );
    if (!assessment) {
      res.status(401).json({
        error: 'Akses peninjauan guru tidak valid atau asesmen tidak ditemukan.',
      });
      return;
    }
    res.json({ assessment: sanitizeTeacherAssessment(assessment) });
  });

  // 3. Guru menyunting atau menyetujui satu butir soal
  app.put(
    '/api/assessments/:id/questions/:questionId',
    (req: Request, res: Response) => {
      const token = extractBearerToken(req);
      const updated = updateTeacherQuestion(
        String(req.params.id),
        token,
        String(req.params.questionId),
        (req.body ?? {}) as Partial<TeacherQuestion>
      );
      if (!updated) {
        res.status(401).json({
          error: 'Gagal memperbarui soal. Periksa izin guru atau nomor soal.',
        });
        return;
      }
      res.json({ assessment: updated });
    }
  );

  // 4. Guru memperbarui durasi, pengacakan soal, atau menyetujui semua soal
  app.patch('/api/assessments/:id/settings', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const body = (req.body ?? {}) as {
      durasiMenit?: number;
      acakSoal?: boolean;
      approveAll?: boolean;
    };
    const updated = updateTeacherAssessmentSettings(
      String(req.params.id),
      token,
      body
    );
    if (!updated) {
      res.status(401).json({ error: 'Akses guru tidak valid.' });
      return;
    }
    res.json({ assessment: updated });
  });

  // 5. Guru menerbitkan asesmen (kunci jawaban tetap aman di server)
  app.post('/api/assessments/:id/publish', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const outcome = publishTeacherAssessment(String(req.params.id), token);
    if (outcome.error || !outcome.assessment) {
      res.status(400).json({ error: outcome.error });
      return;
    }
    res.json({ assessment: outcome.assessment });
  });

  // 6. Guru memantau rekap hasil peserta asesmen
  app.get('/api/assessments/:id/results', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const results = getTeacherAssessmentResults(String(req.params.id), token);
    if (!results) {
      res.status(401).json({ error: 'Akses rekap hasil guru tidak valid.' });
      return;
    }
    res.json({ results });
  });

  // 7. Murid memulai sesi pengerjaan — server mengirimkan soal TANPA kunci jawaban
  app.post('/api/student/sessions/start', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      assessmentCode?: unknown;
      studentName?: unknown;
      studentClass?: unknown;
      studentAbsen?: unknown;
    };

    const assessmentCode =
      typeof body.assessmentCode === 'string' ? body.assessmentCode.trim() : '';
    const studentName =
      typeof body.studentName === 'string' ? body.studentName.trim() : '';
    const studentClass =
      body.studentClass === 5 || body.studentClass === 6
        ? (body.studentClass as KelasFaseC)
        : null;
    const studentAbsen =
      typeof body.studentAbsen === 'string' ? body.studentAbsen.trim() : '';

    if (!assessmentCode || !studentName || !studentClass) {
      res.status(400).json({
        error:
          'Mohon isi Kode Asesmen, Nama Lengkap, dan Kelas (5 atau 6) terlebih dahulu.',
      });
      return;
    }

    const started = startStudentSession({
      assessmentCode,
      studentName,
      studentClass,
      studentAbsen,
    });

    if (started.error || !started.session) {
      res.status(404).json({ error: started.error });
      return;
    }

    res.status(201).json({ session: started.session });
  });

  // 8. Murid memulihkan sesi pengerjaan (autosave recovery; tanpa kunci jika belum selesai)
  app.get('/api/student/sessions/:sessionId', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const state = getPublicStudentSessionState(
      String(req.params.sessionId),
      token
    );
    if (!state) {
      res.status(401).json({ error: 'Sesi pengerjaan murid tidak ditemukan.' });
      return;
    }
    res.json(state);
  });

  // 9. Autosave jawaban murid secara berkala ke server
  app.put(
    '/api/student/sessions/:sessionId/autosave',
    (req: Request, res: Response) => {
      const token = extractBearerToken(req);
      const body = (req.body ?? {}) as { answers?: Record<string, unknown> };
      const saved = autosaveStudentAnswers(
        String(req.params.sessionId),
        token,
        body.answers ?? {}
      );
      if (saved.error) {
        res.status(400).json({ error: saved.error });
        return;
      }
      res.json({ savedAt: saved.savedAt });
    }
  );

  // 10. Pengumpulan akhir & penilaian otomatis transparan di server (kunci baru dikirim setelah selesai)
  app.post(
    '/api/student/sessions/:sessionId/submit',
    (req: Request, res: Response) => {
      const token = extractBearerToken(req);
      const body = (req.body ?? {}) as {
        answers?: Record<string, unknown>;
        autoSubmittedByTimeout?: boolean;
      };
      const graded = gradeAndSubmitStudentSession(
        String(req.params.sessionId),
        token,
        body.answers,
        Boolean(body.autoSubmittedByTimeout)
      );
      if (graded.error || !graded.result) {
        res.status(400).json({ error: graded.error });
        return;
      }
      res.json({ result: graded.result });
    }
  );

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build belum tersedia.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASESMEN CERDAS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
