import type {
  ActiveStudentSession,
  AssessmentDraft,
  AssessmentSubmissionResult,
  KelasFaseC,
  StudentAnswersMap,
  TeacherAssessmentRecord,
  TeacherQuestion,
  TeacherSessionSummary,
} from '../types/assessment';

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const errMsg =
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Permintaan gagal (HTTP ${res.status}).`;
    throw new Error(errMsg);
  }

  return parsed as T;
}

export async function generateAssessmentApi(params: {
  draft: AssessmentDraft;
  providerId: string;
  apiKey: string;
}): Promise<{ assessment: TeacherAssessmentRecord; teacherToken: string }> {
  const res = await fetch('/api/assessments/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse<{
    assessment: TeacherAssessmentRecord;
    teacherToken: string;
  }>(res);
}

export async function updateTeacherQuestionApi(params: {
  assessmentId: string;
  teacherToken: string;
  questionId: string;
  patch: Partial<TeacherQuestion>;
}): Promise<{ assessment: TeacherAssessmentRecord }> {
  const res = await fetch(
    `/api/assessments/${encodeURIComponent(params.assessmentId)}/questions/${encodeURIComponent(params.questionId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.teacherToken}`,
      },
      body: JSON.stringify(params.patch),
    }
  );
  return parseJsonResponse<{ assessment: TeacherAssessmentRecord }>(res);
}

export async function updateTeacherSettingsApi(params: {
  assessmentId: string;
  teacherToken: string;
  durasiMenit?: number;
  acakSoal?: boolean;
  approveAll?: boolean;
}): Promise<{ assessment: TeacherAssessmentRecord }> {
  const res = await fetch(
    `/api/assessments/${encodeURIComponent(params.assessmentId)}/settings`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.teacherToken}`,
      },
      body: JSON.stringify({
        durasiMenit: params.durasiMenit,
        acakSoal: params.acakSoal,
        approveAll: params.approveAll,
      }),
    }
  );
  return parseJsonResponse<{ assessment: TeacherAssessmentRecord }>(res);
}

export async function publishAssessmentApi(params: {
  assessmentId: string;
  teacherToken: string;
}): Promise<{ assessment: TeacherAssessmentRecord }> {
  const res = await fetch(
    `/api/assessments/${encodeURIComponent(params.assessmentId)}/publish`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.teacherToken}`,
      },
    }
  );
  return parseJsonResponse<{ assessment: TeacherAssessmentRecord }>(res);
}

export async function fetchTeacherResultsApi(params: {
  assessmentId: string;
  teacherToken: string;
}): Promise<{ results: TeacherSessionSummary[] }> {
  const res = await fetch(
    `/api/assessments/${encodeURIComponent(params.assessmentId)}/results`,
    {
      headers: {
        Authorization: `Bearer ${params.teacherToken}`,
      },
    }
  );
  return parseJsonResponse<{ results: TeacherSessionSummary[] }>(res);
}

export async function startStudentSessionApi(params: {
  assessmentCode: string;
  studentName: string;
  studentClass: KelasFaseC;
  studentAbsen: string;
}): Promise<{ session: ActiveStudentSession }> {
  const res = await fetch('/api/student/sessions/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parseJsonResponse<{ session: ActiveStudentSession }>(res);
}

export async function autosaveStudentAnswersApi(params: {
  sessionId: string;
  sessionToken: string;
  answers: StudentAnswersMap;
}): Promise<{ savedAt: string }> {
  const res = await fetch(
    `/api/student/sessions/${encodeURIComponent(params.sessionId)}/autosave`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.sessionToken}`,
      },
      body: JSON.stringify({ answers: params.answers }),
    }
  );
  return parseJsonResponse<{ savedAt: string }>(res);
}

export async function submitStudentSessionApi(params: {
  sessionId: string;
  sessionToken: string;
  answers: StudentAnswersMap;
  autoSubmittedByTimeout?: boolean;
}): Promise<{ result: AssessmentSubmissionResult }> {
  const res = await fetch(
    `/api/student/sessions/${encodeURIComponent(params.sessionId)}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.sessionToken}`,
      },
      body: JSON.stringify({
        answers: params.answers,
        autoSubmittedByTimeout: Boolean(params.autoSubmittedByTimeout),
      }),
    }
  );
  return parseJsonResponse<{ result: AssessmentSubmissionResult }>(res);
}
