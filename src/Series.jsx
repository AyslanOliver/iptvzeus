import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Series.css';
import PlayerSeries from './components/PlayerSeries';
import ModalDetalhesSerie from './components/ModalDetalhesSerie';
import Navigation from './components/Navigation';
import { FaSearch, FaPlay, FaFilm, FaVideo, FaCog, FaHeart, FaRegHeart, FaStar, FaRegStar } from 'react-icons/fa';
import { useWatch } from './context/WatchContext';

const Series = () => {
  const navigate = useNavigate();
  const { watchProgress, toggleFavorite: toggleWatchFavorite, updateProgress } = useWatch();
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalSerie, setModalSerie] = useState(null);
  const [selectedSerie, setSelectedSerie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [episodiosDaSerie, setEpisodiosDaSerie] = useState([]);
  const [favoriteSeries, setFavoriteSeries] = useState(() => {
    // Carrega os favoritos do localStorage ao iniciar
    const savedFavorites = localStorage.getItem('seriesFavorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });
  const [playerError, setPlayerError] = useState(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState(() => {
    const savedWatched = localStorage.getItem('watchedEpisodes');
    return savedWatched ? JSON.parse(savedWatched) : [];
  });

  // Carregar categorias de séries da API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) return;
        const response = await fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_series_categories`);
        if (!response.ok) return;
        const data = await response.json();
        setCategories(data.map(cat => ({
          category_id: cat.category_id,
          category_name: cat.category_name
        })));
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchSeries = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('iptvUser'));
      if (!user) {
        navigate('/login');
        return;
      }
      const categoryParam = selectedCategory !== 'all' ? `&category_id=${selectedCategory}` : '';
      const response = await fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_series${categoryParam}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar séries');
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setSeries(data);
      } else {
        setError('Formato de dados inválido');
      }
    } catch (err) {
      console.error('Erro ao carregar séries:', err);
      setError('Erro ao carregar as séries. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, selectedCategory]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // Salva os favoritos no localStorage sempre que houver mudança
  useEffect(() => {
    localStorage.setItem('seriesFavorites', JSON.stringify(favoriteSeries));
  }, [favoriteSeries]);

  // Salva os episódios assistidos no localStorage
  useEffect(() => {
    localStorage.setItem('watchedEpisodes', JSON.stringify(watchedEpisodes));
  }, [watchedEpisodes]);

  const handleSerieClick = (serie) => {
    setModalSerie(serie);
  };

  const handleCloseModal = () => {
    setModalSerie(null);
  };

  const handleAssistir = async (serie, episodio) => {
    console.log('Iniciando reprodução:', { serie, episodio });
    
    try {
      const user = JSON.parse(localStorage.getItem('iptvUser'));
      if (!user) {
        navigate('/login');
        return;
      }

      if (!episodio || !episodio.id) {
        console.error('Episódio inválido:', episodio);
        setPlayerError('Episódio não encontrado');
        return;
      }

      const streamUrl = `http://nxczs.top/series/${user.username}/${user.password}/${episodio.id}.mp4`;
      console.log('URL do stream gerada:', streamUrl);

      // Garante que todos os dados sejam strings ou valores primitivos
      const episodioComUrl = {
        id: String(episodio.id),
        title: String(episodio.title || `Episódio ${episodio.episode_num}`),
        name: String(episodio.title || `Episódio ${episodio.episode_num}`),
        episode_num: String(episodio.episode_num),
        season: String(episodio.season),
        info: String(episodio.info || 'Sem descrição disponível'),
        duration: String(episodio.duration || '0'),
        duration_secs: String(episodio.duration_secs || '0'),
        bitrate: String(episodio.bitrate || '0'),
        url: streamUrl
      };

      // Marca o episódio como assistido
      setWatchedEpisodes(prev => {
        if (!prev.includes(episodio.id)) {
          const newWatched = [...prev, episodio.id];
          localStorage.setItem('watchedEpisodes', JSON.stringify(newWatched));
          return newWatched;
        }
        return prev;
      });

      // Garante que todos os dados da série sejam strings
      const serieCompleta = {
        series_id: String(serie.series_id || ''),
        name: String(serie.name || 'Série sem título'),
        cover: String(serie.cover || 'https://via.placeholder.com/200x300?text=Sem+Imagem'),
        plot: String(serie.plot || 'Sem descrição disponível'),
        year: String(serie.year || 'N/A'),
        genre: String(serie.genre || 'N/A'),
        rating: String(serie.rating || '0'),
        release_date: String(serie.release_date || ''),
        tmdb_id: String(serie.tmdb_id || ''),
        duration: String(serie.duration || '0'),
        duration_secs: String(serie.duration_secs || '0'),
        bitrate: String(serie.bitrate || '0')
      };

      // Remove qualquer propriedade que seja um objeto ou array
      Object.keys(serieCompleta).forEach(key => {
        if (typeof serieCompleta[key] === 'object' || Array.isArray(serieCompleta[key])) {
          delete serieCompleta[key];
        }
      });

      setSelectedSerie(serieCompleta);
      setEpisodiosDaSerie([episodioComUrl]);
      setModalSerie(null);
      
    } catch (error) {
      console.error('Erro ao buscar informações do episódio:', error);
      setPlayerError('Erro ao carregar o episódio');
    }
  };

  const handleClosePlayer = () => {
    setSelectedSerie(null);
    setEpisodiosDaSerie([]);
  };

  const validateStreamUrl = (url) => {
    if (!url) return false;
    
    try {
      // Verifica se a URL começa com http:// ou https://
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.log('URL não começa com http:// ou https://');
        return false;
      }

      // Verifica se a URL tem o formato básico esperado
      const hasValidFormat = url.includes('/series/') && url.endsWith('.mp4');
      if (!hasValidFormat) {
        console.log('URL não tem o formato esperado (/series/ e .mp4)');
        return false;
      }

      return true;
    } catch (e) {
      console.log('Erro ao validar URL:', e);
      return false;
    }
  };

  const handlePlayerError = (error) => {
    console.log('Erro no player:', error);
    let errorMessage = 'Erro ao carregar o vídeo';
    
    if (error.message.includes('URL do stream não encontrada')) {
      errorMessage = 'Não foi possível encontrar o link do vídeo. Por favor, tente novamente mais tarde.';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message.includes('URL inválida')) {
      errorMessage = 'O link do vídeo está inválido ou expirado. Por favor, tente novamente.';
    }
    
  };

  // Função para avançar para o próximo episódio
  const handleNextEpisode = (proximoEpisodio) => {
    console.log('Mudando para próximo episódio:', proximoEpisodio);
    setEpisodiosDaSerie(prevEpisodios => [proximoEpisodio, ...prevEpisodios.slice(0, -1)]);
  };

  const handleProgressUpdate = (episodioId, progress) => {
    updateProgress(episodioId, progress);
  };

  // Função para alternar favorito
  const handleToggleFavorite = (serie) => {
    setFavoriteSeries(prev => {
      const isFavorite = prev.some(fav => fav.series_id === serie.series_id);
      const newFavorites = isFavorite
        ? prev.filter(fav => fav.series_id !== serie.series_id)
        : [...prev, serie];
      
      // Salva imediatamente no localStorage
      localStorage.setItem('seriesFavorites', JSON.stringify(newFavorites));
      
      return newFavorites;
    });
  };

  const isFavorite = (serieId) => {
    return favoriteSeries.some(fav => fav.series_id === serieId);
  };

  const isEpisodeWatched = (episodeId) => {
    return watchedEpisodes.includes(episodeId);
  };

  // Filtrar séries baseado na categoria selecionada
  const filteredSeries = useMemo(() => {
    let result = series;
    
    if (selectedCategory === 'favorites') {
      result = favoriteSeries;
    } else if (selectedCategory !== 'all') {
      result = series.filter(serie => serie.category_id === selectedCategory);
    }
    
    if (searchTerm) {
      result = result.filter(serie => 
        serie.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return result;
  }, [series, selectedCategory, favoriteSeries, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  if (selectedSerie && episodiosDaSerie.length > 0) {
    console.log('Renderizando player com:', { selectedSerie, episodiosDaSerie });
    return (
      <div className="series-container">
        {/* Barra fixa topo */}
        <div className="canais-topbar">
          <div className="titulo">Séries</div>
          <div className="search-box">
            <FaSearch style={{marginRight:8, color:'#ffea70'}} />
            <input
              className="search-input"
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="topbar-actions">
            <button className="topbar-icon" onClick={() => navigate('/')}><FaPlay /></button>
            <button className="topbar-icon" onClick={() => navigate('/filmes')}><FaFilm /></button>
            <button className="topbar-icon" onClick={() => navigate('/series')}><FaVideo /></button>
            <button className="topbar-icon" onClick={() => navigate('/configuracoes')}><FaCog /></button>
          </div>
        </div>

        <div className="series-content">
          {playerError ? (
            <div className="player-error">
              <div className="error-message">
                <h2>Erro ao carregar o vídeo</h2>
                <p>{playerError}</p>
                <div className="error-actions">
                  <button 
                    className="back-button"
                    onClick={handleClosePlayer}
                  >
                    Voltar
                  </button>
                  <button 
                    className="retry-button"
                    onClick={() => {
                      setPlayerError(null);
                      setEpisodiosDaSerie([episodiosDaSerie[0]]);
                    }}
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <PlayerSeries
              serie={{
                series_id: String(selectedSerie.series_id || ''),
                name: String(selectedSerie.name || 'Série sem título'),
                cover: String(selectedSerie.cover || 'https://via.placeholder.com/200x300?text=Sem+Imagem'),
                plot: String(selectedSerie.plot || 'Sem descrição disponível'),
                year: String(selectedSerie.year || 'N/A'),
                genre: String(selectedSerie.genre || 'N/A'),
                rating: String(selectedSerie.rating || '0'),
                release_date: String(selectedSerie.release_date || ''),
                tmdb_id: String(selectedSerie.tmdb_id || ''),
                duration: String(selectedSerie.duration || '0'),
                duration_secs: String(selectedSerie.duration_secs || '0'),
                bitrate: String(selectedSerie.bitrate || '0')
              }}
              episodio={{
                id: String(episodiosDaSerie[0].id),
                title: String(episodiosDaSerie[0].title || ''),
                name: String(episodiosDaSerie[0].name || ''),
                episode_num: String(episodiosDaSerie[0].episode_num || ''),
                season: String(episodiosDaSerie[0].season || ''),
                info: String(episodiosDaSerie[0].info || ''),
                duration: String(episodiosDaSerie[0].duration || '0'),
                duration_secs: String(episodiosDaSerie[0].duration_secs || '0'),
                bitrate: String(episodiosDaSerie[0].bitrate || '0'),
                url: String(episodiosDaSerie[0].url || '')
              }}
              episodios={episodiosDaSerie.map(ep => ({
                id: String(ep.id),
                title: String(ep.title || ''),
                name: String(ep.name || ''),
                episode_num: String(ep.episode_num || ''),
                season: String(ep.season || ''),
                info: String(ep.info || ''),
                duration: String(ep.duration || '0'),
                duration_secs: String(ep.duration_secs || '0'),
                bitrate: String(ep.bitrate || '0'),
                url: String(ep.url || '')
              }))}
              onClose={handleClosePlayer}
              onError={handlePlayerError}
              onNextEpisode={handleNextEpisode}
              onProgressUpdate={handleProgressUpdate}
              initialProgress={watchProgress[episodiosDaSerie[0].id] || 0}
            />
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="series-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando séries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="series-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchSeries}>Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="series-container">
      {/* Barra fixa topo */}
      <div className="canais-topbar">
        <div className="titulo">Séries</div>
        <div className="search-box">
          <FaSearch style={{marginRight:8, color:'#ffea70'}} />
          <input
            className="search-input"
            type="text"
            placeholder="Pesquisar séries..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="topbar-actions">
          <button className="topbar-icon" onClick={() => navigate('/')}><FaPlay /></button>
          <button className="topbar-icon" onClick={() => navigate('/filmes')}><FaFilm /></button>
          <button className="topbar-icon" onClick={() => navigate('/series')}><FaVideo /></button>
          <button className="topbar-icon" onClick={() => navigate('/configuracoes')}><FaCog /></button>
        </div>
      </div>

      <div className="series-content">
        <Navigation />
        <div className="series-sidebar">
          <h2>Categorias</h2>
          <div className="categories-list">
            <button
              key="all"
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Todas
            </button>
            <button
              key="favorites"
              className={`category-btn ${selectedCategory === 'favorites' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('favorites')}
            >
              <FaStar style={{ marginRight: '8px', color: '#ffea70' }} />
              Favoritos
            </button>
            {categories.map((category) => (
              <button
                key={category.category_id}
                className={`category-btn ${selectedCategory === category.category_id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.category_id)}
              >
                {category.category_name}
              </button>
            ))}
          </div>
        </div>

        <div className="series-main">
          <div className="series-grid">
            {filteredSeries.map((serie) => (
              <div key={serie.series_id} className="serie-card" onClick={() => handleSerieClick(serie)}>
                <div className="serie-thumbnail-container">
                  <img
                    src={serie.cover || 'https://via.placeholder.com/200x300?text=Sem+Imagem'}
                    alt={serie.name}
                    className="serie-thumbnail"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/200x300?text=Sem+Imagem';
                      e.target.classList.add('error');
                    }}
                  />
                  <button
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(serie);
                    }}
                  >
                    {favoriteSeries.some(fav => fav.series_id === serie.series_id) ? (
                      <FaStar style={{ color: '#ffea70' }} />
                    ) : (
                      <FaRegStar style={{ color: '#ffea70' }} />
                    )}
                  </button>
                </div>
                <div className="serie-info">
                  <h3>{serie.name}</h3>
                  <p>{serie.year || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalSerie && (
        <ModalDetalhesSerie
          serie={{
            series_id: String(modalSerie.series_id || ''),
            name: String(modalSerie.name || 'Série sem título'),
            cover: String(modalSerie.cover || 'https://via.placeholder.com/200x300?text=Sem+Imagem'),
            plot: String(modalSerie.plot || 'Sem descrição disponível'),
            year: String(modalSerie.year || 'N/A'),
            genre: String(modalSerie.genre || 'N/A'),
            rating: String(modalSerie.rating || '0'),
            release_date: String(modalSerie.release_date || ''),
            tmdb_id: String(modalSerie.tmdb_id || ''),
            duration: String(modalSerie.duration || '0'),
            duration_secs: String(modalSerie.duration_secs || '0'),
            bitrate: String(modalSerie.bitrate || '0')
          }}
          onClose={handleCloseModal}
          onAssistir={handleAssistir}
          isFavorite={isFavorite(modalSerie.series_id)}
          onToggleFavorite={() => handleToggleFavorite(modalSerie)}
          isEpisodeWatched={isEpisodeWatched}
        />
      )}
    </div>
  );
};

export default Series;
  