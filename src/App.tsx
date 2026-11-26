/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import {
  BuatAsesmenPage,
  PrefillAssessmentSelection,
} from './pages/BuatAsesmenPage';
import { DashboardPage } from './pages/DashboardPage';
import { KatalogTpPage } from './pages/KatalogTpPage';
import { KonfigurasiAiPage } from './pages/KonfigurasiAiPage';
import { PanduanPage } from './pages/PanduanPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { PengerjaanMuridPage } from './pages/PengerjaanMuridPage';
import { PeninjauanSoalPage } from './pages/PeninjauanSoalPage';
import {
  AssessmentDraft,
  CatalogLearningObjective,
  PageId,
  TeacherAssessmentRecord,
} from './types/assessment';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefillAssessment, setPrefillAssessment] =
    useState<PrefillAssessmentSelection | null>(null);
  const [savedDraft, setSavedDraft] = useState<AssessmentDraft | null>(null);
  const [isTransitioningToAi, setIsTransitioningToAi] = useState(false);
  const [guideTargetSection, setGuideTargetSection] = useState<string | null>(
    null
  );

  // State peninjauan guru (teacherToken hanya disimpan di memori React, bukan localStorage)
  const [teacherAssessment, setTeacherAssessment] =
    useState<TeacherAssessmentRecord | null>(null);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [prefilledStudentCode, setPrefilledStudentCode] = useState<
    string | null
  >(null);

  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activePage]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const handleNavigate = useCallback((page: PageId) => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setIsTransitioningToAi(false);
    setActivePage(page);
    setMobileMenuOpen(false);
  }, []);

  const handleUseTpInAssessment = useCallback(
    (tp: CatalogLearningObjective) => {
      setPrefillAssessment({
        kelas: tp.grade,
        mataPelajaranNama: tp.subject_name,
        tp,
      });
      setActivePage('buat-asesmen');
    },
    []
  );

  const handleProceedToAi = useCallback((draft: AssessmentDraft) => {
    setSavedDraft(draft);
    setIsTransitioningToAi(true);

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      setActivePage('konfigurasi-ai');
      setIsTransitioningToAi(false);
      transitionTimerRef.current = null;
    }, 380);
  }, []);

  const handleQuestionsGenerated = useCallback(
    (payload: {
      assessment: TeacherAssessmentRecord;
      teacherToken: string;
    }) => {
      setTeacherAssessment(payload.assessment);
      setTeacherToken(payload.teacherToken);
      setActivePage('tinjau-soal');
    },
    []
  );

  const handleOpenStudentModeWithCode = useCallback((code: string) => {
    setPrefilledStudentCode(code);
    setActivePage('pengerjaan-murid');
  }, []);

  const handleNavigateGuideSection = useCallback((sectionId: string) => {
    setGuideTargetSection(sectionId);
    setActivePage('panduan');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activePage={activePage}
          onNavigate={handleNavigate}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <div className="max-w-[1160px] mx-auto">
            {isTransitioningToAi ? (
              <div
                role="status"
                aria-live="polite"
                className="bg-white border border-slate-200 rounded-2xl p-12 sm:p-16 flex flex-col items-center justify-center text-center gap-4 min-h-[360px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-cerulean-600 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-navy-900">
                    Menyiapkan Halaman Konfigurasi AI (BYOK)...
                  </p>
                  <p className="text-sm text-slate-600 max-w-md">
                    Meneruskan rancangan asesmen, komposisi PG/MCMA/Kategori,
                    daftar Tujuan Pembelajaran terpilih, dan distribusi kognitif
                    C1–C6 Anda.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {activePage === 'dashboard' && (
                  <DashboardPage
                    onNavigate={handleNavigate}
                    onNavigateGuideSection={handleNavigateGuideSection}
                  />
                )}

                {activePage === 'buat-asesmen' && (
                  <BuatAsesmenPage
                    initialDraft={savedDraft}
                    prefillSelection={prefillAssessment}
                    onClearPrefill={() => setPrefillAssessment(null)}
                    onOpenKatalog={() => handleNavigate('katalog-tp')}
                    onProceedToAi={handleProceedToAi}
                    isProceedingToAi={isTransitioningToAi}
                  />
                )}

                {activePage === 'konfigurasi-ai' && (
                  <KonfigurasiAiPage
                    draft={savedDraft}
                    onBackToBuilder={() => handleNavigate('buat-asesmen')}
                    onQuestionsGenerated={handleQuestionsGenerated}
                  />
                )}

                {activePage === 'tinjau-soal' && (
                  <PeninjauanSoalPage
                    assessment={teacherAssessment}
                    teacherToken={teacherToken}
                    onAssessmentUpdated={setTeacherAssessment}
                    onBackToBuilder={() => handleNavigate('buat-asesmen')}
                    onOpenStudentMode={handleOpenStudentModeWithCode}
                  />
                )}

                {activePage === 'pengerjaan-murid' && (
                  <PengerjaanMuridPage
                    prefilledCode={prefilledStudentCode}
                    onClearPrefilledCode={() => setPrefilledStudentCode(null)}
                  />
                )}

                {activePage === 'katalog-tp' && (
                  <KatalogTpPage
                    onUseTpInAssessment={handleUseTpInAssessment}
                  />
                )}

                {activePage === 'panduan' && (
                  <PanduanPage
                    initialSectionId={guideTargetSection}
                    onClearInitialSection={() => setGuideTargetSection(null)}
                    onNavigate={handleNavigate}
                  />
                )}

                {activePage === 'pengaturan' && <PengaturanPage />}
              </>
            )}
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-10 py-4 mt-auto">
          <div className="max-w-[1160px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <p className="font-medium text-navy-900">
              ASESMEN CERDAS · Platform Asesmen Sumatif SD Fase C (Kelas 5 &amp;
              Kelas 6)
            </p>
            <p>Asesmen Lebih Cerdas, Pembelajaran Lebih Bermakna.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
