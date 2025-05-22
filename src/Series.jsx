import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Series.css';
import PlayerSeries from './components/PlayerSeries';
import ModalDetalhesSerie from './components/ModalDetalhesSerie';
import Navigation from './components/Navigation';
import { FaSearch, FaPlay, FaFilm, FaVideo, FaCog } from 'react-icons/fa';

const Series = () => {
  const navigate = useNavigate();
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

      // Limpa qualquer erro anterior
      setPlayerError(null);

      // Busca a URL do stream diretamente
      const streamUrl = `http://nxczs.top/series/${user.username}/${user.password}/${episodio.id}.mp4`;
      console.log('URL do stream gerada:', streamUrl);

      // Atualiza o estado com a série e o episódio
      const episodioComUrl = {
        ...episodio,
        url: streamUrl
      };

      setSelectedSerie(serie);
      setSelectedEpisodio(episodioComUrl);
      
      // Fecha o modal
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
          {searchedSeries.length === 0 ? (
            <div className="no-results">
              <p>{searchTerm ? 'Nenhuma série encontrada para sua busca.' : 'Nenhuma série encontrada nesta categoria.'}</p>
            </div>
          ) : (
            <div className="series-grid">
              {searchedSeries.map((serie) => (
                <div
                  key={serie.series_id}
                  className="serie-card"
                  onClick={() => handleSerieClick(serie)}
                >
                  <div className="serie-poster">
                    <img
                      src={serie.cover || '/placeholder.jpg'}
                      alt={serie.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/noimg.png';
                      }}
                    />
                  </div>
                  <div className="serie-info">
                    <h3>{serie.name}</h3>
                    {serie.category_name && (
                      <div className="serie-categories">
                        <span className="category-tag">
                          {serie.category_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalSerie && (
        <ModalDetalhesSerie
          serie={modalSerie}
          onClose={handleCloseModal}
          onAssistir={handleAssistir}
        />
      )}
    </div>
  );
};

export default Series;
  