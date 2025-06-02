import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Series.css';
import PlayerSeries from './components/PlayerSeries';
import ModalDetalhesSerie from './components/ModalDetalhesSerie';
import Navigation from './components/Navigation';
import { FaSearch, FaPlay, FaFilm, FaVideo, FaCog, FaHeart, FaRegHeart } from 'react-icons/fa';
import { useWatch } from './context/WatchContext';

const Series = () => {
  const navigate = useNavigate();
  const { watchProgress, favorites, continueWatching, updateProgress, toggleFavorite, addToContinueWatching } = useWatch();
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSerie, setSelectedSerie] = useState(null);
  const [selectedEpisodio, setSelectedEpisodio] = useState(null);
  const [modalSerie, setModalSerie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playerError, setPlayerError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [episodiosDaSerie, setEpisodiosDaSerie] = useState([]);

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

      setPlayerError(null);

      const streamUrl = `http://nxczs.top/series/${user.username}/${user.password}/${episodio.id}.mp4`;
      console.log('URL do stream gerada:', streamUrl);

      const episodioComUrl = {
        ...episodio,
        url: streamUrl
      };

      // Adiciona à lista de "Continuar assistindo"
      addToContinueWatching({
        id: episodio.id,
        serieId: serie.series_id,
        serieName: serie.name,
        episodioName: episodio.title || episodio.name,
        thumbnail: serie.cover,
        progress: watchProgress[episodio.id] || 0
      });

      setSelectedSerie(serie);
      setSelectedEpisodio(episodioComUrl);
      setModalSerie(null);
      
    } catch (error) {
      console.error('Erro ao buscar informações do episódio:', error);
      setPlayerError('Erro ao carregar o vídeo. Por favor, tente novamente.');
    }
  };

  const handleClosePlayer = () => {
    setSelectedSerie(null);
    setSelectedEpisodio(null);
    setPlayerError(null);
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
    
    setPlayerError(errorMessage);
  };

  // Função para avançar para o próximo episódio
  const handleNextEpisode = (proximoEpisodio) => {
    console.log('Mudando para próximo episódio:', proximoEpisodio);
    setSelectedEpisodio(proximoEpisodio);
  };

  const handleProgressUpdate = (episodioId, progress) => {
    updateProgress(episodioId, progress);
  };

  const handleToggleFavorite = (serie) => {
    toggleFavorite({
      id: serie.series_id,
      name: serie.name,
      thumbnail: serie.cover,
      type: 'series'
    });
  };

  const isFavorite = (serieId) => {
    return favorites.some(fav => fav.id === serieId);
  };

  const filteredSeries = selectedCategory === 'all'
    ? series
    : series.filter(serie => serie.category_id === selectedCategory);

  // Adiciona filtro de busca
  const searchedSeries = searchTerm
    ? filteredSeries.filter(serie => 
        serie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (serie.category_name && serie.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : filteredSeries;

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  if (selectedSerie && selectedEpisodio) {
    console.log('Renderizando player com:', { selectedSerie, selectedEpisodio });
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
                      // Força o player a tentar carregar novamente
                      setSelectedEpisodio({...selectedEpisodio});
                    }}
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <PlayerSeries
              serie={selectedSerie}
              episodio={selectedEpisodio}
              onClose={handleClosePlayer}
              onError={handlePlayerError}
              episodios={episodiosDaSerie}
              onNextEpisode={handleNextEpisode}
              onProgressUpdate={handleProgressUpdate}
              initialProgress={watchProgress[selectedEpisodio.id] || 0}
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
          {continueWatching.length > 0 && (
            <div className="continue-watching-section">
              <h2>Continuar Assistindo</h2>
              <div className="continue-watching-grid">
                {continueWatching.map(item => (
                  <div key={item.id} className="continue-watching-item" onClick={() => handleAssistir(
                    { series_id: item.serieId, name: item.serieName },
                    { id: item.id, name: item.episodioName }
                  )}>
                    <img src={item.thumbnail} alt={item.serieName} />
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="continue-watching-info">
                      <h3>{item.serieName}</h3>
                      <p>{item.episodioName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="series-grid">
            {searchedSeries.map(serie => (
              <div key={serie.series_id} className="serie-card">
                <div className="serie-thumbnail" onClick={() => handleSerieClick(serie)}>
                  <img src={serie.cover} alt={serie.name} />
                  <button 
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(serie);
                    }}
                  >
                    {isFavorite(serie.series_id) ? <FaHeart /> : <FaRegHeart />}
                  </button>
                </div>
                <div className="serie-info">
                  <h3>{serie.name}</h3>
                  {watchProgress[serie.series_id] && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${watchProgress[serie.series_id]}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalSerie && (
        <ModalDetalhesSerie
          serie={modalSerie}
          onClose={handleCloseModal}
          onAssistir={handleAssistir}
          isFavorite={isFavorite(modalSerie.series_id)}
          onToggleFavorite={() => handleToggleFavorite(modalSerie)}
        />
      )}
    </div>
  );
};

export default Series;
  