import React, { useState, useEffect, useCallback } from 'react';
import { FaHeart, FaRegHeart, FaSearch, FaPlay, FaFilm, FaCog, FaVideo } from 'react-icons/fa';
import Hls from 'hls.js/dist/hls.min.js';
import Navigation from './components/Navigation';
import { useNavigate } from 'react-router-dom';
import './Canais.css';

const Canais = () => {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [epgData, setEpgData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const navigate = useNavigate();

  // Categorias predefinidas
  const predefinedCategories = React.useMemo(() => [
    {
      category_id: 'open',
      category_name: 'Canais Abertos',
      subcategories: [
        { category_id: 'globo', category_name: 'GLOBO' },
        { category_id: 'sbt', category_name: 'SBT' },
        { category_id: 'record', category_name: 'RECORD' },
        { category_id: 'other_open', category_name: 'ABERTOS' }
      ]
    },
  ], []);

  // Carregar canais e categorias
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const username = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).username : '';
        const password = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).password : '';
        
        if (!username || !password) {
          setError('Credenciais não encontradas');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `http://nxczs.top/player_api.php?username=${username}&password=${password}&action=get_live_streams`
        );

        if (!response.ok) {
          throw new Error(`Falha ao carregar canais: ${response.status}`);
        }

        let channels = await response.json();
        
        // Garantir que todos os canais tenham category_id
        channels = channels.map(channel => ({
          ...channel,
          category_id: channel.category_id?.toString() || ''
        }));
        
        const categoriesResponse = await fetch(
          `http://nxczs.top/player_api.php?username=${username}&password=${password}&action=get_live_categories`
        );

        if (!categoriesResponse.ok) {
          throw new Error(`Falha ao carregar categorias: ${categoriesResponse.status}`);
        }

        const apiCategories = await categoriesResponse.json();
        
        // Formatar as categorias da API para corresponder à estrutura das predefinidas
        const formattedApiCategories = apiCategories.map(cat => ({
          category_id: cat.category_id,
          category_name: cat.category_name
        }));
        
        setChannels(channels);
        setCategories([...predefinedCategories, ...formattedApiCategories]);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar os canais. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchData();
  }, [predefinedCategories]);

  // Carregar EPG
  useEffect(() => {
    const fetchEPG = async () => {
      if (selectedChannel) {
        try {
          const response = await fetch(`/api/epg/${selectedChannel.id}`);
          if (!response.ok) return;
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) return;
          const data = await response.json();
          setEpgData(data);
        } catch (err) {
          setEpgData({});
        }
      }
    };
    fetchEPG();
  }, [selectedChannel]);

  // Carregar favoritos do localStorage e limpar inválidos ao iniciar
  useEffect(() => {
    const favs = localStorage.getItem('favoriteChannels');
    if (favs) {
      const parsed = JSON.parse(favs);
      // Só mantém favoritos válidos (com stream_id definido)
      const validFavs = Array.isArray(parsed) ? parsed.filter(fav => fav && fav.stream_id) : [];
      setFavorites(validFavs);
      localStorage.setItem('favoriteChannels', JSON.stringify(validFavs));
    }
  }, []);

  // Gerenciar favoritos
  const toggleFavorite = useCallback((channel) => {
    setFavorites(prev => {
      const isFavorite = prev.some(fav => fav.stream_id === channel.stream_id);
      if (isFavorite) {
        return prev.filter(fav => fav.stream_id !== channel.stream_id);
      } else {
        return [...prev, channel];
      }
    });
  }, []);

  // Filtrar canais por categoria e busca
  const filteredChannels = useCallback(() => {
    let filtered = channels.filter(c => c && c.stream_id); // só canais válidos
    if (selectedCategory === 'favorites') {
      // Buscar canais favoritos na lista principal para garantir consistência
      return favorites
        .map(fav => channels.find(c => c.stream_id && c.stream_id === fav.stream_id))
        .filter(Boolean);
    }
    if (selectedCategory !== 'all') {
      const openCategory = predefinedCategories[0];
      const isOpenSubcategory = openCategory.subcategories.some(sub => sub.category_id === selectedCategory);
      if (isOpenSubcategory) {
        filtered = filtered.filter(channel => {
          const channelName = channel.name?.toUpperCase() || '';
          switch(selectedCategory) {
            case 'globo': return channelName.includes('GLOBO');
            case 'sbt': return channelName.includes('SBT');
            case 'record': return channelName.includes('RECORD');
            case 'other_open': return channelName.includes('BAND') || channelName.includes('REDE TV') || channelName.includes('TV CULTURA');
            default: return false;
          }
        });
      } else {
        filtered = filtered.filter(channel => channel.category_id === selectedCategory);
      }
    }
    if (searchTerm) {
      filtered = filtered.filter(channel => channel.name && channel.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [channels, selectedCategory, favorites, predefinedCategories, searchTerm]);

  // Gerenciar player HLS com reconexão automática e resiliência
  useEffect(() => {
    if (selectedChannel && Hls.isSupported()) {
      const username = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).username : '';
      const password = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).password : '';
      const streamUrl = `http://nxczs.top/live/${username}/${password}/${selectedChannel.stream_id}.m3u8`;
      const video = document.getElementById('channel-video');
      let hls = new Hls({
        manifestLoadingMaxRetry: 20,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 60000,
        levelLoadingMaxRetry: 20,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 60000,
        fragLoadingMaxRetry: 20,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 60000,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 20000,
        levelLoadingTimeOut: 20000,
        fragLoadingTimeOut: 20000
      });
      let retryCount = 0;
      const maxRetries = 10;
      let retryTimeout = null;
      let playPromise = null;

      const reloadPlayer = async () => {
        if (hls) {
          hls.destroy();
        }
        hls = new Hls({
          manifestLoadingMaxRetry: 20,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 60000,
          levelLoadingMaxRetry: 20,
          levelLoadingRetryDelay: 1000,
          levelLoadingMaxRetryTimeout: 60000,
          fragLoadingMaxRetry: 20,
          fragLoadingRetryDelay: 1000,
          fragLoadingMaxRetryTimeout: 60000,
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingTimeOut: 20000,
          levelLoadingTimeOut: 20000,
          fragLoadingTimeOut: 20000
        });
        hls.on(Hls.Events.ERROR, onErrorHandler);
        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        try {
          // Cancela qualquer reprodução anterior
          if (playPromise) {
            try {
              await playPromise;
            } catch (e) {
              // Ignora erros de reprodução anterior
            }
          }
          
          playPromise = video.play();
          await playPromise;
        } catch (err) {
          console.error('Erro ao iniciar reprodução após recarregar:', err);
        } finally {
          playPromise = null;
        }
      };

      const onErrorHandler = (event, data) => {
        if (data.fatal) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              reloadPlayer();
            }, 2000);
          } else {
            hls.destroy();
            // Opcional: mostrar mensagem de erro para o usuário
          }
        }
      };

      hls.on(Hls.Events.ERROR, onErrorHandler);
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      // Watchdog: se o vídeo travar, tenta recarregar
      let lastTime = 0;
      let stuckCount = 0;
      const watchdog = setInterval(() => {
        if (video && !video.paused && !video.ended) {
          if (video.currentTime === lastTime) {
            stuckCount++;
            if (stuckCount > 5) {
              reloadPlayer();
              stuckCount = 0;
            }
          } else {
            stuckCount = 0;
          }
          lastTime = video.currentTime;
        }
      }, 4000);

      return () => {
        if (hls) hls.destroy();
        if (retryTimeout) clearTimeout(retryTimeout);
        clearInterval(watchdog);
        if (playPromise) {
          playPromise.catch(() => {}); // Ignora erros de reprodução ao desmontar
        }
      };
    }
  }, [selectedChannel]);

  // Contadores de canais por categoria
  const getCategoryCount = (catId) => {
    if (catId === 'all') return channels.length;
    if (catId === 'favorites') return favorites.length;
    const openCategory = predefinedCategories[0];
    const isOpenSubcategory = openCategory.subcategories.some(sub => sub.category_id === catId);
    if (isOpenSubcategory) {
      return channels.filter(channel => {
        const channelName = channel.name.toUpperCase();
        switch(catId) {
          case 'globo': return channelName.includes('GLOBO');
          case 'sbt': return channelName.includes('SBT');
          case 'record': return channelName.includes('RECORD');
          case 'other_open': return channelName.includes('BAND') || channelName.includes('REDE TV') || channelName.includes('TV CULTURA');
          default: return false;
        }
      }).length;
    }
    return channels.filter(channel => channel.category_id === catId).length;
  };

  // Função para abrir o modal Catch Up
  const handleOpenCatchUp = () => {
    setCatchUpOpen(true);
  };
  const handleCloseCatchUp = () => {
    setCatchUpOpen(false);
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="canais-root">
      <div className="canais-container">
        {/* Topbar */}
        <div className="canais-topbar">
          <div className="titulo">TV ao Vivo</div>
          <div className="search-box">
            <FaSearch style={{marginRight:8, color:'#ffea70'}} />
            <input
              className="search-input"
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="topbar-actions">
            <button className="topbar-icon"><FaPlay /></button>
            <button className="topbar-icon" onClick={() => navigate('/filmes')}><FaFilm /></button>
            <button className="topbar-icon" onClick={() => navigate('/series')}><FaVideo /></button>
            <button className="topbar-icon"><FaCog /></button>
          </div>
        </div>
        {/* Main layout */}
        <div className="canais-main">
          {/* Sidebar */}
          <div className="canais-sidebar">
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Pesquisar Categoria"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
              />
            </div>
            <div className="sidebar-categories">
              <button
                className={`sidebar-category${selectedCategory === 'all' ? ' selected' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Todos <span className="cat-count">{getCategoryCount('all')}</span>
              </button>
              <button
                className={`sidebar-category${selectedCategory === 'favorites' ? ' selected' : ''}`}
                onClick={() => setSelectedCategory('favorites')}
              >
                Favoritos <span className="cat-count">{getCategoryCount('favorites')}</span>
              </button>
              {categories.filter(cat =>
                !sidebarSearch || cat.category_name.toLowerCase().includes(sidebarSearch.toLowerCase())
              ).map(category => (
                <React.Fragment key={`cat-${category.category_id}`}>
                  <button
                    className={`sidebar-category${selectedCategory === category.category_id ? ' selected' : ''}`}
                    onClick={() => setSelectedCategory(category.category_id)}
                  >
                    {category.category_name}
                    <span className="cat-count">{getCategoryCount(category.category_id)}</span>
                  </button>
                  {category.subcategories && category.subcategories.map(sub => (
                    <button
                      key={sub.category_id}
                      className={`sidebar-category${selectedCategory === sub.category_id ? ' selected' : ''}`}
                      onClick={() => setSelectedCategory(sub.category_id)}
                      style={{paddingLeft:32, fontSize:'0.95rem'}}>
                      {sub.category_name}
                      <span className="cat-count">{getCategoryCount(sub.category_id)}</span>
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
          {/* Lista de canais */}
          <div className="canais-center">
            <div className="channels-list">
              {filteredChannels().filter(channel => channel && channel.stream_id).map((channel, index) => (
                <div
                  key={`channel-${channel.stream_id}`}
                  className={`channel-row${selectedChannel?.stream_id === channel.stream_id ? ' selected' : ''}`}
                  onClick={() => setSelectedChannel(channel)}
                >
                  <img
                    src={channel.stream_icon || channel.logo}
                    alt={`${channel.name} logo`}
                    className="channel-logo"
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=random&color=fff&size=128`;
                    }}
                    loading="lazy"
                  />
                  <span className="channel-name">{channel.name}</span>
                  <button
                    className="fav-btn"
                    onClick={e => {
                      e.stopPropagation();
                      toggleFavorite(channel);
                    }}
                  >
                    {favorites.some(fav => fav.stream_id === channel.stream_id) ? <FaHeart /> : <FaRegHeart />}
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Player e info */}
          <div className="canais-right">
            <div className="player-box">
              {selectedChannel ? (
                <video
                  id="channel-video"
                  controls
                  autoPlay
                  playsInline
                  style={{width:'100%', maxHeight:320, borderRadius:'1rem 1rem 0 0'}}
                />
              ) : (
                <div style={{color:'#fff', textAlign:'center', padding:'2rem 0'}}>Selecione um canal para assistir</div>
              )}
            </div>
            {selectedChannel && (
              <>
                <div className="canal-info">{selectedChannel.name}</div>
                {epgData.currentShow && (
                  <div className="epg-box">
                    <div>Agora: {epgData.currentShow.title}</div>
                    <div>Próximo: {epgData.nextShow?.title}</div>
                  </div>
                )}
                <div className="canais-bottom-actions">
                  <button
                    className={`action-btn${favorites.some(fav => fav.stream_id === selectedChannel.stream_id) ? ' favorito' : ''}`}
                    onClick={() => {
                      if (selectedChannel && selectedChannel.stream_id && channels.some(c => c.stream_id === selectedChannel.stream_id)) {
                        toggleFavorite(selectedChannel);
                      }
                    }}
                    style={{display:'flex',alignItems:'center',gap:8}}
                    disabled={!(selectedChannel && selectedChannel.stream_id && channels.some(c => c.stream_id === selectedChannel.stream_id))}
                  >
                    {favorites.some(fav => fav.stream_id === selectedChannel.stream_id)
                      ? <><FaHeart style={{color:'#ffea70',fontSize:'1.2rem'}}/> Remover dos favoritos</>
                      : <><FaRegHeart style={{color:'#ffea70',fontSize:'1.2rem'}}/> Adicionar aos favoritos</>
                    }
                  </button>
                  <button className="action-btn" style={{background:'#6c38e0'}} onClick={handleOpenCatchUp}>
                    <span style={{fontSize:'1.3rem'}}>⏰</span> Catch Up
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <Navigation />
      </div>
      {/* Modal Catch Up */}
      {catchUpOpen && selectedChannel && (
        <div className="modal-catchup-bg" onClick={handleCloseCatchUp}>
          <div className="modal-catchup" onClick={e => e.stopPropagation()}>
            <h3>Catch Up - {selectedChannel.name}</h3>
            {epgData && epgData.pastShows && epgData.pastShows.length > 0 ? (
              <ul className="catchup-list">
                {epgData.pastShows.map((show, idx) => (
                  <li key={show.id || idx} className="catchup-item">
                    <div>
                      <strong>{show.title}</strong>
                      <div style={{fontSize:'0.95rem',color:'#aaa'}}>{show.start} - {show.end}</div>
                    </div>
                    <button className="catchup-watch-btn" disabled>
                      Assistir
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{color:'#fff',padding:'1rem'}}>Nenhum programa disponível para Catch Up.</div>
            )}
            <button className="modal-close" onClick={handleCloseCatchUp}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canais;