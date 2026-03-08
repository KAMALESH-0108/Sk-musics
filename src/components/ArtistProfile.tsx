import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, Users, Disc, Info, ExternalLink } from 'lucide-react';
import { fetchArtistDetails, fetchArtistSongs, fetchArtistAlbums, ArtistDetails, searchArtists } from '../services/api';
import { Song, usePlayerStore } from '../store/usePlayerStore';
import { useNavigationStore } from '../store/useNavigationStore';

export const ArtistProfile: React.FC = () => {
  const { selectedArtistId, setSelectedArtistId } = useNavigationStore();
  const { setQueue, setCurrentSong, play } = usePlayerStore();
  
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [relatedArtists, setRelatedArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedArtistId) return;

    const loadArtistData = async () => {
      setIsLoading(true);
      try {
        const details = await fetchArtistDetails(selectedArtistId);
        setArtist(details);

        if (details) {
          const [artistSongs, artistAlbums] = await Promise.all([
            fetchArtistSongs(selectedArtistId),
            fetchArtistAlbums(selectedArtistId)
          ]);
          setSongs(artistSongs);
          setAlbums(artistAlbums);

          // Fetch related artists by searching for the artist's name and taking other results
          // Or by extracting artists from their top songs
          const related = new Map();
          artistSongs.forEach(song => {
            const songArtists = song.artist.split(',').map(a => a.trim());
            songArtists.forEach(a => {
              if (a.toLowerCase() !== details.name.toLowerCase() && !related.has(a)) {
                related.set(a, true);
              }
            });
          });

          const relatedNames = Array.from(related.keys()).slice(0, 5);
          const relatedArtistsData = await Promise.all(
            relatedNames.map(name => searchArtists(name).then(res => res[0]))
          );
          
          setRelatedArtists(relatedArtistsData.filter(Boolean));
        }
      } catch (error) {
        console.error('Error loading artist data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadArtistData();
  }, [selectedArtistId]);

  if (!selectedArtistId) return null;

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      setCurrentSong(songs[0]);
      play();
    }
  };

  const handleSongClick = (song: Song, index: number) => {
    setQueue(songs);
    setCurrentSong(song);
    play();
  };

  const handleArtistClick = (id: string) => {
    setSelectedArtistId(id);
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </motion.div>
    );
  }

  if (!artist) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white"
      >
        <p>Artist not found</p>
        <button onClick={() => setSelectedArtistId(null)} className="mt-4 px-4 py-2 bg-zinc-800 rounded-full">Go Back</button>
      </motion.div>
    );
  }

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
          src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80'} 
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        
        {/* Back Button */}
        <button 
          onClick={() => setSelectedArtistId(null)}
          className="absolute top-safe pt-4 left-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Artist Info Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tight">{artist.name}</h1>
          <div className="flex items-center gap-4 text-zinc-300 text-sm">
            {artist.followerCount && (
              <span className="flex items-center gap-1">
                <Users size={16} />
                {parseInt(artist.followerCount).toLocaleString()} Followers
              </span>
            )}
            {artist.dob && <span>Born: {artist.dob}</span>}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-10">
        {/* Play Button */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePlayAll}
            className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-600/30 hover:scale-105 transition-transform"
          >
            <Play size={24} fill="currentColor" className="ml-1" />
          </button>
          <span className="text-zinc-400 font-medium uppercase tracking-wider text-sm">Play Top Songs</span>
        </div>

        {/* Top Songs */}
        {songs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Top Songs</h2>
            <div className="space-y-2">
              {songs.slice(0, 5).map((song, index) => (
                <motion.div 
                  key={song.id}
                  onClick={() => handleSongClick(song, index)}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-2 rounded-xl hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                >
                  <span className="w-6 text-center text-zinc-500 font-medium group-hover:hidden">{index + 1}</span>
                  <Play size={16} className="w-6 text-red-500 hidden group-hover:block" fill="currentColor" />
                  <img src={song.artworkUrl} alt={song.title} className="w-12 h-12 rounded-md object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{song.title}</h3>
                    <p 
                      className="text-zinc-400 text-sm truncate hover:text-white transition-colors cursor-pointer inline-block"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const results = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://jiosaavn-api-privatecvc2.vercel.app/search/albums?query=${song.album}`)}`).then(res => res.json());
                          if (results.data && results.data.results && results.data.results.length > 0) {
                            useNavigationStore.getState().setSelectedAlbumId(results.data.results[0].id);
                          }
                        } catch (err) {
                          console.error("Failed to find album", err);
                        }
                      }}
                    >
                      {song.album}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Disc size={24} className="text-red-500" />
              Discography
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
              {albums.map((album) => (
                <motion.div 
                  key={album.id} 
                  onClick={() => useNavigationStore.getState().setSelectedAlbumId(album.id)}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex-none w-36 md:w-48 group cursor-pointer"
                >
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-lg group-hover:shadow-2xl group-hover:shadow-red-500/20 transition-all">
                    <img 
                      src={album.image} 
                      alt={album.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={32} className="text-white" fill="currentColor" />
                    </div>
                  </div>
                  <h3 className="text-white font-medium truncate text-sm">{album.name}</h3>
                  <p className="text-zinc-400 text-xs mt-1">{album.year}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Related Artists */}
        {relatedArtists.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={24} className="text-red-500" />
              Fans Also Like
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
              {relatedArtists.map((relArtist) => (
                <div 
                  key={relArtist.id} 
                  onClick={() => handleArtistClick(relArtist.id)}
                  className="flex-none w-32 md:w-40 group cursor-pointer text-center"
                >
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-full mx-auto w-28 md:w-36">
                    <img 
                      src={relArtist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80'} 
                      alt={relArtist.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="text-white font-medium truncate text-sm px-2">{relArtist.name}</h3>
                  <p className="text-zinc-500 text-xs mt-1 capitalize">{relArtist.role || 'Artist'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Biography */}
        {(artist.bio && artist.bio.length > 0) || artist.wiki ? (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Info size={24} className="text-red-500" />
              About
            </h2>
            <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800/50">
              {artist.bio && artist.bio.length > 0 ? (
                <div className="text-zinc-300 leading-relaxed text-sm md:text-base space-y-4">
                  {artist.bio.map((paragraph: any, i: number) => (
                    <p key={i}>{typeof paragraph === 'string' ? paragraph : paragraph.text}</p>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 italic">Biography not available.</p>
              )}
              
              {artist.wiki && (
                <a 
                  href={artist.wiki} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
                >
                  Read more on Wikipedia <ExternalLink size={14} />
                </a>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </motion.div>
  );
};
