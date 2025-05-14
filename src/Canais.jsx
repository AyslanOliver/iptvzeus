import React, { useState, useEffect, useCallback } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import Hls from 'hls.js';
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

  // Categorias predefinidas
  const predefinedCategories = React.useMemo(() => [
    {
      id: 'open',
      name: 'Canais Abertos',
      subcategories: [
        { id: 'globo', name: 'GLOBO' },
        { id: 'sbt', name: 'SBT' },
        { id: 'record', name: 'RECORD' },
        { id: 'other_open', name: 'ABERTOS' }
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

        const channels = await response.json();

        const categoriesResponse = await fetch(
          `http://nxczs.top/player_api.php?username=${username}&password=${password}&action=get_live_categories`
        );

        if (!categoriesResponse.ok) {
          throw new Error(`Falha ao carregar categorias: ${categoriesResponse.status}`);
        }

        const categories = await categoriesResponse.json();
        
        setChannels(channels);
        setCategories([...predefinedCategories, ...categories]);
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
          const data = await response.json();
          setEpgData(data);
        } catch (err) {
          console.error('Erro ao carregar EPG:', err);
        }
      }
    };

    fetchEPG();
  }, [selectedChannel]);

  // Gerenciar favoritos
  const toggleFavorite = useCallback((channel) => {
    setFavorites(prev => {
      const isFavorite = prev.some(fav => fav.id === channel.id);
      if (isFavorite) {
        return prev.filter(fav => fav.id !== channel.id);
      } else {
        return [...prev, channel];
      }
    });
  }, []);

  // Filtrar canais por categoria
  const filteredChannels = useCallback(() => {
    if (selectedCategory === 'all') return channels;
    if (selectedCategory === 'favorites') return favorites;
    return channels.filter(channel => channel.category === selectedCategory);
  }, [channels, selectedCategory, favorites]);

  // Gerenciar player HLS
  useEffect(() => {
    if (selectedChannel && Hls.isSupported()) {
      const username = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).username : '';
      const password = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).password : '';
      const streamUrl = `http://nxczs.top/live/${username}/${password}/${selectedChannel.stream_id}.m3u8`;
      
      const video = document.getElementById('channel-video');
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }
  }, [selectedChannel]);

  // Renderizar canal atual
  const renderCurrentChannel = () => {
    if (!selectedChannel) return null;

    return (
      <div className="player-container">
        <div id="player">
          <video
            id="channel-video"
            controls
            autoPlay
            playsInline
          />
        </div>
        <div className="channel-info">
          <h3>{selectedChannel.name}</h3>
          {epgData.currentShow && (
            <div className="epg">
              <p>Agora: {epgData.currentShow.title}</p>
              <p>Próximo: {epgData.nextShow?.title}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <div className="categories">
        <button
          className={`category-button ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Todos os Canais
        </button>
        <button
          className={`category-button ${selectedCategory === 'favorites' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('favorites')}
        >
          Favoritos
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="channel-list">
        {filteredChannels().length === 0 ? (
          <div className="no-channels">
            Nenhum canal encontrado nesta categoria
          </div>
        ) : (
          filteredChannels().map(channel => (
            <div
              key={channel.id}
              className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => setSelectedChannel(channel)}
            >
              <img
                src={channel.logo}
                alt={`${channel.name} logo`}
                className="channel-logo"
              />
              <span className="channel-name">{channel.name}</span>
              <button
                className="favorite-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(channel);
                }}
              >
                {favorites.some(fav => fav.id === channel.id) ? (
                  <FaHeart />
                ) : (
                  <FaRegHeart />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {renderCurrentChannel()}
    </div>
  );
};

export default Canais;