import { Song } from '../store/usePlayerStore';

const JIOSAAVN_API_BASE = 'https://jiosaavn-api-privatecvc2.vercel.app/search/songs';

export const fetchTamilMusic = async (query: string = 'tamil', limit: number = 20): Promise<Song[]> => {
  try {
    const response = await fetch(`${JIOSAAVN_API_BASE}?query=${encodeURIComponent(query)}&limit=${limit}`);
    const json = await response.json();
    
    if (json.status !== 'SUCCESS' || !json.data || !json.data.results) {
      return [];
    }

    return json.data.results.map((track: any) => {
      // Get highest quality image
      const image = track.image && track.image.length > 0 
        ? track.image[track.image.length - 1].link 
        : '';
        
      // Get highest quality audio
      const downloadUrl = track.downloadUrl && track.downloadUrl.length > 0
        ? track.downloadUrl[track.downloadUrl.length - 1].link
        : '';

      return {
        id: track.id,
        title: track.name.replace(/&quot;/g, '"'),
        artist: track.primaryArtists,
        album: track.album?.name?.replace(/&quot;/g, '"') || '',
        artworkUrl: image,
        previewUrl: downloadUrl, // Now it's the full song URL
      };
    }).filter((song: Song) => song.previewUrl); // Ensure we only get playable songs
  } catch (error) {
    console.error('Failed to fetch music:', error);
    return [];
  }
};

export const fetchRecommendations = async (history: Song[], likedSongs: Song[]): Promise<Song[]> => {
  try {
    // Extract artists and genres from history and liked songs
    const artists = new Set<string>();
    const keywords = new Set<string>();
    
    [...history, ...likedSongs].forEach(song => {
      if (song.artist) {
        song.artist.split(',').forEach(a => artists.add(a.trim()));
      }
      if (song.title) {
        keywords.add(song.title.split(' ')[0]); // Simple keyword extraction
      }
    });

    const artistList = Array.from(artists).slice(0, 3);
    const keywordList = Array.from(keywords).slice(0, 2);
    
    let query = 'tamil hit songs';
    if (artistList.length > 0) {
      query = `tamil ${artistList.join(' ')}`;
    } else if (keywordList.length > 0) {
      query = `tamil ${keywordList.join(' ')}`;
    }

    return await fetchTamilMusic(query, 15);
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return [];
  }
};
