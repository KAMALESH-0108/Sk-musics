import { Song } from '../store/usePlayerStore';

const JIOSAAVN_API_BASE = 'https://jiosaavn-api-privatecvc2.vercel.app/search/songs';

export const fetchTamilMusic = async (query: string = 'tamil', limit: number = 20): Promise<Song[]> => {
  try {
    const targetUrl = `${JIOSAAVN_API_BASE}?query=${encodeURIComponent(query)}&limit=${limit}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
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
        title: track.name ? String(track.name).replace(/&quot;/g, '"') : 'Unknown Title',
        artist: track.primaryArtists || 'Unknown Artist',
        album: track.album?.name ? String(track.album.name).replace(/&quot;/g, '"') : '',
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

export interface ArtistDetails {
  id: string;
  name: string;
  image: string;
  followerCount: string;
  fanCount: string;
  bio: any[];
  dob: string;
  twitter: string;
  fb: string;
  wiki: string;
}

export const fetchArtistDetails = async (artistId: string): Promise<ArtistDetails | null> => {
  try {
    const targetUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists?id=${artistId}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    
    if (json.status !== 'SUCCESS' || !json.data) {
      return null;
    }

    const data = json.data;
    const image = data.image && data.image.length > 0 
      ? data.image[data.image.length - 1].link 
      : '';

    return {
      id: data.id,
      name: data.name,
      image,
      followerCount: data.followerCount,
      fanCount: data.fanCount,
      bio: data.bio,
      dob: data.dob,
      twitter: data.twitter,
      fb: data.fb,
      wiki: data.wiki
    };
  } catch (error) {
    console.error('Failed to fetch artist details:', error);
    return null;
  }
};

export const fetchArtistSongs = async (artistId: string, page: number = 1): Promise<Song[]> => {
  try {
    const targetUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/songs?page=${page}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    
    if (!json.data || !json.data.results) {
      return [];
    }

    return json.data.results.map((track: any) => {
      const image = track.image && track.image.length > 0 
        ? track.image[track.image.length - 1].link 
        : '';
        
      const downloadUrl = track.downloadUrl && track.downloadUrl.length > 0
        ? track.downloadUrl[track.downloadUrl.length - 1].link
        : '';

      return {
        id: track.id,
        title: track.name ? String(track.name).replace(/&quot;/g, '"') : 'Unknown Title',
        artist: track.primaryArtists || 'Unknown Artist',
        album: track.album?.name ? String(track.album.name).replace(/&quot;/g, '"') : '',
        artworkUrl: image,
        previewUrl: downloadUrl,
      };
    }).filter((song: Song) => song.previewUrl);
  } catch (error) {
    console.error('Failed to fetch artist songs:', error);
    return [];
  }
};

export const fetchArtistAlbums = async (artistId: string, page: number = 1): Promise<any[]> => {
  try {
    const targetUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/albums?page=${page}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    
    if (!json.data || !json.data.results) {
      return [];
    }

    return json.data.results.map((album: any) => {
      const image = album.image && album.image.length > 0 
        ? album.image[album.image.length - 1].link 
        : '';

      return {
        id: album.id,
        name: album.name ? String(album.name).replace(/&quot;/g, '"') : 'Unknown Album',
        year: album.year,
        image,
      };
    });
  } catch (error) {
    console.error('Failed to fetch artist albums:', error);
    return [];
  }
};

export const fetchAlbumDetails = async (albumId: string): Promise<any> => {
  try {
    const targetUrl = `https://jiosaavn-api-privatecvc2.vercel.app/albums?id=${albumId}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    
    if (!json.data) {
      return null;
    }

    const data = json.data;
    const image = data.image && data.image.length > 0 
      ? data.image[data.image.length - 1].link 
      : '';

    const songs = (data.songs || []).map((track: any) => {
      const trackImage = track.image && track.image.length > 0 
        ? track.image[track.image.length - 1].link 
        : image;
        
      const downloadUrl = track.downloadUrl && track.downloadUrl.length > 0
        ? track.downloadUrl[track.downloadUrl.length - 1].link
        : '';

      return {
        id: track.id,
        title: track.name ? String(track.name).replace(/&quot;/g, '"') : 'Unknown Title',
        artist: track.primaryArtists || 'Unknown Artist',
        album: track.album?.name ? String(track.album.name).replace(/&quot;/g, '"') : data.name,
        artworkUrl: trackImage,
        previewUrl: downloadUrl,
      };
    }).filter((song: Song) => song.previewUrl);

    return {
      id: data.id,
      name: data.name ? String(data.name).replace(/&quot;/g, '"') : 'Unknown Album',
      year: data.year,
      image,
      primaryArtists: data.primaryArtists,
      songCount: data.songCount,
      songs
    };
  } catch (error) {
    console.error('Failed to fetch album details:', error);
    return null;
  }
};

export const searchArtists = async (query: string): Promise<any[]> => {
  try {
    const targetUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/artists?query=${encodeURIComponent(query)}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    
    if (!json.data || !json.data.results) {
      return [];
    }

    return json.data.results.map((artist: any) => {
      const image = artist.image && artist.image.length > 0 
        ? artist.image[artist.image.length - 1].link 
        : '';

      return {
        id: artist.id,
        name: artist.name,
        image,
        role: artist.role
      };
    });
  } catch (error) {
    console.error('Failed to search artists:', error);
    return [];
  }
};
