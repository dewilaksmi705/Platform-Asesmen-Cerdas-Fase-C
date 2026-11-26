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

  const userPrompt = `Susun ${draft.jumlahSoal} butir soal asesmen sumatif dengan detail berikut:
- Judul Asesmen: ${draft.judul || `Asesmen Sumatif ${draft.mataPelajaranNama}`}
- Jenjang / Fase: SD Fase C
- Kelas Peserta Asesmen: Kelas ${draft.kelas}
- Mata Pelajaran: ${draft.mataPelajaranNama}
- Komposisi Tipe Soal: PG = ${draft.distribusiTipeSoal.PG}, MCMA = ${draft.distribusiTipeSoal.MCMA}, KATEGORI = ${draft.distribusiTipeSoal.KATEGORI}
- Komposisi Kognitif: C1=${draft.distribusiKognitif.C1}, C2=${draft.distribusiKognitif.C2}, C3=${draft.distribusiKognitif.C3}, C4=${draft.distribusiKognitif.C4}, C5=${draft.distribusiKognitif.C5}, C6=${draft.distribusiKognitif.C6}

KISI-KISI WAJIB PER NOMOR SOAL:
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

// Urutan model Gemini yang dicoba. Jika satu model sedang penuh (503/429),
// aplikasi otomatis mencoba model berikutnya.
const GEMINI_MODEL_FALLBACKS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-4-hydrogen',
];

function isTemporaryGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(503|429|500)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|INTERNAL/i.test(
    msg
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b|NOT_FOUND|not found|is not supported/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithGemini(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string
): Promise<{ text: string; model: string }> {
  let lastError: unknown = null;
  for (const model of GEMINI_MODEL_FALLBACKS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await generateWithGeminiModel(
          model,
          apiKey,
          systemInstruction,
          userPrompt
        );
        return { text, model };
      } catch (err) {
        lastError = err;
        console.warn(
          `[Gemini] Model ${model} gagal (percobaan ${attempt + 1}):`,
          err instanceof Error ? err.message.slice(0, 200) : err
        );
        if (isModelNotFoundError(err)) break; // coba model berikutnya
        if (!isTemporaryGeminiError(err)) throw err; // misal API key salah
        if (attempt === 0) await sleep(2000);
      }
    }
  }
  throw new Error(
    'Semua model Google Gemini sedang sibuk. Silakan coba lagi beberapa menit lagi, atau kurangi jumlah soal. ' +
      (lastError instanceof Error ? `Detail: ${lastError.message.slice(0, 160)}` : '')
  );
}

async function generateWithGeminiModel(
  model: string,
  apiKey: string,
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

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
  if (!text) {
    throw new Error('Google Gemini tidak mengembalikan teks soal.');
  }
  return text;
}

async function generateWithOpenAi(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Permintaan ke OpenAI gagal (HTTP ${res.status}). Periksa kembali API Key dan kuota Anda.${errText ? ` Detail: ${errText.slice(0, 180)}` : ''}`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI tidak mengembalikan isi soal.');
  }
  return content;
}

async function generateWithAnthropic(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 8192,
      system: systemInstruction,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Permintaan ke Anthropic Claude gagal (HTTP ${res.status}). Periksa kembali API Key dan kuota Anda.${errText ? ` Detail: ${errText.slice(0, 180)}` : ''}`
    );
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlock = data.content?.find((c) => c.type === 'text')?.text;
  if (!textBlock) {
    throw new Error('Anthropic Claude tidak mengembalikan isi soal.');
  }
  return textBlock;
}

export async function generateQuestionsViaAi(params: {
  draft: AssessmentDraft;
  providerId: string;
  apiKey: string;
}): Promise<{ questions: TeacherQuestion[]; providerName: string }> {
  const slots = buildBlueprintSlots(params.draft);
  const { systemInstruction, userPrompt } = buildPrompt(params.draft, slots);

  const trimmedKey = params.apiKey.trim();
  if (!trimmedKey || trimmedKey.length < 8) {
    throw new Error('API Key pribadi guru (BYOK) wajib diisi dengan benar.');
  }

  let rawOutput: string;
  let providerName: string;

  if (params.providerId === 'gemini') {
    const gemini = await generateWithGemini(
      trimmedKey,
      systemInstruction,
      userPrompt
    );
    providerName = `Google Gemini (${gemini.model})`;
    rawOutput = gemini.text;
  } else if (params.providerId === 'openai') {
    providerName = 'OpenAI GPT (gpt-4o-mini)';
    rawOutput = await generateWithOpenAi(
      trimmedKey,
      systemInstruction,
      userPrompt
    );
  } else if (params.providerId === 'anthropic') {
    providerName = 'Anthropic Claude';
    rawOutput = await generateWithAnthropic(
      trimmedKey,
      systemInstruction,
      userPrompt
    );
  } else {
    throw new Error('Penyedia AI yang dipilih tidak dikenali.');
  }

  const parsed = extractJsonObject(rawOutput);
  const questions = normalizeAndValidateQuestions(
    parsed.questions ?? [],
    slots
  );

  return { questions, providerName };
}
