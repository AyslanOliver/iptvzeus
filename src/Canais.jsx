import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './Canais.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

function Canais() {
  const [userData, setUserData] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState({});
  const [visibleChannels, setVisibleChannels] = useState([]);
  const [page, setPage] = useState(1);
  const channelsPerPage = 20;
  const [epg, setEpg] = useState({});
  const [favoriteChannels, setFavoriteChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);

  useEffect(() => {
    const storedUserData = localStorage.getItem('iptvUser');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  const loadMoreChannels = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    if (selectedCategory && channels[selectedCategory]) {
      setVisibleChannels(Object.values(channels[selectedCategory]).flat().slice(0, page * channelsPerPage));
    }
  }, [selectedCategory, page, channels, channelsPerPage]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteChannels');
    if (savedFavorites) {
      setFavoriteChannels(JSON.parse(savedFavorites));
    }
  }, []);

  const toggleFavorite = (channel) => {
    const newFavorites = favoriteChannels.includes(channel.id)
      ? favoriteChannels.filter(id => id !== channel.id)
      : [...favoriteChannels, channel.id];
    
    setFavoriteChannels(newFavorites);
    localStorage.setItem('favoriteChannels', JSON.stringify(newFavorites));
  };

  const fetchEPG = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('iptvUser'));

      const response = await fetch(`/xmltv.php?username=${userData.username}&password=${userData.password}`.replace('https://', 'http://'));
      const xmlData = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      const programs = xmlDoc.getElementsByTagName('programme');
      const epgData = {};
      Array.from(programs).forEach(program => {
        const channel = program.getAttribute('channel');
        const title = program.getElementsByTagName('title')[0].textContent;
        const desc = program.getElementsByTagName('desc')[0]?.textContent || 'Programação não disponível';
        epgData[channel] = `${title}: ${desc}`;
      });
      setEpg(epgData);
    } catch (error) {

      console.error('Erro ao carregar EPG:', error);
    }
  };

  useEffect(() => {
    fetchEPG();
  }, []);

useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const userData = JSON.parse(localStorage.getItem('iptvUser'));
        const response = await fetch(`http://nxczs.top/get.php?username=${userData.username}&password=${userData.password}&type=m3u_plus&output=m3u8`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const processedChannels = data.map(channel => ({
          id: channel.stream_id,
          name: channel.name,
          logo: channel.stream_icon || '/icons/tv-default.png',
          url: `http://nxczs.top/live/${userData.username}/${userData.password}/${channel.stream_id}.m3u8`,
          category: channel.category_name || 'Geral'
        }));

        setChannels(processedChannels);
        setCurrentChannel(processedChannels[0]);
      } catch (err) {
        console.error('Error fetching channels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [userData]);

  useEffect(() => {
    if (selectedChannel && selectedChannel.url) {
      const hls = new Hls();
      const videoElement = playerRef.current;

      hls.loadSource(selectedChannel.url);
      hls.attachMedia(videoElement);
      videoElement.load();

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          console.error('Erro ao carregar stream:', data);
          if (hls) {
            hls.destroy();
          }
        }
      });

      return () => {
        if (hls) {
          hls.destroy();
        }
      };
    }
  }, [selectedChannel]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedChannel(null); // Reseta o canal selecionado ao mudar de categoria
  };

  if (loading) {
    return <div className="loading">Carregando canais...</div>;
  }

  return (
    <div className="container">
      {/* Coluna de Categorias */}
      <div className="categories">
        {categories.map((category) => (
          <a
            key={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => handleCategorySelect(category)}
            role="button"
            tabIndex={0}
          >
            {category}
          </a>
        ))}
      </div>

      {/* Coluna de Canais */}
      <div className="channel-list">
        {selectedCategory && visibleChannels.length > 0 && (
          <>
            {visibleChannels.map(channel => (
              <div 
                key={`${channel.id}-${channel.categoryHierarchy.full}`} 
                className="channel-card"
                onClick={() => setSelectedChannel(channel)}
              >
                <img src={channel.logo} alt={channel.name} className="channel-logo" />
                <div className="channel-info">
                  <h3 className="channel-title">{channel.name}</h3>
                  <p className="channel-category">{channel.category}</p>
                  <button
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(channel);
                    }}
                  >
                    {favoriteChannels.includes(channel.id) ? <FaHeart /> : <FaRegHeart />}
                  </button>
                </div>
              </div>
            ))}
            {visibleChannels.length < Object.values(channels[selectedCategory] || {}).flat().length && (
              <button className="load-more" onClick={loadMoreChannels}>
                Carregar mais canais
              </button>
            )}
          </>
        )}
      </div>

      {/* Player e EPG */}
      <div className="player-container">
        <div id="player">
          {selectedChannel && <video ref={playerRef} controls autoPlay muted playsInline />}
        </div>

        {selectedChannel && (
          <div className="channel-info">
            <h3>{selectedChannel.name}</h3>
            <div className="epg">{epg[selectedChannel.id] || 'Programação não disponível'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Canais;
