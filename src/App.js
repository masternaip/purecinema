

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Film, XCircle, Loader2, Star, StarOff, Heart, HeartOff, PlayCircle } from 'lucide-react'; // Added PlayCircle for trailers

// TMDB API Configuration
const API_KEY = '7e863169c39e42ac68d117c538af97fc';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const YOUTUBE_EMBED_URL = 'https://www.youtube.com/embed/';

// Main App component
const App = () => {
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState('');
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [genres, setGenres] = useState({}); // State to store genre ID to name mapping
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [favoriteMovies, setFavoriteMovies] = useState(() => {
    // Load favorites from local storage on initial render
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const genreMap = {};
        data.genres.forEach(genre => {
          genreMap[genre.id] = genre.name;
        });
        setGenres(genreMap);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('Failed to load genres.');
      }
    };
    fetchGenres();
  }, []);

  // Function to fetch movies (popular or search results)
  const fetchMovies = useCallback(async (url, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${url}&page=${page}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMovies(data.results);
      setCurrentPage(data.page);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError('Failed to fetch movies. Please try again later.');
      console.error('Fetch movies error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  // Fetch popular movies on initial component mount or page change
  useEffect(() => {
    if (searchTerm.trim() === '') {
      fetchMovies(`${BASE_URL}/movie/popular?api_key=${API_KEY}`, currentPage);
    } else {
      fetchMovies(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(searchTerm)}`, currentPage);
    }
  }, [currentPage, fetchMovies, searchTerm]); // Re-fetch when page or search term changes

  // Function to handle movie search
  const handleSearch = (e) => {
    e.preventDefault();
    setRecommendations(''); // Clear recommendations on new search
    setCurrentPage(1); // Reset to first page on new search
    // The useEffect above will trigger the actual fetch based on searchTerm and currentPage
  };

  // Function to get movie recommendations using Gemini API
  const getMovieRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    setRecommendations('');
    try {
      let chatHistory = [];
      const prompt = `Suggest a few popular movie titles that are similar in genre or theme to "${selectedMovie.title}". Provide only the movie titles, separated by commas.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = ""; // Canvas will provide this at runtime
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

  // Helper function to get genre names from IDs
  const getGenreNames = (genreIds) => {
    if (!genreIds || genreIds.length === 0) return 'N/A';
    return genreIds.map(id => genres[id] || 'Unknown').join(', ');
  };

  // Function to add/remove movie from favorites
  const toggleFavorite = (movie) => {
    setFavoriteMovies(prevFavorites => {
      const isFavorite = prevFavorites.some(fav => fav.id === movie.id);
      if (isFavorite) {
        return prevFavorites.filter(fav => fav.id !== movie.id);
      } else {
        return [...prevFavorites, movie];
      }
    });
  };

  // Movie Card Component
  const MovieCard = ({ movie, onClick, isFavorite, onToggleFavorite }) => (
    <div
      className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 cursor-pointer flex flex-col relative"
    >
      <img
        src={movie.poster_path ? `${IMG_URL}${movie.poster_path}` : `https://placehold.co/300x450/CCCCCC/333333?text=${encodeURIComponent(movie.title)}`}
        alt={movie.title}
        className="w-full h-72 object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://placehold.co/300x450/CCCCCC/333333?text=${encodeURIComponent(movie.title)}`;
        }}
        onClick={() => onClick(movie)} // Click image/card to open details
      />
      <button
        className="absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-50 text-white hover:text-red-500 transition-colors duration-200"
        onClick={(e) => {
          e.stopPropagation(); // Prevent opening modal when clicking favorite button
          onToggleFavorite(movie);
        }}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {isFavorite ? <Heart size={24} fill="red" stroke="red" /> : <Heart size={24} />}
      </button>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{movie.title}</h3>
        <p className="text-gray-600 text-sm">Year: {movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'}</p>
      </div>
    </div>
  );

  // Movie Detail Modal Component
  const MovieDetailModal = ({ movie, onClose, onGetRecommendations, recommendations, isGeneratingRecommendations, genresMap }) => {
    const [selectedServer, setSelectedServer] = useState('vidsrc.cc'); // Default server for streaming
    const [embedUrl, setEmbedUrl] = useState('');
    const [detailedMovie, setDetailedMovie] = useState(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(true);
    const [videos, setVideos] = useState([]); // State for movie trailers/videos
    const [playingVideoKey, setPlayingVideoKey] = useState(null); // Key of the video currently playing

    // Fetch full movie details and videos when modal opens
    useEffect(() => {
      const fetchMovieData = async () => {
        setIsFetchingDetails(true);
        try {
          // Fetch detailed movie info
          const detailResponse = await fetch(`${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}`);
          if (!detailResponse.ok) {
            throw new Error(`HTTP error! status: ${detailResponse.status}`);
          }
          const detailData = await detailResponse.json();
          setDetailedMovie(detailData);

          // Fetch movie videos
          const videoResponse = await fetch(`${BASE_URL}/movie/${movie.id}/videos?api_key=${API_KEY}`);
          if (!videoResponse.ok) {
            throw new Error(`HTTP error! status: ${videoResponse.status}`);
          }
          const videoData = await videoResponse.json();

          // Filter for "Official Trailer" only
          const officialTrailers = videoData.results.filter(
            video => video.site === 'YouTube' && video.type === 'Trailer' && video.name.toLowerCase().includes('official trailer')
          );

          setVideos(officialTrailers);

          // Automatically play the first official trailer if any
          if (officialTrailers.length > 0) {
            setPlayingVideoKey(officialTrailers[0].key);
          } else {
            setPlayingVideoKey(null); // No official trailer found
          }

        } catch (err) {
          console.error('Error fetching detailed movie data or videos:', err);
          setDetailedMovie(null); // Or show an error message in modal
          setVideos([]);
          setPlayingVideoKey(null);
        } finally {
          setIsFetchingDetails(false);
        }
      };
      if (movie) {
        fetchMovieData();
      }
    }, [movie]);

    // Function to generate the embed URL for streaming based on server and movie ID
    const generateEmbedUrl = (server, mediaType, tmdbId) => {
      let url = "";
      if (server === "vidsrc.cc") {
        url = `https://vidsrc.cc/v2/embed/${mediaType}/${tmdbId}`;
      } else if (server === "player.videasy.net") { // Removed vidsrc.me
        url = `https://player.videasy.net/${mediaType}/${tmdbId}`;
      }
      return url;
    };

    // Update embed URL for streaming when selected server or movie changes
    useEffect(() => {
      if (movie) {
        // Assuming 'movie' type for all entries from current TMDB endpoints
        const mediaType = "movie";
        const newEmbedUrl = generateEmbedUrl(selectedServer, mediaType, movie.id);
        setEmbedUrl(newEmbedUrl);
      }
    }, [selectedServer, movie]);

    // Determine which movie object to use for display (detailed if available, otherwise basic)
    const movieToDisplay = detailedMovie || movie;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors duration-200"
          >
            <XCircle size={28} />
          </button>
          {isFetchingDetails ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={60} />
              <p className="text-2xl text-blue-600 ml-4">Loading movie details and trailers...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <img
                    src={movieToDisplay.poster_path ? `${IMG_URL}${movieToDisplay.poster_path}` : `https://placehold.co/300x450/CCCCCC/333333?text=${encodeURIComponent(movieToDisplay.title)}`}
                    alt={movieToDisplay.title}
                    // Adjusted for responsiveness: w-full on small screens, w-48 on md and up
                    className="w-full h-72 object-cover rounded-md shadow-md mx-auto md:w-48 md:mx-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/300x450/CCCCCC/333333?text=${encodeURIComponent(movieToDisplay.title)}`;
                    }}
                  />
                </div>
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{movieToDisplay.title} ({movieToDisplay.release_date ? movieToDisplay.release_date.substring(0, 4) : 'N/A'})</h2>
                  {movieToDisplay.tagline && <p className="text-gray-600 italic mb-2">"{movieToDisplay.tagline}"</p>}
                  <p className="text-gray-700 mb-2">
                    <strong>Genre:</strong> {movieToDisplay.genres ? movieToDisplay.genres.map(g => g.name).join(', ') : getGenreNames(movieToDisplay.genre_ids)}
                  </p>
                  {movieToDisplay.runtime && <p className="text-gray-700 mb-2"><strong>Runtime:</strong> {movieToDisplay.runtime} minutes</p>}
                  <p className="text-gray-700 mb-4"><strong>TMDB Rating:</strong> {movieToDisplay.vote_average ? movieToDisplay.vote_average.toFixed(1) : 'N/A'}</p>
                  <p className="text-gray-800 leading-relaxed">{movieToDisplay.overview || 'No plot summary available.'}</p>

                  <div className="mt-6">
                    <button
                      onClick={onGetRecommendations}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors duration-300 flex items-center justify-center"
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
                      <div className="mt-4 p-3 bg-blue-50 rounded-md text-blue-800 text-sm">
                        <strong>Recommendations:</strong> {recommendations}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Streaming Player Section - Moved Up */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Watch Full Movie</h3>
                <div className="flex items-center gap-3 mb-4">
                  <label htmlFor="server-select" className="text-lg text-gray-700 font-medium">Choose Server:</label>
                  <select
                    id="server-select"
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    value={selectedServer}
                    onChange={(e) => setSelectedServer(e.target.value)}
                  >
                    <option value="vidsrc.cc">vidsrc.cc</option>
                    {/* Removed vidsrc.me option */}
                    <option value="player.videasy.net">player.videasy.net</option>
                  </select>
                </div>
                {embedUrl ? (
                  <div className="relative w-full rounded-lg overflow-hidden shadow-xl" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                    <iframe
                      id="modal-video"
                      src={embedUrl}
                      title={`${movieToDisplay.title} streaming player`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    ></iframe>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-lg">Select a server to load the movie player.</p>
                )}
              </div>

              {/* Trailer Section - Moved Down */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Trailers & Videos</h3>
                {videos.length > 0 && playingVideoKey ? (
                  <>
                    <div className="relative w-full rounded-lg overflow-hidden shadow-xl mb-4" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                      <iframe
                        src={`${YOUTUBE_EMBED_URL}${playingVideoKey}?autoplay=1`}
                        title={`${movieToDisplay.title} trailer`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      ></iframe>
                    </div>
                    {/* Only show button if there are multiple official trailers, otherwise it's redundant */}
                    {videos.length > 1 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {videos.map(video => (
                          <button
                            key={video.key}
                            onClick={() => setPlayingVideoKey(video.key)}
                            className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                              ${playingVideoKey === video.key ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                            `}
                          >
                            <PlayCircle size={18} className="mr-2" /> {video.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-center text-gray-500 text-lg">No official trailers available for this movie.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 shadow-xl">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
          <h1 className="text-4xl font-extrabold flex items-center gap-3 mb-4 md:mb-0">
            <Film size={40} className="text-yellow-300" />
            Movie Explorer
          </h1>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <input
              type="text"
              placeholder="Search for movies..."
              className="p-3 rounded-l-full border-none outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 w-full md:w-80 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-r-full flex items-center justify-center shadow-md transition-colors duration-300"
            >
              <Search size={24} />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 py-10">
        {error && (
          <div className="text-center text-red-600 text-xl p-8 bg-red-100 rounded-lg shadow-md mb-8">
            <p>{error}</p>
          </div>
        )}

        {/* Favorites Section */}
        {favoriteMovies.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Heart size={30} fill="red" stroke="red" className="mr-3" /> Your Favorites
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {favoriteMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={setSelectedMovie}
                  isFavorite={true} // Always true for favorites section
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        )}

        {/* Movie Listings Section */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            {searchTerm ? `Search Results for "${searchTerm}"` : 'Popular Movies'}
          </h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={60} />
              <p className="text-2xl text-blue-600 ml-4">Loading movies...</p>
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center text-gray-600 text-xl p-8 bg-white rounded-lg shadow-md">
              <p>No movies found. Try a different search term!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={setSelectedMovie}
                    isFavorite={favoriteMovies.some(fav => fav.id === movie.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-10">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-lg font-semibold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => {
            setSelectedMovie(null);
            setRecommendations(''); // Clear recommendations when closing modal
          }}
          onGetRecommendations={getMovieRecommendations}
          recommendations={recommendations}
          isGeneratingRecommendations={isGeneratingRecommendations}
          genresMap={genres} // Pass genres map to modal
        />
      )}
    </div>
  );
};

export default App;
