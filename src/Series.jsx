import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Series.css';
import PlayerSeries from './components/PlayerSeries';
import ModalDetalhesSerie from './components/ModalDetalhesSerie';
import Navigation from './components/Navigation';

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

  const fetchSeries = async () => {
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
  };

  useEffect(() => {
    fetchSeries();
  }, [navigate, selectedCategory]);

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

      // Busca a URL do stream
      const response = await fetch(
        `http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_series_info&series_id=${serie.series_id}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar informações do episódio');
      }

      const data = await response.json();
      console.log('Dados recebidos da API:', data);

      // Procura o episódio específico nos dados
      const episodeData = data.episodes?.[episodio.season]?.find(
        ep => ep.episode_num === episodio.episode_num
      );

      // Buscar a URL do stream em vários campos possíveis
      let streamUrl = episodeData.direct_source;
      if (!streamUrl && episodeData.info && episodeData.info.movie_data) {
        streamUrl = episodeData.info.movie_data.stream_url || episodeData.info.movie_data.url;
      }
      if (!streamUrl && episodeData.info) {
        streamUrl = episodeData.info.url;
      }

      if (!streamUrl) {
        console.log('URL do stream não encontrada. Campos disponíveis:', Object.keys(episodeData));
        setPlayerError('URL do vídeo não encontrada. Por favor, tente novamente.');
        return;
      }

      console.log('URL do stream encontrada:', streamUrl);

      // Verifica se a URL do episódio é válida
      if (!validateStreamUrl(streamUrl)) {
        console.log('URL inválida:', streamUrl);
        setPlayerError('O link do vídeo está inválido ou expirado. Por favor, tente novamente.');
        return;
      }

      console.log('URL válida, iniciando reprodução');
      
      // Atualiza o estado com a série e o episódio
      const episodioComUrl = {
        ...episodio,
        url: streamUrl
      };

      console.log('Estado antes de atualizar:', { selectedSerie, selectedEpisodio });
      
      setSelectedSerie(serie);
      setSelectedEpisodio(episodioComUrl);
      
      console.log('Estado após atualizar:', { serie, episodioComUrl });
      
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
    
    // Verifica se a URL tem o formato esperado
    const validDomains = [
      'extsistemrbr3.ofcs.top',
      'nxczs.top',
      'ofcs.top'
    ];
    
    try {
      // Verifica se a URL começa com http:// ou https://
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.log('URL não começa com http:// ou https://');
        return false;
      }

      // Verifica se a URL contém um dos domínios válidos
      const hasValidDomain = validDomains.some(domain => url.includes(domain));
      if (!hasValidDomain) {
        console.log('Domínio não encontrado na lista de domínios válidos');
        return false;
      }

      // Verifica se a URL tem o formato básico esperado
      const hasValidFormat = url.includes('/series/') && url.includes('.mp4');
      if (!hasValidFormat) {
        console.log('URL não tem o formato esperado (/series/ e .mp4)');
        return false;
      }

      // Verifica se tem o token JWT
      const hasJwt = url.includes('sjwt=');
      if (!hasJwt) {
        console.log('URL não contém token JWT');
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
    setSelectedEpisodio(proximoEpisodio);
  };

  const filteredSeries = selectedCategory === 'all'
    ? series
    : series.filter(serie => serie.category_id === selectedCategory);

  if (selectedSerie && selectedEpisodio) {
    console.log('Renderizando player com:', { selectedSerie, selectedEpisodio });
    return (
      <div className="series-container">
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
            episodios={series.find(s => s.series_id === selectedSerie.series_id)?.episodes}
            onNextEpisode={handleNextEpisode}
          />
        )}
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
      <Navigation />
      <div className="series-content">
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
          {filteredSeries.length === 0 ? (
            <div className="no-results">
              <p>Nenhuma série encontrada nesta categoria.</p>
            </div>
          ) : (
            <div className="series-grid">
              {filteredSeries.map((serie) => (
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
                        e.target.src = '/placeholder.jpg';
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
  