import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { CamcallLoadingScreen } from './components/CamcallLoadingScreen';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import {
  Navbar,
  type CreativeModeId,
  type StudioNavigationPayload,
} from './components/Navbar';
import { NotFoundPage } from './components/NotFoundPage';
import type { LeftToolTab } from './components/PhotoboothStudio';
import type { StudioTemplateEntry } from './components/TemplatesPage';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { CameraEngineProvider, useCameraEngine } from './context/CameraEngineContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import type {
  BoothLayoutId,
  BoothShapeId,
  CameraModeId,
  FaceFilterCategory,
} from './types/photobooth';
import type { LocalProjectRecord } from './types/settings';
import type { PhotoboothTemplateId, SavedCreation, StudioView } from './types/studio';

const PhotoboothStudio = lazy(() =>
  import('./components/PhotoboothStudio').then((m) => ({ default: m.PhotoboothStudio }))
);
const FilterLibrary = lazy(() =>
  import('./components/FilterLibrary').then((m) => ({ default: m.FilterLibrary }))
);
const PhotoEditor = lazy(() =>
  import('./components/PhotoEditor').then((m) => ({ default: m.PhotoEditor }))
);
const CollageMaker = lazy(() =>
  import('./components/CollageMaker').then((m) => ({ default: m.CollageMaker }))
);
const CreativeCollectionStudio = lazy(() =>
  import('./components/CreativeCollectionStudio').then((m) => ({
    default: m.CreativeCollectionStudio,
  }))
);
const CreativeStudioModes = lazy(() =>
  import('./components/CreativeStudioModes').then((m) => ({ default: m.CreativeStudioModes }))
);
const TemplatesPage = lazy(() =>
  import('./components/TemplatesPage').then((m) => ({ default: m.TemplatesPage }))
);
const GalleryPage = lazy(() =>
  import('./components/GalleryPage').then((m) => ({ default: m.GalleryPage }))
);
const SettingsPage = lazy(() =>
  import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PREF_STORAGE_KEY = 'camcall_preferences_v1';

const KNOWN_PATH_VIEWS: Record<string, StudioView> = {
  '/': 'home',
  '/index.html': 'home',
  '/photobooth': 'photobooth',
  '/camera': 'photobooth',
  '/filters': 'filters',
  '/editor': 'editor',
  '/collage': 'collage',
  '/creative': 'creative',
  '/creative-modes': 'creative-modes',
  '/templates': 'templates',
  '/gallery': 'gallery',
  '/settings': 'settings',
};

function resolveInitialView(): StudioView {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') return 'photobooth';
  const cleanPath = window.location.pathname.replace(/\/+$/, '') || '/';
  return KNOWN_PATH_VIEWS[cleanPath] || 'not-found';
}

interface BoothNavConfig {
  initialMode?: CameraModeId;
  initialTab?: LeftToolTab;
  initialFaceCategory?: FaceFilterCategory;
  initialBoothThemeId?: string;
  initialLayoutId?: BoothLayoutId;
  initialShapeId?: BoothShapeId;
}

function AppContent() {
  const { t } = useSettings();
  const { stopStream } = useCameraEngine();

  const [activeView, setActiveView] = useState<StudioView>(resolveInitialView);
  const [prevView, setPrevView] = useState<StudioView>('home');

  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editorFilterId, setEditorFilterId] = useState<string | null>(null);
  const [editorFilterIntensity, setEditorFilterIntensity] = useState<number>(100);
  const [editorProject, setEditorProject] = useState<LocalProjectRecord | null>(null);
  const [collageProject, setCollageProject] = useState<LocalProjectRecord | null>(null);
  const [boothProject, setBoothProject] = useState<LocalProjectRecord | null>(null);
  const [collectionProject, setCollectionProject] = useState<LocalProjectRecord | null>(null);
  const [creativeModeProject, setCreativeModeProject] = useState<LocalProjectRecord | null>(null);
  const [creativeMode, setCreativeMode] = useState<CreativeModeId>('polaroid');

  const [boothTemplateId, setBoothTemplateId] = useState<PhotoboothTemplateId>('classic-korean');
  const [boothNavConfig, setBoothNavConfig] = useState<BoothNavConfig>({});
  const [boothNavKey, setBoothNavKey] = useState<number>(0);

  const [savedCreations, setSavedCreations] = useState<SavedCreation[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.boothTemplateId) {
          setBoothTemplateId(parsed.boothTemplateId);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify({ boothTemplateId }));
    } catch {
      // Ignore storage errors
    }
  }, [boothTemplateId]);

  const notify = useCallback((message: string, kind: 'success' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts([{ id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const navigateTo = useCallback(
    (view: StudioView, payload?: Partial<StudioNavigationPayload>) => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.replaceState({}, '', `/${window.location.search}`);
      }

      if (view === 'about') {
        stopStream();
        setActiveView('home');
        setTimeout(() => {
          document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
        return;
      }

      if (view !== 'photobooth' && view !== 'filters') {
        stopStream();
      }

      if (view === 'photobooth' && payload) {
        setBoothProject(null);
        setBoothNavConfig({
          initialMode: payload.cameraMode,
          initialTab: payload.boothTab,
          initialFaceCategory: payload.faceCategory,
        });
        setBoothNavKey((k) => k + 1);
      } else if (view === 'creative-modes' && payload?.creativeMode) {
        if (payload.creativeMode === 'scrapbook') {
          setPrevView(activeView);
          setActiveView('creative');
          window.scrollTo({ top: 0, behavior: 'auto' });
          return;
        }
        setCreativeModeProject(null);
        setCreativeMode(payload.creativeMode);
      }

      setPrevView(activeView);
      setActiveView(view);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [activeView, stopStream]
  );

  const handleStartWithFilter = (filterId: string) => {
    setSelectedFilterId(filterId);
    navigateTo('filters');
  };

  const handleStartWithTemplate = (templateId: PhotoboothTemplateId) => {
    setBoothProject(null);
    setBoothTemplateId(templateId);
    setBoothNavConfig({});
    setBoothNavKey((k) => k + 1);
    navigateTo('photobooth');
  };

  const handleApplyFilterToEditor = (
    imageSrc: string,
    filterId: string,
    intensity: number
  ) => {
    setEditorProject(null);
    setEditorImageSrc(imageSrc);
    setEditorFilterId(filterId);
    setEditorFilterIntensity(intensity);
    navigateTo('editor');
  };

  const handleEditFrame = (imageSrc: string) => {
    setEditorProject(null);
    setEditorImageSrc(imageSrc);
    setEditorFilterId(null);
    setEditorFilterIntensity(100);
    navigateTo('editor');
  };

  const handleSaveCreation = (title: string, dataUrl: string) => {
    setSavedCreations((prev) => [
      {
        id: `saved-${Date.now()}`,
        title,
        dataUrl,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'editor',
      },
      ...prev.slice(0, 5),
    ]);
  };

  const handleUseTemplate = (tpl: StudioTemplateEntry) => {
    if (tpl.target === 'creative-modes') {
      setCreativeModeProject(null);
      setCreativeMode(tpl.creativeMode || 'polaroid');
      navigateTo('creative-modes');
      return;
    }
    setBoothProject(null);
    setBoothNavConfig({
      initialMode: 'photobooth',
      initialTab: 'themes',
      initialBoothThemeId: tpl.boothThemeId,
      initialLayoutId: tpl.boothLayoutId,
      initialShapeId: tpl.boothShapeId,
    });
    setBoothNavKey((k) => k + 1);
    navigateTo('photobooth');
  };

  const handleOpenPhotoInEditor = (dataUrl: string) => {
    setEditorProject(null);
    setEditorImageSrc(dataUrl);
    setEditorFilterId(null);
    setEditorFilterIntensity(100);
    navigateTo('editor');
  };

  const handleOpenProject = (project: LocalProjectRecord) => {
    if (project.kind === 'editor') {
      setEditorProject(project);
      navigateTo('editor');
    } else if (project.kind === 'creative') {
      setCollectionProject(project);
      navigateTo('creative');
    } else if (project.kind === 'creative-mode') {
      setCreativeModeProject(project);
      navigateTo('creative-modes');
    } else if (project.kind === 'collage') {
      setCollageProject(project);
      navigateTo('collage');
    } else {
      setBoothProject(project);
      setBoothNavConfig({});
      setBoothNavKey((k) => k + 1);
      navigateTo('photobooth');
    }
  };

  return (
    <div className="min-h-screen flex flex-col camcall-app-shell">
      <Navbar activeView={activeView} onNavigate={navigateTo} />

      <main className="flex-1 flex flex-col">
        <div key={activeView} className="studio-view-enter flex-1 flex flex-col">
          <Suspense fallback={<CamcallLoadingScreen />}>
            {activeView === 'home' && (
              <HomePage
                onNavigate={navigateTo}
                onStartWithFilter={handleStartWithFilter}
                onStartWithTemplate={handleStartWithTemplate}
              />
            )}

            {activeView === 'photobooth' && (
              <PhotoboothStudio
                key={`booth-${boothNavKey}`}
                initialTemplateId={boothTemplateId}
                initialMode={boothNavConfig.initialMode}
                initialTab={boothNavConfig.initialTab}
                initialFaceCategory={boothNavConfig.initialFaceCategory}
                initialBoothThemeId={boothNavConfig.initialBoothThemeId}
                initialLayoutId={boothNavConfig.initialLayoutId}
                initialShapeId={boothNavConfig.initialShapeId}
                initialProject={boothProject}
                onEditFrame={handleEditFrame}
                onNotify={notify}
              />
            )}

            {activeView === 'filters' && (
              <FilterLibrary
                initialFilterId={selectedFilterId}
                onApplyToEditor={handleApplyFilterToEditor}
                onNotify={notify}
              />
            )}

            {activeView === 'editor' && (
              <PhotoEditor
                initialImageSrc={editorImageSrc}
                initialFilterId={editorFilterId}
                initialFilterIntensity={editorFilterIntensity}
                initialProject={editorProject}
                onBack={() =>
                  navigateTo(prevView === 'editor' || prevView === 'not-found' ? 'home' : prevView)
                }
                onSaveCreation={handleSaveCreation}
                onNotify={notify}
              />
            )}

            {activeView === 'collage' && (
              <CollageMaker initialProject={collageProject} onNotify={notify} />
            )}

            {activeView === 'creative' && (
              <CreativeCollectionStudio
                initialProject={collectionProject}
                onNotify={notify}
              />
            )}

            {activeView === 'creative-modes' && (
              <CreativeStudioModes
                initialMode={creativeMode}
                initialProject={creativeModeProject}
                onOpenScrapbookStudio={() => navigateTo('creative')}
                onNotify={notify}
              />
            )}

            {activeView === 'templates' && (
              <TemplatesPage onUseTemplate={handleUseTemplate} onNotify={notify} />
            )}

            {activeView === 'gallery' && (
              <GalleryPage
                onOpenPhotoInEditor={handleOpenPhotoInEditor}
                onOpenProject={handleOpenProject}
                onNotify={notify}
              />
            )}

            {activeView === 'settings' && (
              <SettingsPage
                onClearSessionPhotos={() => setSavedCreations([])}
                onNotify={notify}
              />
            )}

            {activeView === 'not-found' && <NotFoundPage onNavigate={navigateTo} />}
          </Suspense>
        </div>

        {savedCreations.length > 0 && activeView === 'editor' && (
          <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
            <div className="rounded-2xl camcall-surface-soft border p-4">
              <h2 className="font-display text-sm font-bold mb-3">
                {t.gallery.tabs.photos} ({savedCreations.length})
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {savedCreations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditorProject(null);
                      setEditorImageSrc(item.dataUrl);
                    }}
                    className="shrink-0 w-24 text-left group cursor-pointer"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden border border-[#f3d5e5] group-hover:border-[#db2777] bg-white">
                      <img
                        src={item.dataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-medium truncate mt-1">{item.title}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer onNavigate={navigateTo} />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <CameraEngineProvider>
        <AppContent />
      </CameraEngineProvider>
    </SettingsProvider>
  );
}
