import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  AssessmentDraft,
  CatalogLearningObjective,
  CognitiveLevel,
  OptionLabel,
  QuestionType,
  StatementId,
  TeacherQuestion,
} from '../src/types/assessment';

interface QuestionBlueprintSlot {
  nomor: number;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  tp: CatalogLearningObjective;
}

interface RawAiQuestion {
  nomor?: number;
  type?: string;
  cognitiveLevel?: string;
  tpCode?: string;
  indikatorSoal?: string;
  stimulus?: string;
  pertanyaan?: string;
  opsi?: Array<{ label?: string; teks?: string }>;
  pernyataan?: Array<{ id?: string; teks?: string }>;
  kunciPg?: string;
  kunciMcma?: string[];
  kunciKategori?: { P1?: boolean; P2?: boolean; P3?: boolean };
  pembahasan?: string;
}

const VALID_OPTIONS: OptionLabel[] = ['A', 'B', 'C', 'D'];
const VALID_STATEMENTS: StatementId[] = ['P1', 'P2', 'P3'];
const COGNITIVE_ORDER: CognitiveLevel[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const TYPE_ORDER: QuestionType[] = ['PG', 'MCMA', 'KATEGORI'];

function buildBlueprintSlots(draft: AssessmentDraft): QuestionBlueprintSlot[] {
  const typesPool: QuestionType[] = [];
  for (const t of TYPE_ORDER) {
    const count = Math.max(0, draft.distribusiTipeSoal[t] ?? 0);
    for (let i = 0; i < count; i += 1) {
      typesPool.push(t);
    }
  }

  const cogPool: CognitiveLevel[] = [];
  for (const c of COGNITIVE_ORDER) {
    const count = Math.max(0, draft.distribusiKognitif[c] ?? 0);
    for (let i = 0; i < count; i += 1) {
      cogPool.push(c);
    }
  }

  const total = draft.jumlahSoal;
  if (typesPool.length !== total) {
    throw new Error(
      `Total distribusi tipe soal (${typesPool.length}) tidak sama dengan jumlah soal (${total}).`
    );
  }
  if (cogPool.length !== total) {
    throw new Error(
      `Total distribusi level kognitif C1–C6 (${cogPool.length}) tidak sama dengan jumlah soal (${total}).`
    );
  }
  if (!draft.selectedTps.length) {
    throw new Error('Minimal satu Tujuan Pembelajaran (TP) harus dipilih.');
  }

  const slots: QuestionBlueprintSlot[] = [];
  for (let i = 0; i < total; i += 1) {
    slots.push({
      nomor: i + 1,
      type: typesPool[i],
      cognitiveLevel: cogPool[i],
      tp: draft.selectedTps[i % draft.selectedTps.length],
    });
  }
  return slots;
}

function buildPrompt(
  draft: AssessmentDraft,
  slots: QuestionBlueprintSlot[]
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `Anda adalah pakar penyusunan instrumen asesmen sumatif Sekolah Dasar (SD) Kurikulum Merdeka Fase C (Kelas 5 dan Kelas 6, usia 10–12 tahun) di Indonesia.

ATURAN PEDAGOGIS WAJIB:
1. Seluruh soal wajib berbahasa Indonesia yang baku, komunikatif, ramah anak SD usia 10–12 tahun, tidak membingungkan, dan bebas bias.
2. Konteks stimulus harus autentik sesuai karakteristik mata pelajaran "${draft.mataPelajaranNama}" dan pengalaman sehari-hari murid SD Fase C.
3. Setiap butir soal WAJIB terhubung langsung dengan Tujuan Pembelajaran (TP) yang ditentukan pada kisi-kisi, memiliki "indikatorSoal" yang spesifik dan terukur, serta tepat sesuai level kognitif (C1–C6).
4. Patuhi struktur ketat untuk 3 tipe soal:
   - PG (Pilihan Ganda Tunggal): WAJIB memiliki tepat 4 pilihan ("A", "B", "C", "D") dengan TEPAT SATU jawaban benar pada "kunciPg".
   - MCMA (Pilihan Ganda Kompleks MCMA): WAJIB memiliki tepat 4 pilihan ("A", "B", "C", "D") dengan 2 atau 3 jawaban benar pada "kunciMcma" (array label unik, misal ["A","C"] atau ["A","B","D"]). Sertakan arahan jelas bahwa murid memilih semua jawaban yang benar.
   - KATEGORI (Pilihan Ganda Kompleks Kategori): WAJIB memiliki stimulus kontekstual dan TEPAT TIGA pernyataan pada "pernyataan" dengan id "P1", "P2", "P3". Setiap pernyataan dinilai Benar (true) atau Salah (false) pada "kunciKategori": { "P1": boolean, "P2": boolean, "P3": boolean }. Hindari semua true atau semua false secara monoton.
5. Jangan pernah menghasilkan kurang atau lebih dari jumlah soal yang diminta. Keluarkan JSON murni yang valid tanpa teks pembuka atau penutup.`;

  const blueprintLines = slots
    .map(
      (s) =>
        `Soal #${s.nomor} | Tipe: ${s.type} | Level Kognitif: ${s.cognitiveLevel} | TP: ${s.tp.tp_code} (Asal Kelas ${s.tp.grade}, Elemen: ${s.tp.element}) | Materi: ${s.tp.material_scope} | Rumusan TP: ${s.tp.tp_text}`
    )
    .join('\n');

  const isPartial = slots.length < draft.jumlahSoal;
  const rangeLabel = isPartial
    ? `HANYA soal nomor ${slots[0].nomor} sampai ${slots[slots.length - 1].nomor} (bagian dari asesmen ${draft.jumlahSoal} soal)`
    : `${slots.length} butir soal`;

  const userPrompt = `Susun ${rangeLabel} asesmen sumatif. Jumlah soal yang harus dikeluarkan pada jawaban ini: TEPAT ${slots.length} butir. Detail asesmen:
- Judul Asesmen: ${draft.judul || `Asesmen Sumatif ${draft.mataPelajaranNama}`}
- Jenjang / Fase: SD Fase C
- Kelas Peserta Asesmen: Kelas ${draft.kelas}
- Mata Pelajaran: ${draft.mataPelajaranNama}
- Komposisi keseluruhan asesmen (sebagai konteks): PG = ${draft.distribusiTipeSoal.PG}, MCMA = ${draft.distribusiTipeSoal.MCMA}, KATEGORI = ${draft.distribusiTipeSoal.KATEGORI}; C1=${draft.distribusiKognitif.C1}, C2=${draft.distribusiKognitif.C2}, C3=${draft.distribusiKognitif.C3}, C4=${draft.distribusiKognitif.C4}, C5=${draft.distribusiKognitif.C5}, C6=${draft.distribusiKognitif.C6}

KISI-KISI WAJIB PER NOMOR SOAL (buat persis sesuai daftar ini):
${blueprintLines}

Format keluaran JSON:
{
  "questions": [
    {
      "nomor": 1,
      "type": "PG" | "MCMA" | "KATEGORI",
      "cognitiveLevel": "C1" | "C2" | "C3" | "C4" | "C5" | "C6",
      "tpCode": "string",
      "indikatorSoal": "string (rumusan indikator soal spesifik)",
      "stimulus": "string (cerita/data/ilustrasi konteks singkat sesuai mapel)",
      "pertanyaan": "string (pokok soal jelas untuk murid SD)",
      "opsi": [{"label":"A","teks":"..."},{"label":"B","teks":"..."},{"label":"C","teks":"..."},{"label":"D","teks":"..."}],
      "kunciPg": "A",
      "kunciMcma": ["A","C"],
      "pernyataan": [{"id":"P1","teks":"..."},{"id":"P2","teks":"..."},{"id":"P3","teks":"..."}],
      "kunciKategori": {"P1": true, "P2": false, "P3": true},
      "pembahasan": "string (penjelasan pedagogis singkat dan jelas)"
    }
  ]
}
Catatan: Untuk soal PG isi opsi + kunciPg. Untuk soal MCMA isi opsi + kunciMcma (minimal 2 label benar). Untuk soal KATEGORI isi pernyataan (3 item P1, P2, P3) + kunciKategori.`;

  return { systemInstruction, userPrompt };
}

function extractJsonObject(rawText: string): { questions?: RawAiQuestion[] } {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as { questions?: RawAiQuestion[] };
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as {
        questions?: RawAiQuestion[];
      };
    }
    throw new Error('Respons AI tidak berbentuk JSON yang valid.');
  }
}

function normalizeAndValidateQuestions(
  rawQuestions: RawAiQuestion[],
  slots: QuestionBlueprintSlot[]
): TeacherQuestion[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length < slots.length) {
    throw new Error(
      `AI menghasilkan ${Array.isArray(rawQuestions) ? rawQuestions.length : 0} soal, sedangkan rancangan meminta ${slots.length} soal. Silakan coba generate ulang.`
    );
  }

  return slots.map((slot, index) => {
    const raw =
      rawQuestions.find((q) => Number(q.nomor) === slot.nomor) ??
      rawQuestions[index];

    if (!raw || !raw.pertanyaan || !raw.pertanyaan.trim()) {
      throw new Error(
        `Butir soal nomor ${slot.nomor} dari AI tidak lengkap (teks pertanyaan kosong).`
      );
    }

    const base: TeacherQuestion = {
      id: `q_${slot.nomor}_${crypto.randomBytes(4).toString('hex')}`,
      nomor: slot.nomor,
      type: slot.type,
      cognitiveLevel: slot.cognitiveLevel,
      tpCode: slot.tp.tp_code,
      tpGrade: slot.tp.grade,
      tpElement: slot.tp.element,
      tpText: slot.tp.tp_text,
      indikatorSoal:
        raw.indikatorSoal?.trim() ||
        `Mengukur ketercapaian ${slot.tp.tp_code} pada level ${slot.cognitiveLevel}.`,
      stimulus: raw.stimulus?.trim() || '',
      pertanyaan: raw.pertanyaan.trim(),
      pembahasan:
        raw.pembahasan?.trim() ||
        'Periksa kembali kesesuaian jawaban dengan konsep pada Tujuan Pembelajaran.',
      approved: false,
    };

    if (slot.type === 'PG') {
      if (!Array.isArray(raw.opsi) || raw.opsi.length < 4) {
        throw new Error(
          `Soal PG nomor ${slot.nomor} dari AI harus memiliki 4 pilihan jawaban A–D.`
        );
      }
      base.opsi = VALID_OPTIONS.map((label, i) => {
        const match =
          raw.opsi?.find(
            (o) => String(o.label ?? '').trim().toUpperCase() === label
          ) ?? raw.opsi?.[i];
        const teks = String(match?.teks ?? '').trim();
        if (!teks) {
          throw new Error(
            `Opsi ${label} pada soal PG nomor ${slot.nomor} kosong.`
          );
        }
        return { label, teks };
      });
      const rawKey = String(raw.kunciPg ?? '')
        .trim()
        .toUpperCase() as OptionLabel;
      if (!VALID_OPTIONS.includes(rawKey)) {
        throw new Error(
          `Kunci jawaban PG nomor ${slot.nomor} tidak valid (harus A, B, C, atau D).`
        );
      }
      base.kunciPg = rawKey;
    } else if (slot.type === 'MCMA') {
      if (!Array.isArray(raw.opsi) || raw.opsi.length < 4) {
        throw new Error(
          `Soal MCMA nomor ${slot.nomor} dari AI harus memiliki 4 pilihan jawaban A–D.`
        );
      }
      base.opsi = VALID_OPTIONS.map((label, i) => {
        const match =
          raw.opsi?.find(
            (o) => String(o.label ?? '').trim().toUpperCase() === label
          ) ?? raw.opsi?.[i];
        const teks = String(match?.teks ?? '').trim();
        if (!teks) {
          throw new Error(
            `Opsi ${label} pada soal MCMA nomor ${slot.nomor} kosong.`
          );
        }
        return { label, teks };
      });
      const rawKeys = Array.isArray(raw.kunciMcma)
        ? Array.from(
            new Set(
              raw.kunciMcma
                .map((k) => String(k).trim().toUpperCase())
                .filter((k): k is OptionLabel =>
                  VALID_OPTIONS.includes(k as OptionLabel)
                )
            )
          ).sort()
        : [];
      if (rawKeys.length < 2) {
        throw new Error(
          `Soal MCMA nomor ${slot.nomor} harus memiliki minimal 2 kunci jawaban benar.`
        );
      }
      base.kunciMcma = rawKeys;
    } else {
      // KATEGORI
      if (!Array.isArray(raw.pernyataan) || raw.pernyataan.length < 3) {
        throw new Error(
          `Soal Kategori nomor ${slot.nomor} dari AI harus memiliki tepat 3 pernyataan.`
        );
      }
      base.pernyataan = VALID_STATEMENTS.map((sid, i) => {
        const match =
          raw.pernyataan?.find(
            (p) => String(p.id ?? '').trim().toUpperCase() === sid
          ) ?? raw.pernyataan?.[i];
        const teks = String(match?.teks ?? '').trim();
        if (!teks) {
          throw new Error(
            `Pernyataan ${sid} pada soal Kategori nomor ${slot.nomor} kosong.`
          );
        }
        return { id: sid, teks };
      });
      const kk = raw.kunciKategori;
      if (
        !kk ||
        typeof kk.P1 !== 'boolean' ||
        typeof kk.P2 !== 'boolean' ||
        typeof kk.P3 !== 'boolean'
      ) {
        throw new Error(
          `Kunci jawaban Benar/Salah pada soal Kategori nomor ${slot.nomor} belum lengkap untuk P1, P2, dan P3.`
        );
      }
      base.kunciKategori = {
        P1: kk.P1,
        P2: kk.P2,
        P3: kk.P3,
      };
    }

    return base;
  });
}

// ============================================================================
// PEMILIHAN MODEL GEMINI OTOMATIS
// ----------------------------------------------------------------------------
// Nama model Gemini sering berubah (gemini-2.5-flash, gemini-3.7-flash,
// gemini-4-..., dst). Karena itu aplikasi TIDAK menuliskan nama model secara
// tetap. Setiap kali soal dibuat, server:
//   1. Meminta daftar model yang tersedia untuk API Key guru langsung ke Google.
//   2. Menyaring model teks yang bisa membuat konten (bukan model gambar,
//      suara, video, embedding, dsb).
//   3. Mengurutkan: versi stabil dulu, keluarga "flash" (cepat & kuota gratis
//      besar) dulu, lalu versi terbaru dulu.
//   4. Mencoba model satu per satu. Bila satu model sibuk (503), kuotanya habis
//      (429), atau tidak tersedia (404), otomatis pindah ke model berikutnya.
// Daftar cadangan di bawah hanya dipakai bila Google gagal mengirim daftar model.
// ============================================================================

const GEMINI_STATIC_FALLBACKS = [
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
];

/** Model yang bukan untuk menulis teks/JSON biasa. */
const NON_TEXT_MODEL_PATTERN =
  /(tts|image|imagen|live|audio|speech|embed|transcribe|translate|omni|video|veo|robotics|computer-use|aqa|vision|banana|learnlm|gemma)/i;

/** Maksimal jumlah model yang dicoba dalam satu kali pembuatan soal. */
const MAX_MODELS_TO_TRY = 6;
const MODEL_LIST_CACHE_MS = 30 * 60 * 1000;

const modelListCache = new Map<string, { models: string[]; at: number }>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hashKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseGeminiVersion(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : 0;
}

/** Semakin besar semakin diutamakan. */
function geminiTierScore(name: string): number {
  const n = name.toLowerCase();
  if (/flash-lite/.test(n)) return 2;
  if (/flash/.test(n)) return 4;
  if (/pro/.test(n)) return 1; // kuota gratis Pro sangat kecil
  return 3; // nama kode baru (mis. gemini-4-xxx)
}

function isPreviewModel(name: string): boolean {
  return /(preview|exp|experimental|\d{2}-\d{2,4}$)/i.test(name);
}

export function rankGeminiModels(names: string[]): string[] {
  const unique = Array.from(
    new Set(names.map((n) => n.replace(/^models\//, '').trim()).filter(Boolean))
  );
  return unique
    .filter((n) => /^gemini/i.test(n) && !NON_TEXT_MODEL_PATTERN.test(n))
    .sort((a, b) => {
      const stableDiff = Number(isPreviewModel(a)) - Number(isPreviewModel(b));
      if (stableDiff !== 0) return stableDiff;
      const tierDiff = geminiTierScore(b) - geminiTierScore(a);
      if (tierDiff !== 0) return tierDiff;
      const verDiff = parseGeminiVersion(b) - parseGeminiVersion(a);
      if (verDiff !== 0) return verDiff;
      // Alias "-latest" diletakkan setelah versi bernomor yang setara.
      return a.length - b.length;
    });
}

async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  const cacheKey = hashKey(apiKey);
  const cached = modelListCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MODEL_LIST_CACHE_MS) {
    return cached.models;
  }

  try {
    const ai = createGeminiClient(apiKey);
    const found: string[] = [];
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const model of pager) {
      const actions = model.supportedActions ?? [];
      if (actions.length && !actions.includes('generateContent')) continue;
      if (model.name) found.push(model.name);
    }
    const ranked = rankGeminiModels(found);
    if (ranked.length) {
      modelListCache.set(cacheKey, { models: ranked, at: Date.now() });
      console.log(`[Gemini] Model tersedia (urutan dicoba): ${ranked.join(', ')}`);
      return ranked;
    }
  } catch (err) {
    if (isInvalidKeyError(err)) throw friendlyInvalidKeyError();
    console.warn(
      '[Gemini] Gagal mengambil daftar model, memakai daftar cadangan:',
      err instanceof Error ? err.message.slice(0, 200) : err
    );
  }
  return GEMINI_STATIC_FALLBACKS;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errorStatus(err: unknown): number | undefined {
  const s = (err as { status?: unknown })?.status;
  if (typeof s === 'number') return s;
  const m = errorText(err).match(/"code"\s*:\s*(\d{3})/);
  return m ? Number(m[1]) : undefined;
}

function isInvalidKeyError(err: unknown): boolean {
  const msg = errorText(err);
  const status = errorStatus(err);
  return (
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg) ||
    status === 401 ||
    status === 403
  );
}

function friendlyInvalidKeyError(): Error {
  return new Error(
    'API Key Gemini tidak valid atau tidak memiliki izin. Periksa kembali API Key dari Google AI Studio (aistudio.google.com/app/apikey).'
  );
}

/** Kesalahan yang bisa diatasi dengan mencoba model lain. */
function shouldTryNextModel(err: unknown): boolean {
  const msg = errorText(err);
  const status = errorStatus(err);
  if (status && [404, 429, 500, 502, 503, 504].includes(status)) return true;
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|not found|is not supported|high demand|overloaded|INTERNAL|quota|deadline|timed? ?out|fetch failed/i.test(
    msg
  );
}

function isBusyError(err: unknown): boolean {
  const status = errorStatus(err);
  return status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(errorText(err));
}

function shortGeminiReason(err: unknown): string {
  const status = errorStatus(err);
  const msg = errorText(err);
  const code = msg.match(/"status"\s*:\s*"([A-Z_]+)"/)?.[1];
  if (status === 404 || /NOT_FOUND/.test(msg)) return 'tidak tersedia';
  if (status === 429 || /RESOURCE_EXHAUSTED/.test(msg)) return 'kuota habis';
  if (status === 503 || /UNAVAILABLE/.test(msg)) return 'sedang sibuk';
  return [status, code].filter(Boolean).join(' ') || msg.slice(0, 60);
}

/** Jawaban model kosong/rusak/tidak lengkap: cukup dicoba dengan model lain. */
class GeminiOutputError extends Error {}

async function generateWithGemini<T>(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  accept: (text: string) => T,
  preferredModel?: string
): Promise<{ result: T; model: string }> {
  let candidates = (await discoverGeminiModels(apiKey)).slice(
    0,
    MAX_MODELS_TO_TRY
  );
  // Model yang berhasil pada kelompok soal sebelumnya dicoba lebih dulu.
  if (preferredModel) {
    candidates = [preferredModel, ...candidates.filter((m) => m !== preferredModel)];
  }
  const report: string[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const model = candidates[i];
    // Model pertama diberi satu kali kesempatan ulang.
    const attempts = i === 0 ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const text = await generateWithGeminiModel(
          model,
          apiKey,
          systemInstruction,
          userPrompt
        );
        let result: T;
        try {
          result = accept(text);
        } catch (validationErr) {
          throw new GeminiOutputError(
            `jawaban tidak lengkap (${errorText(validationErr).slice(0, 120)})`
          );
        }
        console.log(`[Gemini] Berhasil dengan model ${model}`);
        return { result, model };
      } catch (err) {
        console.warn(
          `[Gemini] Model ${model} gagal (percobaan ${attempt + 1}):`,
          errorText(err).slice(0, 200)
        );
        if (isInvalidKeyError(err)) throw friendlyInvalidKeyError();
        const outputProblem = err instanceof GeminiOutputError;
        if (!outputProblem && !shouldTryNextModel(err)) throw err;
        if (attempt + 1 < attempts && (outputProblem || isBusyError(err))) {
          await sleep(outputProblem ? 500 : 3000);
          continue;
        }
        report.push(
          `${model}: ${outputProblem ? errorText(err) : shortGeminiReason(err)}`
        );
        if (!outputProblem) modelListCache.delete(hashKey(apiKey));
        break;
      }
    }
  }

  throw new Error(
    'Google Gemini belum berhasil membuat soal. Silakan coba lagi beberapa menit lagi atau kurangi jumlah soal. Rincian: ' +
      report.join('; ')
  );
}

async function generateWithGeminiModel(
  model: string,
  apiKey: string,
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const ai = createGeminiClient(apiKey);

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nomor: { type: Type.INTEGER },
                type: { type: Type.STRING },
                cognitiveLevel: { type: Type.STRING },
                tpCode: { type: Type.STRING },
                indikatorSoal: { type: Type.STRING },
                stimulus: { type: Type.STRING },
                pertanyaan: { type: Type.STRING },
                opsi: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      teks: { type: Type.STRING },
                    },
                  },
                },
                kunciPg: { type: Type.STRING },
                kunciMcma: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                pernyataan: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      teks: { type: Type.STRING },
                    },
                  },
                },
                kunciKategori: {
                  type: Type.OBJECT,
                  properties: {
                    P1: { type: Type.BOOLEAN },
                    P2: { type: Type.BOOLEAN },
                    P3: { type: Type.BOOLEAN },
                  },
                },
                pembahasan: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const text = response.text;
  if (!text || !text.trim()) {
    const finish = response.candidates?.[0]?.finishReason;
    const blocked = response.promptFeedback?.blockReason;
    throw new GeminiOutputError(
      `jawaban kosong${finish ? ` (${finish})` : ''}${blocked ? ` (diblokir: ${blocked})` : ''}`
    );
  }
  return text;
}


/** Jumlah soal per permintaan ke Gemini, agar jawaban tidak terpotong. */
const QUESTIONS_PER_BATCH = 8;

export async function generateQuestionsViaAi(params: {
  draft: AssessmentDraft;
  providerId?: string;
  apiKey: string;
}): Promise<{ questions: TeacherQuestion[]; providerName: string }> {
  const slots = buildBlueprintSlots(params.draft);

  const trimmedKey = params.apiKey.trim();
  if (!trimmedKey || trimmedKey.length < 8) {
    throw new Error('API Key Gemini pribadi guru (BYOK) wajib diisi dengan benar.');
  }

  // Soal dibuat bertahap per kelompok kecil. Model yang berhasil
  // dipakai lebih dulu untuk kelompok berikutnya.
  const questions: TeacherQuestion[] = [];
  const modelsUsed = new Set<string>();
  let preferredModel: string | undefined;

  for (let start = 0; start < slots.length; start += QUESTIONS_PER_BATCH) {
    const batch = slots.slice(start, start + QUESTIONS_PER_BATCH);
    const { systemInstruction, userPrompt } = buildPrompt(params.draft, batch);
    try {
      const { result, model } = await generateWithGemini(
        trimmedKey,
        systemInstruction,
        userPrompt,
        (text) =>
          normalizeAndValidateQuestions(
            extractJsonObject(text).questions ?? [],
            batch
          ),
        preferredModel
      );
      questions.push(...result);
      modelsUsed.add(model);
      preferredModel = model;
    } catch (err) {
      const prefix = `Gagal membuat soal nomor ${batch[0].nomor}–${batch[batch.length - 1].nomor}. `;
      throw new Error(prefix + errorText(err));
    }
  }

  return {
    questions,
    providerName: `Google Gemini (${Array.from(modelsUsed).join(', ')})`,
  };
}
