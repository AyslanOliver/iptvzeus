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
        
        console.log('Canais carregados:', channels);
        console.log('Estrutura do primeiro canal:', channels[0]);

        const categoriesResponse = await fetch(
          `http://nxczs.top/player_api.php?username=${username}&password=${password}&action=get_live_categories`
        );

        if (!categoriesResponse.ok) {
          throw new Error(`Falha ao carregar categorias: ${categoriesResponse.status}`);
        }

        const apiCategories = await categoriesResponse.json();
        console.log('Categorias da API:', apiCategories);
        
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
          
          // Verificar se a resposta é válida
          if (!response.ok) {
            console.error('Falha ao carregar EPG:', response.status);
            return;
          }
          
          // Verificar tipo de conteúdo
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Resposta do EPG não é JSON:', await response.text());
            return;
          }
          
          // Parsear resposta JSON
          const data = await response.json();
          setEpgData(data);
        } catch (err) {
          console.error('Erro ao carregar EPG:', err);
          // Definir dados vazios em caso de erro
          setEpgData({});
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
    
    // Verificar se é uma subcategoria dos canais abertos
    const openCategory = predefinedCategories[0];
    const isOpenSubcategory = openCategory.subcategories.some(sub => sub.category_id === selectedCategory);
    
    if (isOpenSubcategory) {
      return channels.filter(channel => {
        const channelName = channel.name.toUpperCase();
        switch(selectedCategory) {
          case 'globo':
            return channelName.includes('GLOBO');
          case 'sbt':
            return channelName.includes('SBT');
          case 'record':
            return channelName.includes('RECORD');
          case 'other_open':
            return channelName.includes('BAND') || 
                   channelName.includes('REDE TV') || 
                   channelName.includes('TV CULTURA');
          default:
            return false;
        }
      });
    }
    
    // Para outras categorias, usar o category_id da API
    return channels.filter(channel => channel.category_id === selectedCategory);
  }, [channels, selectedCategory, favorites, predefinedCategories]);

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
          <React.Fragment key={`cat-${category.category_id}`}>
            <button
              className={`category-button main-category ${selectedCategory === category.category_id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              {category.category_name}
            </button>
            {category.subcategories && category.subcategories.map(sub => (
              <button
                key={sub.category_id}
                className={`category-button subcategory ${selectedCategory === sub.category_id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(sub.category_id)}
              >
                {sub.category_name}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="channel-list">
        {filteredChannels().length === 0 ? (
          <div className="no-channels">
            Nenhum canal encontrado nesta categoria
          </div>
        ) : (
          filteredChannels().map((channel, index) => (
            <div
              key={`channel-${channel.id}-${index}`}
              className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => setSelectedChannel(channel)}
            >
              <img
                src={channel.stream_icon || channel.logo}
                alt={`${channel.name} logo`}
                className="channel-logo"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=random&color=fff&size=128`;
                }}
                loading="lazy"
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