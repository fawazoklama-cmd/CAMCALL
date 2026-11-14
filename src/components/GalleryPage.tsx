import {
  AlertTriangle,
  Download,
  FileJson,
  FolderOpen,
  Heart,
  History,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import type {
  GalleryPhotoRecord,
  LocalProjectRecord,
  UsageHistoryRecord,
} from '../types/settings';
import {
  clearPhotosFromDb,
  deletePhotoFromDb,
  deleteProjectFromDb,
  getAllPhotosFromDb,
  getAllProjectsFromDb,
  getHistoryDb,
  saveProjectToDb,
  togglePhotoFavoriteDb,
} from '../utils/localDb';

interface GalleryPageProps {
  onOpenPhotoInEditor: (dataUrl: string) => void;
  onOpenProject: (project: LocalProjectRecord) => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

type GalleryTab = 'photos' | 'favorites' | 'projects' | 'history';

export function GalleryPage({
  onOpenPhotoInEditor,
  onOpenProject,
  onNotify,
}: GalleryPageProps) {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<GalleryTab>('photos');
  const [photos, setPhotos] = useState<GalleryPhotoRecord[]>([]);
  const [projects, setProjects] = useState<LocalProjectRecord[]>([]);
  const [history, setHistory] = useState<UsageHistoryRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const refreshData = useCallback(async () => {
    const [pRows, prRows, hRows] = await Promise.all([
      getAllPhotosFromDb(),
      getAllProjectsFromDb(),
      getHistoryDb(),
    ]);
    setPhotos(pRows);
    setProjects(prRows);
    setHistory(hRows);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleDownloadPhoto = (photo: GalleryPhotoRecord) => {
    const link = document.createElement('a');
    link.download = `${photo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${photo.format || 'png'}`;
    link.href = photo.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(t.notifications.downloaded);
  };

  const handleToggleFav = async (id: string) => {
    await togglePhotoFavoriteDb(id);
    await refreshData();
  };

  const handleDeletePhoto = async (id: string) => {
    await deletePhotoFromDb(id);
    await refreshData();
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProjectFromDb(id);
    await refreshData();
  };

  const handleExportProject = (project: LocalProjectRecord) => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.camcall.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<LocalProjectRecord>;
        if (!parsed.stateJson || !parsed.kind) {
          onNotify('Invalid CAMCALL project JSON.', 'info');
          return;
        }
        await saveProjectToDb({
          title: parsed.title || file.name.replace(/\.json$/i, ''),
          kind: parsed.kind,
          thumbnailUrl: parsed.thumbnailUrl || '',
          stateJson: parsed.stateJson,
        });
        await refreshData();
        setActiveTab('projects');
        onNotify(t.notifications.savedProject);
      } catch {
        onNotify('Could not read project file.', 'info');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearGallery = async () => {
    await clearPhotosFromDb();
    await refreshData();
    setConfirmClear(false);
    onNotify(t.notifications.tempCleared, 'info');
  };

  const favoritePhotos = photos.filter((p) => p.favorite);
  const displayPhotos = activeTab === 'favorites' ? favoritePhotos : photos;

  return (
    <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-6">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportProject}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#db2777] mb-1">{t.gallery.kicker}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.gallery.title}
          </h1>
          <p className="text-sm opacity-75 mt-1">{t.gallery.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface border hover:border-[#db2777] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#7c3aed]" />
            <span>{t.gallery.importProject}</span>
          </button>
          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface border hover:border-rose-400 text-xs font-semibold text-rose-600 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.gallery.clearGallery}</span>
            </button>
          )}
        </div>
      </div>

      {/* Local Data Privacy Warning */}
      <div className="rounded-2xl camcall-surface-soft border px-4 py-3 flex items-start gap-3 text-xs sm:text-sm">
        <AlertTriangle className="w-4 h-4 text-[#db2777] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="opacity-85 leading-relaxed">{t.gallery.privacyWarning}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'photos', label: `${t.gallery.tabs.photos} (${photos.length})`, Icon: ImageIcon },
            { id: 'favorites', label: `${t.gallery.tabs.favorites} (${favoritePhotos.length})`, Icon: Heart },
            { id: 'projects', label: `${t.gallery.tabs.projects} (${projects.length})`, Icon: FolderOpen },
            { id: 'history', label: `${t.gallery.tabs.history} (${history.length})`, Icon: History },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === id
                ? 'bg-[#db2777] text-white shadow-xs'
                : 'camcall-surface-soft border hover:border-[#db2777]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Photos / Favorites Grid */}
      {(activeTab === 'photos' || activeTab === 'favorites') &&
        (displayPhotos.length === 0 ? (
          <div className="rounded-3xl camcall-surface border p-10 text-center text-sm opacity-75">
            {activeTab === 'favorites' ? t.gallery.emptyFavorites : t.gallery.emptyPhotos}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPhotos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-2xl camcall-surface border p-3 flex flex-col gap-2.5"
              >
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/5">
                  <img
                    src={photo.dataUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold truncate">{photo.title}</p>
                  <p className="text-[11px] opacity-65">
                    {photo.source} · {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDownloadPhoto(photo)}
                    className="flex-1 py-1.5 px-2 rounded-lg camcall-btn-primary text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>{photo.format.toUpperCase()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPhotoInEditor(photo.dataUrl)}
                    className="py-1.5 px-2 rounded-lg camcall-surface-soft border text-[11px] font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label="Toggle favorite"
                    onClick={() => handleToggleFav(photo.id)}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      photo.favorite
                        ? 'bg-[#fce7f3] border-[#db2777] text-[#db2777]'
                        : 'camcall-surface-soft'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${photo.favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    aria-label={t.gallery.deleteItem}
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="p-1.5 rounded-lg camcall-surface-soft border text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Saved Projects */}
      {activeTab === 'projects' &&
        (projects.length === 0 ? (
          <div className="rounded-3xl camcall-surface border p-10 text-center text-sm opacity-75">
            {t.gallery.emptyProjects}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-2xl camcall-surface border p-4 flex flex-col gap-3"
              >
                {proj.thumbnailUrl && (
                  <div className="aspect-[16/10] rounded-xl overflow-hidden bg-black/5">
                    <img
                      src={proj.thumbnailUrl}
                      alt={proj.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-[#7c3aed] uppercase">{proj.kind}</p>
                  <h2 className="font-display text-base font-bold truncate">{proj.title}</h2>
                  <p className="text-xs opacity-65">
                    {new Date(proj.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj)}
                    className="flex-1 py-2 px-3 rounded-xl camcall-btn-primary text-xs font-semibold cursor-pointer"
                  >
                    {t.gallery.openProject}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportProject(proj)}
                    className="py-2 px-3 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>{t.gallery.exportProject}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={t.gallery.deleteItem}
                    onClick={() => handleDeleteProject(proj.id)}
                    className="p-2 rounded-xl camcall-surface-soft border text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Recent Activity */}
      {activeTab === 'history' &&
        (history.length === 0 ? (
          <div className="rounded-3xl camcall-surface border p-10 text-center text-sm opacity-75">
            {t.gallery.emptyHistory}
          </div>
        ) : (
          <div className="rounded-3xl camcall-surface border divide-y divide-current/10">
            {history.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-md camcall-surface-soft border text-[11px] font-semibold uppercase">
                    {item.kind}
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </div>
                <span className="text-xs opacity-65 font-mono">
                  {new Date(item.usedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ))}

      {/* Clear Confirmation Modal */}
      {confirmClear && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="max-w-md w-full rounded-3xl camcall-surface border p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">{t.gallery.confirmClearTitle}</h3>
            <p className="text-sm opacity-80">{t.gallery.confirmClearDesc}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold cursor-pointer"
              >
                {t.gallery.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleClearGallery}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                {t.gallery.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
