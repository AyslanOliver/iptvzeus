import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Series.css';
import PlayerSeries from './components/PlayerSeries';
import ModalDetalhesSerie from './components/ModalDetalhesSerie';
import Navigation from './components/Navigation';

const Series = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [selectedSerie, setSelectedSerie] = useState(null);
  const [selectedEpisodio, setSelectedEpisodio] = useState(null);
  const [modalSerie, setModalSerie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [playerError, setPlayerError] = useState(null);

  const categories = [
    'Todas',
    'AMAZON PRIME',
    'APPLE+',
    'BRASIL PARALELO',
    'CRUNCHYROLL',
    'DISCOVERY+',
    'DISNEY+',
    'EXCLUSIVAS',
    'GLOBOPLAY',
    'HISTORY',
    'HULU',
    'MAX',
    'MGM+',
    'NETFLIX',
    'PARAMOUNT',
    'SBT+',
    'ANIMAÇÃO',
    'DORAMAS',
    'KIDS',
    'LEGENDADO',
    'MEXICANAS',
    'NOVELAS',
    'CURSOS E TUTORIAS',
    'SCI-FI & FANTASY',
    'DRAMA',
    'MISTÉRIO',
    'ACTION & ADVENTURE',
    'CRIME',
    'DOCUMENTÁRIO',
    'SOAP',
    'ROMANCE',
    'FAMÍLIA',
    'FICÇÃO CIENTÍFICA',
    'COMÉDIA'
  ];

  const getCategoryFromName = (name) => {
    const lowerName = name.toLowerCase();
    
    // Verificar plataformas de streaming
    if (lowerName.includes('netflix')) return 'NETFLIX';
    if (lowerName.includes('prime') || lowerName.includes('amazon')) return 'AMAZON PRIME';
    if (lowerName.includes('disney')) return 'DISNEY+';
    if (lowerName.includes('hbo') || lowerName.includes('max')) return 'MAX';
    if (lowerName.includes('apple')) return 'APPLE+';
    if (lowerName.includes('paramount')) return 'PARAMOUNT';
    if (lowerName.includes('hulu')) return 'HULU';
    if (lowerName.includes('crunchyroll')) return 'CRUNCHYROLL';
    if (lowerName.includes('discovery')) return 'DISCOVERY+';
    if (lowerName.includes('globoplay')) return 'GLOBOPLAY';
    if (lowerName.includes('history')) return 'HISTORY';
    if (lowerName.includes('mgm')) return 'MGM+';
    if (lowerName.includes('sbt')) return 'SBT+';
    if (lowerName.includes('brasil paralelo')) return 'BRASIL PARALELO';

    // Verificar gêneros e subcategorias
    if (lowerName.includes('sci-fi') || lowerName.includes('fantasy')) return 'SCI-FI & FANTASY';
    if (lowerName.includes('drama')) return 'DRAMA';
    if (lowerName.includes('mistério') || lowerName.includes('misterio')) return 'MISTÉRIO';
    if (lowerName.includes('action') || lowerName.includes('adventure')) return 'ACTION & ADVENTURE';
    if (lowerName.includes('crime')) return 'CRIME';
    if (lowerName.includes('documentário') || lowerName.includes('documentario')) return 'DOCUMENTÁRIO';
    if (lowerName.includes('soap')) return 'SOAP';
    if (lowerName.includes('romance')) return 'ROMANCE';
    if (lowerName.includes('família') || lowerName.includes('familia')) return 'FAMÍLIA';
    if (lowerName.includes('ficção científica') || lowerName.includes('ficcao cientifica')) return 'FICÇÃO CIENTÍFICA';
    if (lowerName.includes('comédia') || lowerName.includes('comedia')) return 'COMÉDIA';
    if (lowerName.includes('anima') || lowerName.includes('cartoon')) return 'ANIMAÇÃO';
    if (lowerName.includes('drama') || lowerName.includes('dorama')) return 'DORAMAS';
    if (lowerName.includes('kids') || lowerName.includes('infantil')) return 'KIDS';
    if (lowerName.includes('legendado')) return 'LEGENDADO';
    if (lowerName.includes('mexicana')) return 'MEXICANAS';
    if (lowerName.includes('novela')) return 'NOVELAS';
    if (lowerName.includes('curso') || lowerName.includes('tutorial')) return 'CURSOS E TUTORIAS';
    
    return 'EXCLUSIVAS';
  };

  const fetchSeries = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('iptvUser'));
      if (!user) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_series`);
      if (!response.ok) {
        throw new Error('Erro ao carregar séries');
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        const processedSeries = data.map(serie => {
          let categoryName = serie.category_name || '';
          
          if (!categoryName || !categories.some(cat => categoryName.includes(cat))) {
            categoryName = getCategoryFromName(serie.name);
          }

          return {
            ...serie,
            category_name: categoryName
          };
        });

        setSeries(processedSeries);
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
  }, [navigate]);

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

      if (!episodeData) {
        console.log('Episódio não encontrado:', { season: episodio.season, episode: episodio.episode_num });
        setPlayerError('Não foi possível encontrar o episódio. Por favor, tente novamente.');
        return;
      }

      console.log('Episódio encontrado:', episodeData);

      // Verifica se tem a URL do stream
      if (!episodeData.direct_source) {
        console.log('URL do stream não encontrada. Campos disponíveis:', Object.keys(episodeData));
        setPlayerError('URL do vídeo não encontrada. Por favor, tente novamente.');
        return;
      }

      console.log('URL do stream encontrada:', episodeData.direct_source);

      // Verifica se a URL do episódio é válida
      if (!validateStreamUrl(episodeData.direct_source)) {
        console.log('URL inválida:', episodeData.direct_source);
        setPlayerError('O link do vídeo está inválido ou expirado. Por favor, tente novamente.');
        return;
      }

      console.log('URL válida, iniciando reprodução');
      
      // Atualiza o estado com a série e o episódio
      const episodioComUrl = {
        ...episodio,
        url: episodeData.direct_source
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

  const filteredSeries = selectedCategory === 'Todas' 
    ? series 
    : series.filter(serie => {
        if (!serie.category_name) return false;
        return serie.category_name.includes(selectedCategory);
      });

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
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
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
  