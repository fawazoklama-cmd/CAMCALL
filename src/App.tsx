import { useCallback, useEffect, useState } from 'react';
import { CollageMaker } from './components/CollageMaker';
import { CreativeCollectionStudio } from './components/CreativeCollectionStudio';
import { FilterLibrary } from './components/FilterLibrary';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { PhotoEditor } from './components/PhotoEditor';
import { PhotoboothStudio } from './components/PhotoboothStudio';
import { ToastContainer, type ToastMessage } from './components/Toast';
import type { PhotoboothTemplateId, SavedCreation, StudioView } from './types/studio';

const PREF_STORAGE_KEY = 'camcall_preferences_v1';

export default function App() {
  const [activeView, setActiveView] = useState<StudioView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'photobooth';
    }
    return 'home';
  });
  const [prevView, setPrevView] = useState<StudioView>('home');

  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editorFilterId, setEditorFilterId] = useState<string | null>(null);
  const [editorFilterIntensity, setEditorFilterIntensity] = useState<number>(100);
  const [boothTemplateId, setBoothTemplateId] = useState<PhotoboothTemplateId>('classic-korean');

  const [savedCreations, setSavedCreations] = useState<SavedCreation[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Restore lightweight template preference from localStorage
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
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const navigateTo = useCallback(
    (view: StudioView) => {
      if (view === 'about') {
        setActiveView('home');
        setTimeout(() => {
          document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
        return;
      }
      setPrevView(activeView);
      setActiveView(view);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [activeView]
  );

  const handleStartWithFilter = (filterId: string) => {
    setSelectedFilterId(filterId);
    navigateTo('filters');
  };

  const handleStartWithTemplate = (templateId: PhotoboothTemplateId) => {
    setBoothTemplateId(templateId);
    navigateTo('photobooth');
  };

  const handleApplyFilterToEditor = (
    imageSrc: string,
    filterId: string,
    intensity: number
  ) => {
    setEditorImageSrc(imageSrc);
    setEditorFilterId(filterId);
    setEditorFilterIntensity(intensity);
    navigateTo('editor');
  };

  const handleEditFrame = (imageSrc: string) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#fffdfe] text-[#2d1b28]">
      <Navbar activeView={activeView} onNavigate={navigateTo} />

      <main className="flex-1 flex flex-col">
        <div key={activeView} className="studio-view-enter flex-1 flex flex-col">
          {activeView === 'home' && (
            <HomePage
              onNavigate={navigateTo}
              onStartWithFilter={handleStartWithFilter}
              onStartWithTemplate={handleStartWithTemplate}
            />
          )}

          {activeView === 'photobooth' && (
            <PhotoboothStudio
              initialTemplateId={boothTemplateId}
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
              onBack={() => navigateTo(prevView === 'editor' ? 'home' : prevView)}
              onSaveCreation={handleSaveCreation}
              onNotify={notify}
            />
          )}

          {activeView === 'collage' && <CollageMaker onNotify={notify} />}

          {activeView === 'creative' && <CreativeCollectionStudio onNotify={notify} />}
        </div>

        {/* Session Saved Creations Shelf (only appears after user saves a creation) */}
        {savedCreations.length > 0 && activeView === 'editor' && (
          <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
            <div className="rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] p-4">
              <h2 className="font-display text-sm font-bold text-[#2d1b28] mb-3">
                Saved in This Session ({savedCreations.length})
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {savedCreations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEditorImageSrc(item.dataUrl)}
                    className="shrink-0 w-24 text-left group cursor-pointer"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden border border-[#f3d5e5] group-hover:border-[#db2777] bg-white">
                      <img
                        src={item.dataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-[#2d1b28] truncate mt-1">
                      {item.title}
                    </p>
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
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
