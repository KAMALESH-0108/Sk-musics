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
