import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from '../lib/supabaseClient';
import {
  CatalogLearningObjective,
  KelasFaseC,
} from '../types/assessment';

const CATALOG_VIEW = 'v_learning_objectives_catalog';

interface RawCatalogRow {
  id?: string | number | null;
  learning_objective_id?: string | number | null;
  tp_id?: string | number | null;
  objective_id?: string | number | null;
  subject_name: string | null;
  phase: string | null;
  grade: number | string | null;
  element: string | null;
  tp_code: string | null;
  tp_text: string | null;
  material_scope: string | null;
}

function parseGradeFaseC(rawGrade: number | string | null): KelasFaseC | null {
  if (rawGrade === null || rawGrade === undefined) return null;
  if (typeof rawGrade === 'number') {
    return rawGrade === 5 || rawGrade === 6 ? rawGrade : null;
  }
  const digits = rawGrade.replace(/[^0-9]/g, '');
  const parsed = parseInt(digits, 10);
  return parsed === 5 || parsed === 6 ? parsed : null;
}

function isPhaseCValue(rawPhase: string | null): boolean {
  if (!rawPhase) return false;
  const normalized = rawPhase.trim().toUpperCase();
  return normalized === 'C' || normalized === 'FASE C';
}

function extractDatabaseTpId(row: RawCatalogRow): string | null {
  const candidates = [
    row.id,
    row.learning_objective_id,
    row.tp_id,
    row.objective_id,
  ];
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      const value = String(candidate).trim();
      if (value.length > 0) {
        return value;
      }
    }
  }
  return null;
}

function computeDeterministicHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

export function normalizeCatalogRows(
  rows: RawCatalogRow[]
): CatalogLearningObjective[] {
  const seenIdCounts = new Map<string, number>();
  const normalized: CatalogLearningObjective[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const grade = parseGradeFaseC(row.grade);
    const subjectName = row.subject_name?.trim() ?? '';
    const tpCode = row.tp_code?.trim() ?? '';
    const tpText = row.tp_text?.trim() ?? '';
    const element = row.element?.trim() || '-';
    const materialScope = row.material_scope?.trim() || '-';

    if (!grade || !isPhaseCValue(row.phase) || !subjectName || !tpText) {
      continue;
    }

    const dbId = extractDatabaseTpId(row);
    const baseId =
      dbId ??
      `tp-k${grade}-${computeDeterministicHash(
        `${grade}|${subjectName}|${element}|${tpCode}|${tpText}|${materialScope}`
      )}`;

    const prevCount = seenIdCounts.get(baseId) ?? 0;
    seenIdCounts.set(baseId, prevCount + 1);
    const uniqueId = prevCount === 0 ? baseId : `${baseId}__${prevCount + 1}`;

    normalized.push({
      id: uniqueId,
      subject_name: subjectName,
      phase: 'C',
      grade,
      element,
      tp_code: tpCode || `TP-${index + 1}`,
      tp_text: tpText,
      material_scope: materialScope,
    });
  }

  return normalized;
}

function ensureClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      supabaseConfigError ||
        'Koneksi Supabase belum dikonfigurasi. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

function formatSupabaseError(context: string, message?: string): Error {
  const detail = message ? ` (${message})` : '';
  return new Error(
    `Gagal memuat ${context} dari Supabase. Pastikan koneksi internet aktif, kredensial benar, dan view public.${CATALOG_VIEW} dapat dibaca oleh Anon Key${detail}.`
  );
}

/**
 * Mengambil daftar mata pelajaran secara dinamis dari `public.v_learning_objectives_catalog`
 * untuk Fase C dan Kelas 5 atau 6.
 */
export async function fetchSubjectsByGrade(
  grade: KelasFaseC
): Promise<string[]> {
  const client = ensureClient();

  const { data, error } = await client
    .from(CATALOG_VIEW)
    .select('subject_name, phase, grade')
    .eq('phase', 'C')
    .eq('grade', grade)
    .order('subject_name', { ascending: true });

  if (error) {
    throw formatSupabaseError('daftar mata pelajaran', error.message);
  }

  let rows = (data ?? []) as Pick<
    RawCatalogRow,
    'subject_name' | 'phase' | 'grade'
  >[];

  // Antisipasi bila kolom phase pada view menggunakan teks 'Fase C'
  if (rows.length === 0) {
    const fallbackRes = await client
      .from(CATALOG_VIEW)
      .select('subject_name, phase, grade')
      .eq('phase', 'Fase C')
      .eq('grade', grade)
      .order('subject_name', { ascending: true });

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
      rows = fallbackRes.data as Pick<
        RawCatalogRow,
        'subject_name' | 'phase' | 'grade'
      >[];
    }
  }

  const seen = new Set<string>();
  const subjects: string[] = [];

  for (const row of rows) {
    const name = row.subject_name?.trim();
    const parsedGrade = parseGradeFaseC(row.grade);
    if (name && parsedGrade === grade && isPhaseCValue(row.phase) && !seen.has(name)) {
      seen.add(name);
      subjects.push(name);
    }
  }

  return subjects;
}

/**
 * Mengambil seluruh Tujuan Pembelajaran (satu tahun penuh, tanpa filter semester)
 * dari `public.v_learning_objectives_catalog` berdasarkan Kelas (5/6) dan Mata Pelajaran.
 */
export async function fetchLearningObjectives(
  grade: KelasFaseC,
  subjectName: string
): Promise<CatalogLearningObjective[]> {
  const client = ensureClient();
  const trimmedSubject = subjectName.trim();
  if (!trimmedSubject) return [];

  const { data, error } = await client
    .from(CATALOG_VIEW)
    .select('*')
    .eq('phase', 'C')
    .eq('grade', grade)
    .eq('subject_name', trimmedSubject)
    .order('tp_code', { ascending: true });

  if (error) {
    throw formatSupabaseError('daftar Tujuan Pembelajaran', error.message);
  }

  let rows = (data ?? []) as RawCatalogRow[];

  if (rows.length === 0) {
    const fallbackRes = await client
      .from(CATALOG_VIEW)
      .select('*')
      .eq('phase', 'Fase C')
      .eq('grade', grade)
      .eq('subject_name', trimmedSubject)
      .order('tp_code', { ascending: true });

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
      rows = fallbackRes.data as RawCatalogRow[];
    }
  }

  return normalizeCatalogRows(rows).filter(
    (item) => item.grade === grade && item.subject_name === trimmedSubject
  );
}

/**
 * Mengambil seluruh katalog TP SD Fase C (Kelas 5 dan Kelas 6) dari Supabase
 * untuk halaman Katalog Tujuan Pembelajaran.
 */
export async function fetchAllFaseCCatalog(): Promise<
  CatalogLearningObjective[]
> {
  const client = ensureClient();

  const { data, error } = await client
    .from(CATALOG_VIEW)
    .select('*')
    .eq('phase', 'C')
    .in('grade', [5, 6])
    .order('grade', { ascending: true })
    .order('subject_name', { ascending: true })
    .order('tp_code', { ascending: true });

  if (error) {
    throw formatSupabaseError('katalog Tujuan Pembelajaran', error.message);
  }

  let rows = (data ?? []) as RawCatalogRow[];

  if (rows.length === 0) {
    const fallbackRes = await client
      .from(CATALOG_VIEW)
      .select('*')
      .eq('phase', 'Fase C')
      .in('grade', [5, 6])
      .order('grade', { ascending: true })
      .order('subject_name', { ascending: true })
      .order('tp_code', { ascending: true });

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
      rows = fallbackRes.data as RawCatalogRow[];
    }
  }

  return normalizeCatalogRows(rows);
}

/**
 * Mengambil seluruh daftar mata pelajaran SD Fase C (gabungan Kelas 5 dan Kelas 6)
 * secara dinamis dari `public.v_learning_objectives_catalog`.
 */
export async function fetchSubjectsFaseC(): Promise<string[]> {
  const client = ensureClient();

  const { data, error } = await client
    .from(CATALOG_VIEW)
    .select('subject_name, phase, grade')
    .eq('phase', 'C')
    .in('grade', [5, 6])
    .order('subject_name', { ascending: true });

  if (error) {
    throw formatSupabaseError('daftar mata pelajaran Fase C', error.message);
  }

  let rows = (data ?? []) as Pick<
    RawCatalogRow,
    'subject_name' | 'phase' | 'grade'
  >[];

  if (rows.length === 0) {
    const fallbackRes = await client
      .from(CATALOG_VIEW)
      .select('subject_name, phase, grade')
      .eq('phase', 'Fase C')
      .in('grade', [5, 6])
      .order('subject_name', { ascending: true });

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
      rows = fallbackRes.data as Pick<
        RawCatalogRow,
        'subject_name' | 'phase' | 'grade'
      >[];
    }
  }

  const seen = new Set<string>();
  const subjects: string[] = [];

  for (const row of rows) {
    const name = row.subject_name?.trim();
    const parsedGrade = parseGradeFaseC(row.grade);
    if (name && parsedGrade !== null && isPhaseCValue(row.phase) && !seen.has(name)) {
      seen.add(name);
      subjects.push(name);
    }
  }

  return subjects;
}

/**
 * Mengambil seluruh Tujuan Pembelajaran SD Fase C (gabungan Kelas 5 DAN Kelas 6,
 * tanpa dibatasi kelas peserta dan tanpa filter semester) untuk mata pelajaran terpilih,
 * diurutkan berdasarkan mata pelajaran, elemen, dan kode TP.
 */
export async function fetchLearningObjectivesFaseC(
  subjectName: string
): Promise<CatalogLearningObjective[]> {
  const client = ensureClient();
  const trimmedSubject = subjectName.trim();
  if (!trimmedSubject) return [];

  const { data, error } = await client
    .from(CATALOG_VIEW)
    .select('*')
    .eq('phase', 'C')
    .in('grade', [5, 6])
    .eq('subject_name', trimmedSubject)
    .order('subject_name', { ascending: true })
    .order('element', { ascending: true })
    .order('tp_code', { ascending: true });

  if (error) {
    throw formatSupabaseError('daftar Tujuan Pembelajaran Fase C', error.message);
  }

  let rows = (data ?? []) as RawCatalogRow[];

  if (rows.length === 0) {
    const fallbackRes = await client
      .from(CATALOG_VIEW)
      .select('*')
      .eq('phase', 'Fase C')
      .in('grade', [5, 6])
      .eq('subject_name', trimmedSubject)
      .order('subject_name', { ascending: true })
      .order('element', { ascending: true })
      .order('tp_code', { ascending: true });

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
      rows = fallbackRes.data as RawCatalogRow[];
    }
  }

  return normalizeCatalogRows(rows)
    .filter((item) => item.subject_name === trimmedSubject)
    .sort((a, b) => {
      const bySubject = a.subject_name.localeCompare(b.subject_name, 'id', {
        numeric: true,
        sensitivity: 'base',
      });
      if (bySubject !== 0) return bySubject;

      const byElement = a.element.localeCompare(b.element, 'id', {
        numeric: true,
        sensitivity: 'base',
      });
      if (byElement !== 0) return byElement;

      return a.tp_code.localeCompare(b.tp_code, 'id', {
        numeric: true,
        sensitivity: 'base',
      });
    });
}


