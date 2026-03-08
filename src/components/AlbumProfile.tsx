import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Loader2, Music } from 'lucide-react';
import { fetchAlbumDetails } from '../services/api';
import { usePlayerStore, Song } from '../store/usePlayerStore';
import { useNavigationStore } from '../store/useNavigationStore';
import { useLibraryStore } from '../store/useLibraryStore';

export const AlbumProfile = () => {
  const { selectedAlbumId, setSelectedAlbumId } = useNavigationStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const { addToHistory } = useLibraryStore();
  
  const [album, setAlbum] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedAlbumId) return;

    const loadAlbum = async () => {
      setLoading(true);
      try {
        const albumData = await fetchAlbumDetails(selectedAlbumId);
        setAlbum(albumData);
      } catch (error) {
        console.error("Failed to load album", error);
      } finally {
        setLoading(false);
      }
    };

    loadAlbum();
  }, [selectedAlbumId]);

  if (!selectedAlbumId) return null;

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        <Loader2 size={48} className="text-red-500 animate-spin" />
      </motion.div>
    );
  }

  if (!album) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white"
      >
        <p>Album not found</p>
        <button onClick={() => setSelectedAlbumId(null)} className="mt-4 px-4 py-2 bg-zinc-800 rounded-full">Go Back</button>
      </motion.div>
    );
  }

  const handleSongClick = (song: Song, index: number) => {
    setCurrentSong(song);
    setQueue(album.songs);
    addToHistory(song);
  };

  const handlePlayAll = () => {
    if (album.songs.length > 0) {
      setCurrentSong(album.songs[0]);
      setQueue(album.songs);
      addToHistory(album.songs[0]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 bg-black overflow-y-auto pb-24"
    >
      {/* Header Image */}
      <div className="relative h-72 md:h-96 w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
        <img 
          src={album.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80'} 
          alt={album.name}
          className="w-full h-full object-cover"
        />
        
        {/* Back Button */}
        <motion.button 
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setSelectedAlbumId(null)}
          className="absolute top-safe pt-4 left-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft size={24} />
        </motion.button>

        {/* Album Info Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tight">{album.name}</h1>
          <div className="flex items-center gap-4 text-zinc-300 text-sm">
            {album.primaryArtists && (
              <span className="font-medium text-white">
                {album.primaryArtists}
              </span>
            )}
            {album.year && <span>• {album.year}</span>}
            {album.songCount && <span>• {album.songCount} Songs</span>}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-10">
        {/* Play Button */}
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
            onClick={handlePlayAll}
            className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-600/30"
          >
            <Play size={24} fill="currentColor" className="ml-1" />
          </motion.button>
          <span className="text-zinc-400 font-medium uppercase tracking-wider text-sm">Play Album</span>
        </div>

        {/* Songs */}
        {album.songs && album.songs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Music size={24} className="text-red-500" />
              Tracklist
            </h2>
            <div className="space-y-2">
              {album.songs.map((song: Song, index: number) => (
                <motion.div 
                  key={song.id}
                  onClick={() => handleSongClick(song, index)}
                  whileHover={{ scale: 1.01, x: 5 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-4 p-2 rounded-xl hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                >
                  <span className="w-6 text-center text-zinc-500 font-medium group-hover:hidden">{index + 1}</span>
                  <Play size={16} className="w-6 text-red-500 hidden group-hover:block" fill="currentColor" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{song.title}</h3>
                    <p className="text-zinc-400 text-sm truncate">{song.artist}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
};
