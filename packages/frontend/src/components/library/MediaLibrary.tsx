import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Image, Film, Music, Camera, Loader2, Plus, Check, GripHorizontal, Play, Pause } from 'lucide-react';
import { clsx } from 'clsx';
import { mediaDragState } from '../../services/eventBus';


interface PexelsMedia { id: number; width: number; height: number; url: string; photographer: string; src: { original: string; large: string; medium: string; small: string; tiny: string }; alt: string; }
interface PexelsVideo { id: number; width: number; height: number; url: string; image: string; duration: number; user: { name: string }; video_files: { link: string; quality: string; width: number; height: number }[]; }

const DEMO_IMAGES: PexelsMedia[] = [
  { id: 1, src: { medium: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg', original: '', small: '', tiny: '' }, alt: 'Equipo creativo', photographer: 'Fauxels', width: 400, height: 267, url: '' },
  { id: 2, src: { medium: 'https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg', original: '', small: '', tiny: '' }, alt: 'Trabajo en equipo', photographer: 'Fauxels', width: 400, height: 267, url: '' },
  { id: 3, src: { medium: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg', original: '', small: '', tiny: '' }, alt: 'Programando', photographer: 'Christina Morillo', width: 400, height: 267, url: '' },
  { id: 4, src: { medium: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg', original: '', small: '', tiny: '' }, alt: 'Tecnología', photographer: 'ThisIsEngineering', width: 400, height: 267, url: '' },
  { id: 5, src: { medium: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg', original: '', small: '', tiny: '' }, alt: 'Oficina moderna', photographer: 'Fauxels', width: 400, height: 267, url: '' },
  { id: 6, src: { medium: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg', original: '', small: '', tiny: '' }, alt: 'Freelancer', photographer: 'Christina Morillo', width: 400, height: 267, url: '' },
  { id: 7, src: { medium: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg', original: '', small: '', tiny: '' }, alt: 'Brainstorming', photographer: 'Fauxels', width: 400, height: 267, url: '' },
  { id: 8, src: { medium: 'https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg?auto=compress&cs=tinysrgb&w=400', large: 'https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg', original: '', small: '', tiny: '' }, alt: 'Código', photographer: 'ThisIsEngineering', width: 400, height: 267, url: '' },
];

const DEMO_VIDEOS: PexelsVideo[] = [
  { id: 1, image: 'https://images.pexels.com/videos/3196277/free-video-3196277.jpg?auto=compress&cs=tinysrgb&w=400', url: '', duration: 15, width: 1920, height: 1080, user: { name: 'Pressmaster' }, video_files: [{ link: 'https://videos.pexels.com/video-files/3196277/3196277-hd_1920_1080_25fps.mp4', quality: 'hd', width: 1920, height: 1080 }] },
  { id: 2, image: 'https://images.pexels.com/videos/3254027/free-video-3254027.jpg?auto=compress&cs=tinysrgb&w=400', url: '', duration: 12, width: 1920, height: 1080, user: { name: 'Taryn Elliott' }, video_files: [{ link: 'https://videos.pexels.com/video-files/3254027/3254027-hd_1920_1080_30fps.mp4', quality: 'hd', width: 1920, height: 1080 }] },
  { id: 3, image: 'https://images.pexels.com/videos/4065382/free-video-4065382.jpg?auto=compress&cs=tinysrgb&w=400', url: '', duration: 18, width: 1920, height: 1080, user: { name: 'cottonbro' }, video_files: [{ link: 'https://videos.pexels.com/video-files/4065382/4065382-hd_1920_1080_30fps.mp4', quality: 'hd', width: 1920, height: 1080 }] },
  { id: 4, image: 'https://images.pexels.com/videos/3255275/free-video-3255275.jpg?auto=compress&cs=tinysrgb&w=400', url: '', duration: 20, width: 1920, height: 1080, user: { name: 'Alena Darmel' }, video_files: [{ link: 'https://videos.pexels.com/video-files/3255275/3255275-hd_1920_1080_30fps.mp4', quality: 'hd', width: 1920, height: 1080 }] },
  { id: 5, image: 'https://images.pexels.com/videos/3255271/free-video-3255271.jpg?auto=compress&cs=tinysrgb&w=400', url: '', duration: 22, width: 1920, height: 1080, user: { name: 'Mike' }, video_files: [{ link: 'https://videos.pexels.com/video-files/3255271/3255271-hd_1920_1080_30fps.mp4', quality: 'hd', width: 1920, height: 1080 }] },
  { id: 6, image: 'https://images.pexels.com/videos/3255278/free-video-3255278.jpg?auto=compress&cs=tinysrgb&w=400', url: '', duration: 11, width: 1920, height: 1080, user: { name: 'Anna' }, video_files: [{ link: 'https://videos.pexels.com/video-files/3255278/3255278-hd_1920_1080_30fps.mp4', quality: 'hd', width: 1920, height: 1080 }] },
];

const DEMO_MUSIC = [
  { id: 1, name: 'Cinematic Epic', bpm: 120, duration: 180, mood: 'Épico', source: 'Pixabay' },
  { id: 2, name: 'LoFi Chill', bpm: 85, duration: 240, mood: 'Relajado', source: 'Pixabay' },
  { id: 3, name: 'Upbeat Corporate', bpm: 128, duration: 150, mood: 'Energético', source: 'Pixabay' },
  { id: 4, name: 'Ambient Dream', bpm: 90, duration: 200, mood: 'Ambiental', source: 'Pixabay' },
  { id: 5, name: 'Rock Energy', bpm: 140, duration: 160, mood: 'Enérgico', source: 'Pixabay' },
  { id: 6, name: 'Jazz Lounge', bpm: 100, duration: 220, mood: 'Sofisticado', source: 'Pixabay' },
  { id: 7, name: 'Piano Emotional', bpm: 72, duration: 190, mood: 'Emotivo', source: 'Pixabay' },
  { id: 8, name: 'Electronic Pulse', bpm: 130, duration: 175, mood: 'Moderno', source: 'Pixabay' },
];

const TABS = [
  { id: 'images', icon: Image, label: 'Imágenes' },
  { id: 'videos', icon: Film, label: 'Videos' },
  { id: 'music', icon: Music, label: 'Música' },
  { id: 'uploads', icon: Camera, label: 'Subidos' },
];

export function MediaLibrary({ onSelect, onClose }: { onSelect?: (url: string) => void; onClose?: () => void }) {
  const [tab, setTab] = useState('images');
  const [search, setSearch] = useState('');
  const [images, setImages] = useState<any[]>(DEMO_IMAGES);
  const [videos, setVideos] = useState<any[]>(DEMO_VIDEOS);
  const [music, setMusic] = useState<any[]>(DEMO_MUSIC);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [musicSearch, setMusicSearch] = useState('');

  const searchPexels = useCallback(async (query: string, type: 'photo' | 'video') => {
    if (!query.trim()) {
      if (type === 'photo') setImages(DEMO_IMAGES);
      else setVideos(DEMO_VIDEOS);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('vb_token');
      const endpoint = `/api/assets/pexels?query=${encodeURIComponent(query)}&type=${type}`;
      const resp = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const json = await resp.json();
        const data = json.data;
        if (data) {
          if (type === 'photo') setImages(data.photos || DEMO_IMAGES);
          else setVideos(data.videos || DEMO_VIDEOS);
        }
      }
    } catch { /* keep demos */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === 'images') searchPexels(search, 'photo');
      else if (tab === 'videos') searchPexels(search, 'video');
    }, 400);
    return () => clearTimeout(t);
  }, [search, tab, searchPexels]);

  const handleDrag = (e: React.DragEvent, item: any, type: string) => {
    const data: any = { type, alt: item.alt || item.name };
    if (type === 'image') { data.url = item.src?.large || item.src?.medium; data.thumb = item.src?.medium; data.photographer = item.photographer; }
    else if (type === 'video') { data.url = item.video_files?.[0]?.link || ''; data.thumb = item.image; data.duration = item.duration; }
    else if (type === 'music') { data.name = item.name; data.bpm = item.bpm; data.mood = item.mood; data.duration = item.duration; }
    // Store both in dataTransfer AND global for reliability
    const json = JSON.stringify(data);
    e.dataTransfer.setData('text/plain', json);
    e.dataTransfer.setData('application/json', json);
    e.dataTransfer.effectAllowed = 'copy';
    mediaDragState.current = data;
  };

  const filteredMusic = music.filter(m => !musicSearch || m.name.toLowerCase().includes(musicSearch.toLowerCase()) || m.mood.toLowerCase().includes(musicSearch.toLowerCase()));

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-edge">
        <h2 className="text-sm font-semibold text-text-primary">Biblioteca</h2>
        {onClose && <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover"><X className="w-4 h-4 text-text-muted" /></button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-surface-edge">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', tab === t.id ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover')}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {(tab === 'images' || tab === 'videos') && (
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'images' ? 'Buscar imágenes...' : 'Buscar videos...'}
              className="w-full pl-9 pr-4 py-2 bg-surface-raised border border-surface-edge rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-all" />
          </div>
        </div>
      )}

      {/* Music search */}
      {tab === 'music' && (
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" value={musicSearch} onChange={(e) => setMusicSearch(e.target.value)}
              placeholder="Buscar música..."
              className="w-full pl-9 pr-4 py-2 bg-surface-raised border border-surface-edge rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-all" />
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="px-4 pb-1">
        <p className="text-2xs text-text-muted flex items-center gap-1"><GripHorizontal className="w-3 h-3" />Arrastra al canvas o a una escena</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-accent-blue animate-spin" /></div>
        ) : (
          <>
            {/* Images Grid */}
            {tab === 'images' && (
              <div className="grid grid-cols-2 gap-3">
                {images.map((img: any) => (
                  <div key={img.id}
                    draggable onDragStart={(e: any) => handleDrag(e, img, 'image')}
                    onClick={() => {
                      setSelected(selected === img.id ? null : img.id);
                      onSelect?.(img.src?.large || img.src?.medium);
                    }}
                    className={clsx('relative group rounded-xl overflow-hidden border-2 transition-all bg-surface-raised cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-[0.98]', selected === img.id ? 'border-accent-blue ring-2 ring-accent-blue/20' : 'border-transparent hover:border-surface-hover')}>
                    <div className="absolute top-1.5 left-1.5 z-10 p-0.5 rounded bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"><GripHorizontal className="w-3 h-3 text-white/70" /></div>
                    <img src={img.src.medium} alt={img.alt} className="w-full aspect-video object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                      <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-all">
                        {selected === img.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-[10px] text-white/80 truncate">{img.photographer || 'Pexels'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Videos Grid */}
            {tab === 'videos' && (
              <div className="grid grid-cols-2 gap-3">
                {videos.map((vid: any) => (
                  <div key={vid.id}
                    draggable onDragStart={(e: any) => handleDrag(e, vid, 'video')}
                    className="relative group rounded-xl overflow-hidden border-2 border-transparent hover:border-surface-hover transition-all bg-surface-raised cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute top-1.5 left-1.5 z-10 p-0.5 rounded bg-black/30 opacity-0 group-hover:opacity-100"><GripHorizontal className="w-3 h-3 text-white/70" /></div>
                    <img src={vid.image} alt="" className="w-full aspect-video object-cover" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play className="w-5 h-5 text-white fill-white" /></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-[10px] text-white/80">{vid.user?.name || 'Pexels'} · {vid.duration}s</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Music List */}
            {tab === 'music' && (
              <div className="space-y-2">
                {filteredMusic.map((track: any) => (
                  <div key={track.id}
                    draggable onDragStart={(e: any) => handleDrag(e, track, 'music')}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised border border-surface-edge hover:border-surface-hover transition-all cursor-grab active:cursor-grabbing group hover:scale-[1.01] active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-accent-violet" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{track.name}</p>
                      <p className="text-2xs text-text-muted">{track.mood} · {track.bpm} BPM · {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}</p>
                    </div>
                    <GripHorizontal className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {/* Uploads (empty state) */}
            {tab === 'uploads' && (
              <div className="flex flex-col items-center justify-center h-60 text-text-muted">
                <Camera className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium mb-1">Sin archivos</p>
                <p className="text-xs">Arrastra archivos desde tu PC al canvas</p>
              </div>
            )}
          </>
        )}

        {/* No results */}
        {!loading && ((tab === 'images' && images.length === 0) || (tab === 'videos' && videos.length === 0)) && (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <Image className="w-10 h-10 mb-2 opacity-30" /><p className="text-xs">Sin resultados</p>
          </div>
        )}

        <div className="mt-4 p-3 rounded-xl bg-accent-blue/5 border border-accent-blue/10">
          <p className="text-2xs text-text-muted leading-relaxed">
            Contenido de Pexels. Arrastra cualquier elemento al canvas para crear una escena.
          </p>
        </div>
      </div>
    </div>
  );
}
