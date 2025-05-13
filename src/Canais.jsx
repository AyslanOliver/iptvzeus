import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './Canais.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

function Canais() {

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

      const response = await fetch(`http://zed7.top/xmltv.php?username=${userData.username}&password=${userData.password}`);
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
      const MAX_RETRIES = 3;
      const INITIAL_DELAY = 1000;
      let retryCount = 0;
      let controller = new AbortController();

      const fetchWithRetry = async (currentRetry) => {
        try {
          setLoading(true);
          const userData = JSON.parse(localStorage.getItem('iptvUser'));

          const response = await fetch(
            `http://nxczs.top/get.php?username=${userData.username}&password=${userData.password}&type=m3u_plus&output=m3u8`,
            {
              signal: controller.signal,
              timeout: 10000
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.text();
          const lines = data.split('\n');
          const processedChannels = [];
          let currentChannel = null;

          lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
              const match = line.match(/tvg-id="([^"]*)".+tvg-logo="([^"]*)".+group-title="([^"]*)",(.+)/);
              if (match) {
                const rawCategory = match[3] || 'Geral';
                // Padronização de categorias
                const cleanedCategory = rawCategory
                  .trim()
                  .toUpperCase()
                  .replace(/_|-/g, ' ')
                  .replace(/\b(?:HD|FHD|UHD|4K|SD|HQ|DV|DUAL|\d{3,4}P?)\b/gi, '')
                  .replace(/(?:\s{2,}|\||\.)/g, ' ')
                  .trim();

                const categoryMap = {
                  'FILMES': ['CINEMA', 'FILME', 'MOVIE', 'STUDIO', 'PREMIERE'],
                  'ESPORTES': ['ESPORTE', 'SPORT', 'FOOTBALL', 'FUTEBOL', 'NBA', 'UFC'],
                  'INFANTIL': ['KIDS', 'INFANTIL', 'CARTOON', 'DISNEY', 'NICKELODEON'],
                  'NOTÍCIAS': ['NEWS', 'JORNAL', 'CNN', 'GLOBO NEWS', 'BAND NEWS'],
                  'MÚSICAS': ['MUSIC', 'MTV', 'VH1', 'CLIPES', 'SONGS'],
                  'RELIGIOSO': ['GOSPEL', 'IGREJA', 'RELIGIAO', 'CATÓLICO', 'EVANGÉLICO']
                };

                let [mainCategory, subCategory] = cleanedCategory.split('|').map(s => s.trim());
                let finalCategory = mainCategory;

                for (const [mainCat, synonyms] of Object.entries(categoryMap)) {
                  if (synonyms.some(s => mainCategory.includes(s))) {
                    finalCategory = subCategory ? `${mainCat}: ${subCategory}` : mainCat;
                    break;
                  }
                }

                finalCategory = finalCategory.replace(/\b(?:AO VIVO|LIVE|TV)\b/gi, '').trim();
                currentChannel = {
                  id: match[1] || Math.random().toString(36).substr(2, 9),
                  name: match[4].trim(),
                  logo: match[2] || '/icons/tv-default.png',
                  category: finalCategory
                };
              }
            } else if (line.startsWith('http') && currentChannel) {
              currentChannel.url = line;
              processedChannels.push({...currentChannel});
              currentChannel = null;
            }
          });

          const categoriesMap = {};
          const categories = [];

          processedChannels.forEach(channel => {
            const [mainCat, subCat] = channel.category.split(':').map(c => c.trim());
            
            if (!categories.includes(mainCat)) {
              categories.push(mainCat);
            }
            
            if (!categoriesMap[mainCat]) {
              categoriesMap[mainCat] = {};
            }
            
            const categoryKey = subCat || 'Geral';
            if (!categoriesMap[mainCat][categoryKey]) {
              categoriesMap[mainCat][categoryKey] = [];
            }
            
            channel.categoryHierarchy = {
              main: mainCat,
              sub: categoryKey,
              full: subCat ? `${mainCat}:${subCat}` : mainCat
            };
            
            categoriesMap[mainCat][categoryKey].push(channel);
          });

          setCategories(['Favoritos', ...categories]);
          setChannels(categoriesMap);
          setVisibleChannels(Object.values(categoriesMap[selectedCategory] || {}).flat().slice(0, channelsPerPage));
          setSelectedCategory(categories[0]);
          setSelectedChannel(processedChannels[0]);
          setLoading(false);
          return;

        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('Request was aborted');
          } else {
            console.error(`Attempt ${retryCount + 1} failed:`, err);
          }

          if (currentRetry >= MAX_RETRIES - 1) {
            console.error('Failed after maximum retries');
            return;
          }

          await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY * Math.pow(2, currentRetry)));
          controller = new AbortController();
          return fetchWithRetry(currentRetry + 1);
        } finally {
          setLoading(false);
        }
      }
      
      fetchWithRetry(0);
    };

    fetchChannels();
  }, []);

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
