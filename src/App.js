import React, { useState, useEffect, useCallback, memo } from 'react';
import { Search, Film, XCircle, Loader2, Heart, PlayCircle, Tv } from 'lucide-react'; // Added Tv icon

// TMDB API Configuration
const API_KEY = 'da80c6061b9b01930faedca7692e9a83'; // <<< IMPORTANT: Updated with your new TMDB API Key!
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500'; // Standard size for list images
const BANNER_IMG_URL = 'https://image.tmdb.org/t/p/original'; // Large size for banner
const YOUTUBE_EMBED_URL = 'https://www.youtube.com/embed/'; // Global constant for YouTube embeds

// Debounce function to limit how often a function is called
const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

// Media Card Component (remains memoized for performance)
const MediaCard = memo(({ media, onClick, isFavorite, onToggleFavorite }) => {
  const mediaTitle = media.title || media.name;
  const mediaYear = media.release_date ? media.release_date.substring(0, 4) : (media.first_air_date ? media.first_air_date.substring(0, 4) : 'N/A');

  return (
    <div
      className="group bg-gray-900 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer flex flex-col relative"
    >
      <div className="relative w-full h-72">
        <img
          src={media.poster_path ? `${IMG_URL}${media.poster_path}` : `https://placehold.co/300x450/333333/999999?text=${encodeURIComponent(mediaTitle)}`}
          alt={mediaTitle}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/300x450/333333/999999?text=${encodeURIComponent(mediaTitle)}`;
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center">
          <button
            className="absolute top-3 right-3 p-2 rounded-full bg-black bg-opacity-60 text-white hover:text-red-500 transition-colors duration-200 z-10"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(media);
            }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? <Heart size={20} fill="red" stroke="red" /> : <Heart size={20} />}
          </button>
          <button
            className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => onClick(media)}
            aria-label={`View details for ${mediaTitle}`}
          >
            <PlayCircle size={60} className="text-white opacity-80 hover:opacity-100 transition-opacity" fill="currentColor" />
          </button>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between text-white">
        <h3 className="text-lg font-semibold mb-1 leading-tight">{mediaTitle}</h3>
        <p className="text-gray-400 text-sm">Year: {mediaYear}</p>
      </div>
    </div>
  );
});

// Media Detail Modal Component (now defined outside App component)
const MediaDetailModal = ({ media, onClose, onGetRecommendations, recommendations, isGeneratingRecommendations, genresMap }) => {
  const [selectedServer, setSelectedServer] = useState('vidsrc.cc');
  const [embedUrl, setEmbedUrl] = useState('');
  const [detailedMedia, setDetailedMedia] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(true);
  const [videos, setVideos] = useState([]);
  const [playingVideoKey, setPlayingVideoKey] = useState(null);

  useEffect(() => {
    const fetchMediaData = async () => {
      setIsFetchingDetails(true);
      try {
        const detailEndpoint = media.media_type === 'movie' ? `/movie/${media.id}` : `/tv/${media.id}`;
        const detailResponse = await fetch(`${BASE_URL}${detailEndpoint}?api_key=${API_KEY}`);
        if (!detailResponse.ok) {
          throw new Error(`HTTP error! status: ${detailResponse.status} from ${detailEndpoint}`);
        }
        const detailData = await detailResponse.json();
        setDetailedMedia(detailData);

        const videoEndpoint = media.media_type === 'movie' ? `/movie/${media.id}/videos` : `/tv/${media.id}/videos`;
        const videoResponse = await fetch(`${BASE_URL}${videoEndpoint}?api_key=${API_KEY}`);
        if (!videoResponse.ok) {
          throw new Error(`HTTP error! status: ${videoResponse.status} from ${videoEndpoint}`);
        }
        const videoData = await videoResponse.json();

        const officialTrailers = videoData.results.filter(
          video => video.site === 'YouTube' && video.type === 'Trailer' && video.name.toLowerCase().includes('official trailer')
        );

        setVideos(officialTrailers);

        if (officialTrailers.length > 0) {
          setPlayingVideoKey(officialTrailers[0].key);
        } else {
          setPlayingVideoKey(null);
        }

      } catch (err) {
        console.error('Error fetching detailed media data or videos:', err);
        setDetailedMedia(null);
        setVideos([]);
        setPlayingVideoKey(null);
      } finally {
        setIsFetchingDetails(false);
      }
    };
    if (media) {
      fetchMediaData();
    }
  }, [media]);

  const generateEmbedUrl = (server, mediaType, tmdbId) => {
    let url = "";
    if (server === "vidsrc.cc") {
      url = `https://vidsrc.cc/v2/embed/${mediaType}/${tmdbId}`;
    } else if (server === "player.videasy.net") {
      url = `https://player.videasy.net/${mediaType}/${tmdbId}`;
    }
    return url;
  };

  useEffect(() => {
    if (media) {
      const newEmbedUrl = generateEmbedUrl(selectedServer, media.media_type, media.id);
      setEmbedUrl(newEmbedUrl);
    }
  }, [selectedServer, media]);

  const mediaToDisplay = detailedMedia || media;
  const itemTitle = mediaToDisplay.title || mediaToDisplay.name;
  const itemYear = mediaToDisplay.release_date ? mediaToDisplay.release_date.substring(0, 4) : (mediaToDisplay.first_air_date ? mediaToDisplay.first_air_date.substring(0, 4) : 'N/A');
  const itemOverview = mediaToDisplay.overview || 'No plot summary available.';
  const itemGenres = mediaToDisplay.genres ? mediaToDisplay.genres.map(g => g.name).join(', ') : genresMap(mediaToDisplay.genre_ids); // Use genresMap prop
  const itemRuntime = mediaToDisplay.runtime ? `${mediaToDisplay.runtime} minutes` : (mediaToDisplay.episode_run_time && mediaToDisplay.episode_run_time.length > 0 ? `${mediaToDisplay.episode_run_time[0]} minutes/episode` : 'N/A');
  const itemRating = mediaToDisplay.vote_average ? mediaToDisplay.vote_average.toFixed(1) : 'N/A';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative text-gray-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors duration-200"
          aria-label="Close modal"
        >
          <XCircle size={28} />
        </button>
        {isFetchingDetails ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-red-600" size={60} />
            <p className="text-2xl text-red-600 ml-4">Loading details...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-6 mb-8 pb-6 border-b border-gray-700">
              <div className="flex-shrink-0 w-full md:w-48">
                <img
                  src={mediaToDisplay.poster_path ? `${BANNER_IMG_URL}${mediaToDisplay.poster_path}` : `https://placehold.co/300x450/333333/999999?text=${encodeURIComponent(itemTitle)}`}
                  alt={itemTitle}
                  className="w-full h-72 object-cover rounded-lg shadow-md mx-auto md:mx-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/300x450/333333/999999?text=${encodeURIComponent(itemTitle)}`;
                  }}
                />
              </div>
              <div className="flex-grow">
                <h2 className="text-3xl font-bold text-white mb-2">{itemTitle} ({itemYear})</h2>
                {mediaToDisplay.tagline && <p className="text-gray-300 italic mb-2">"{mediaToDisplay.tagline}"</p>}
                <p className="text-gray-300 mb-2">
                  <strong>Genre:</strong> {itemGenres}
                </p>
                <p className="text-gray-300 mb-2"><strong>Runtime:</strong> {itemRuntime}</p>
                <p className="text-gray-300 mb-4"><strong>TMDB Rating:</strong> {itemRating}</p>
                <div className="mt-6">
                  <button
                    onClick={() => onGetRecommendations(media.media_type, itemTitle)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-md shadow-md transition-colors duration-300 flex items-center justify-center text-base"
                    disabled={isGeneratingRecommendations}
                  >
                    {isGeneratingRecommendations ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={20} />
                        Generating...
                      </>
                    ) : (
                      'Get Recommendations'
                    )}
                  </button>
                  {recommendations && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg text-gray-200 text-sm border border-gray-700">
                      <strong>Recommendations:</strong> {recommendations}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Streaming Player Section */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-2xl font-bold mb-4 text-white">Watch Full {media.media_type === 'movie' ? 'Movie' : 'TV Show'}</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <label htmlFor="server-select" className="text-lg text-gray-300 font-medium whitespace-nowrap">Choose Server:</label>
                <select
                  id="server-select"
                  className="p-2 border border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-gray-100 bg-gray-800 w-full sm:w-auto"
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(e.target.value)}
                >
                  <option value="vidsrc.cc">vidsrc.cc</option>
                  <option value="player.videasy.net">player.videasy.net</option>
                </select>
              </div>
              {embedUrl ? (
                <div className="relative w-full rounded-lg overflow-hidden shadow-xl" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                  <iframe
                    id="modal-video"
                    src={embedUrl}
                    title={`${itemTitle} streaming player`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                  ></iframe>
                </div>
              ) : (
                <p className="text-center text-gray-400 text-lg p-4 bg-gray-800 rounded-lg">Select a server to load the {media.media_type === 'movie' ? 'movie' : 'TV show'} player.</p>
              )}
            </div>

            {/* Trailer Section */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-2xl font-bold mb-4 text-white">Official Trailer</h3>
              {videos.length > 0 && playingVideoKey ? (
                <>
                  <div className="relative w-full rounded-lg overflow-hidden shadow-xl mb-4" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                    <iframe
                      src={`${YOUTUBE_EMBED_URL}${playingVideoKey}?autoplay=1`}
                      title={`${itemTitle} official trailer`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    ></iframe>
                  </div>
                  {videos.length > 1 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {videos.map(video => (
                        <button
                          key={video.key}
                          onClick={() => setPlayingVideoKey(video.key)}
                          className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                            ${playingVideoKey === video.key ? 'bg-red-600 text-white shadow-md' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
                          `}
                        >
                          <PlayCircle size={18} className="mr-2" /> {video.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-400 text-lg p-4 bg-gray-800 rounded-lg">No official trailers available for this {media.media_type === 'movie' ? 'movie' : 'TV show'}.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// Main App component
const App = () => {
  const [popularMovies, setPopularMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [trendingTvShows, setTrendingTvShows] = useState([]);
  // Removed: const [trendingAnimeMovies, setTrendingAnimeMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mainContentLoading, setMainContentLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [tvLoading, setTvLoading] = useState(false);
  const [trendingTvLoading, setTrendingTvLoading] = useState(false);
  // Removed: const [trendingAnimeLoading, setTrendingAnimeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState('');
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [genres, setGenres] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentView, setCurrentView] = useState('home');
  const [favoriteMovies, setFavoriteMovies] = useState(() => {
    try {
      const storedFavorites = localStorage.getItem('favoriteMovies');
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (e) {
      console.error("Failed to parse favorites from localStorage", e);
      return [];
    }
  });

  // Effect to save favorites to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('favoriteMovies', JSON.stringify(favoriteMovies));
    } catch (e) {
      console.error("Failed to save favorites to localStorage", e);
    }
  }, [favoriteMovies]);

  // Fetch genres on component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} from /genre/movie/list`);
        }
        const data = await response.json();
        const genreMap = {};
        data.genres.forEach(genre => {
          genreMap[genre.id] = genre.name;
        });
        setGenres(genreMap);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError(`Failed to load genres: ${err.message}. Some categorized sections might not be available.`);
      }
    };
    fetchGenres();
  }, []);

  // Generic fetch function for different media types
  const fetchData = useCallback(async (endpoint, setter, setLoadingState, page = 1, mediaTypeOverride = null, query = '') => {
    setLoadingState(true);
    try {
      let url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&page=${page}`;
      if (query) {
        url += `&query=${encodeURIComponent(query)}`;
      }
      console.log('Fetching from URL:', url); // Debugging: Log the URL being fetched
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from ${endpoint}`);
      }
      const data = await response.json();
      console.log(`Fetched data from ${endpoint}:`, data.results); // Debugging: Log the results
      const itemsWithMediaType = data.results.map(item => ({
        ...item,
        media_type: item.media_type || mediaTypeOverride || (item.media_type || (endpoint.includes('/movie') || endpoint.includes('/discover/movie') ? 'movie' : 'tv'))
      }));
      setter(itemsWithMediaType);
      if (setter === setPopularMovies && query.trim() !== '') {
        setCurrentPage(data.page);
        setTotalPages(data.total_pages);
      }
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}. Please check your API key and network connection.`);
      console.error(`Fetch error from ${endpoint}:`, err);
      setter([]);
    } finally {
      setLoadingState(false);
    }
  }, []);

  // Fetch popular movies
  const fetchPopularMovies = useCallback((page) => {
    fetchData('/movie/popular', setPopularMovies, setMainContentLoading, page, 'movie');
  }, [fetchData]);

  // Fetch trending movies (now daily)
  const fetchTrendingMovies = useCallback(() => {
    fetchData('/trending/movie/day', setTrendingMovies, setTrendingLoading, 1); // Changed to /trending/movie/day
  }, [fetchData]);

  // Fetch popular TV shows
  const fetchTvShows = useCallback(() => {
    fetchData('/tv/popular', setTvShows, setTvLoading, 1, 'tv');
  }, [fetchData]);

  // Fetch Trending TV Shows
  const fetchTrendingTvShows = useCallback(() => {
    fetchData('/trending/tv/week', setTrendingTvShows, setTrendingTvLoading, 1, 'tv');
  }, [fetchData]);

  // Removed: fetchTrendingAnimeMovies

  // Debounced function to update debouncedSearchValue
  const updateDebouncedSearchValue = useCallback(
    debounce((value) => {
      console.log('Debounced search value updated to:', value); // Debugging
      setDebouncedSearchValue(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  // Effect to trigger data fetches when currentView, page, or debouncedSearchValue changes
  useEffect(() => {
    if (currentView === 'home') {
      setError(null);
      if (debouncedSearchValue.trim() === '') {
        console.log('Fetching default home content...'); // Debugging
        fetchPopularMovies(currentPage);
        fetchTrendingMovies(); // Now fetches daily trending movies
        fetchTvShows();
        fetchTrendingTvShows();
        // Removed: fetchTrendingAnimeMovies();
      } else {
        console.log('Triggering search for:', debouncedSearchValue); // Debugging
        fetchData(`/search/multi`, setPopularMovies, setMainContentLoading, currentPage, null, debouncedSearchValue);
      }
    }
  }, [currentPage, debouncedSearchValue, currentView, fetchPopularMovies, fetchTrendingMovies, fetchTvShows, fetchTrendingTvShows, fetchData]); // Removed fetchTrendingAnimeMovies from dependencies

  const handleSearchInputChange = (e) => {
    console.log('Search input changed:', e.target.value); // Debugging
    setSearchTerm(e.target.value);
    updateDebouncedSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setRecommendations('');
    setCurrentPage(1);
    setCurrentView('home');
    // The actual fetch is handled by the useEffect watching debouncedSearchValue
  };

  const handleTabChange = (view) => {
    setCurrentView(view);
    setSearchTerm('');
    setDebouncedSearchValue('');
    setCurrentPage(1);
    setRecommendations('');
    setSelectedMedia(null);
  };

  const getMediaRecommendations = async (mediaType, title) => {
    setIsGeneratingRecommendations(true);
    setRecommendations('');
    try {
      let chatHistory = [];
      const prompt = `Suggest a few popular ${mediaType === 'movie' ? 'movie' : 'TV show'} titles that are similar in genre or theme to "${title}". Provide only the titles, separated by commas.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setRecommendations(text);
      } else {
        setRecommendations('Could not fetch recommendations.');
        console.error('Gemini API response error:', result);
      }
    } catch (err) {
      setRecommendations('Error generating recommendations.');
      console.error('Gemini API call error:', err);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const getGenreNames = (genreIds) => {
    if (!genreIds || genreIds.length === 0) return 'N/A';
    return genreIds.map(id => genres[id] || 'Unknown').join(', ');
  };

  const toggleFavorite = (media) => {
    setFavoriteMovies(prevFavorites => {
      const isFavorite = prevFavorites.some(fav => fav.id === media.id && fav.media_type === media.media_type);
      if (isFavorite) {
        return prevFavorites.filter(fav => !(fav.id === media.id && fav.media_type === media.media_type));
      } else {
        return [...prevFavorites, media];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-800 text-gray-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-gray-900 text-white p-6 md:p-8 shadow-xl z-50">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
          <h1 className="text-4xl md:text-5xl font-extrabold flex items-center gap-3 mb-4 md:mb-0 text-red-600">
            <Film size={44} className="text-red-600" />
            NETFLIX
          </h1>
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto max-w-md">
            <input
              type="text"
              placeholder="Search for movies or TV shows..."
              className="p-3 rounded-l-full border-none outline-none focus:ring-2 focus:ring-red-600 text-gray-900 w-full shadow-inner placeholder-gray-500 bg-gray-200"
              value={searchTerm}
              onChange={handleSearchInputChange}
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-r-full flex items-center justify-center shadow-md transition-colors duration-300"
              aria-label="Search movies"
            >
              <Search size={24} />
            </button>
          </form>
        </div>
        {/* Navigation Tabs */}
        <nav className="container mx-auto mt-6">
          <ul className="flex justify-center space-x-4">
            <li>
              <button
                onClick={() => handleTabChange('home')}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300
                  ${currentView === 'home' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
                `}
              >
                Home
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange('favorites')}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300
                  ${currentView === 'favorites' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
                `}
              >
                Favorites
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 py-10 pt-32 pb-20">
        {error && (
          <div className="text-center text-red-500 text-xl p-8 bg-gray-900 rounded-lg shadow-md mb-8 border border-red-700">
            <p>{error}</p>
          </div>
        )}

        {currentView === 'home' && (
          <>
            {/* Popular Movies Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Popular Movies</h2>
              {mainContentLoading && popularMovies.length === 0 && debouncedSearchValue.trim() === '' ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="animate-spin text-red-600" size={40} />
                  <p className="text-xl text-red-600 ml-4">Loading popular movies...</p>
                </div>
              ) : popularMovies.length === 0 && debouncedSearchValue.trim() === '' ? (
                <div className="text-center text-gray-400 text-xl p-8 bg-gray-900 rounded-lg shadow-md">
                  <p>No popular movies found.</p>
                </div>
              ) : popularMovies.length === 0 && debouncedSearchValue.trim() !== '' ? (
                <div className="text-center text-gray-400 text-xl p-8 bg-gray-900 rounded-lg shadow-md">
                  <p>No results found for "{debouncedSearchValue}". Please try a different search term.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {popularMovies.map((media) => (
                      <MediaCard
                        key={media.id}
                        media={media}
                        onClick={setSelectedMedia}
                        isFavorite={favoriteMovies.some(fav => fav.id === media.id && fav.media_type === media.media_type)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls for Popular/Search */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-10">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-full shadow-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                      >
                        Previous
                      </button>
                      <span className="text-lg font-semibold text-gray-200">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-full shadow-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Trending Movies Section (Now Daily) */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Trending Movies (Today)</h2>
              {trendingLoading && trendingMovies.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="animate-spin text-red-600" size={40} />
                  <p className="text-xl text-red-600 ml-4">Loading trending movies...</p>
                </div>
              ) : trendingMovies.length === 0 ? (
                <div className="text-center text-gray-400 text-xl p-8 bg-gray-900 rounded-lg shadow-md">
                  <p>No trending movies found for today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {trendingMovies.map((media) => (
                    <MediaCard
                      key={media.id}
                      media={media}
                      onClick={setSelectedMedia}
                      isFavorite={favoriteMovies.some(fav => fav.id === media.id && fav.media_type === media.media_type)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Removed: Trending Animation Movies Section */}

            {/* Popular TV Shows Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                <Tv size={30} className="text-red-600 mr-3" /> Popular TV Shows
              </h2>
              {tvLoading && tvShows.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="animate-spin text-red-600" size={40} />
                  <p className="text-xl text-red-600 ml-4">Loading TV shows...</p>
                </div>
              ) : tvShows.length === 0 ? (
                <div className="text-center text-gray-400 text-xl p-8 bg-gray-900 rounded-lg shadow-md">
                  <p>No popular TV shows found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {tvShows.map((media) => (
                    <MediaCard
                      key={media.id}
                      media={media}
                      onClick={setSelectedMedia}
                      isFavorite={favoriteMovies.some(fav => fav.id === media.id && fav.media_type === media.media_type)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Trending TV Shows Section */}
            <section>
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                <Tv size={30} className="text-red-600 mr-3" /> Trending TV Shows
              </h2>
              {trendingTvLoading && trendingTvShows.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="animate-spin text-red-600" size={40} />
                  <p className="text-xl text-red-600 ml-4">Loading trending TV shows...</p>
                </div>
              ) : trendingTvShows.length === 0 ? (
                <div className="text-center text-gray-400 text-xl p-8 bg-gray-900 rounded-lg shadow-md">
                  <p>No trending TV shows found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {trendingTvShows.map((media) => (
                    <MediaCard
                      key={media.id}
                      media={media}
                      onClick={setSelectedMedia}
                      isFavorite={favoriteMovies.some(fav => fav.id === media.id && fav.media_type === media.media_type)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {currentView === 'favorites' && (
          <section>
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              <Heart size={30} fill="red" stroke="red" className="mr-3" /> Your Favorites
            </h2>
            {favoriteMovies.length === 0 ? (
              <div className="text-center text-gray-400 text-xl p-8 bg-gray-900 rounded-lg shadow-md">
                <p>You haven't added any movies or TV shows to your favorites yet!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {favoriteMovies.map((media) => (
                  <MediaCard
                    key={`${media.id}-${media.media_type}`} // Use combined key for uniqueness
                    media={media}
                    onClick={setSelectedMedia}
                    isFavorite={true} // Always true for favorites section
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          onClose={() => {
            setSelectedMedia(null);
            setRecommendations('');
          }}
          onGetRecommendations={getMediaRecommendations}
          recommendations={recommendations}
          isGeneratingRecommendations={isGeneratingRecommendations}
          genresMap={getGenreNames} // Pass the helper function as a prop
        />
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 p-4 text-center shadow-lg mt-10">
        <div className="container mx-auto text-sm md:text-base">
          &copy; {new Date().getFullYear()} NETFLIX Clone. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default App;
