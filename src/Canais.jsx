import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './Canais.css';

function Canais() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState({});
  const [epg, setEpg] = useState({});

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

      while (retryCount < MAX_RETRIES) {
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
                currentChannel = {
                  id: match[1] || Math.random().toString(36).substr(2, 9),
                  name: match[4].trim(),
                  logo: match[2] || '/icons/tv-default.png',
                  category: match[3] || 'Geral'
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
            if (!categories.includes(channel.category)) {
              categories.push(channel.category);
              categoriesMap[channel.category] = [];
            }
            categoriesMap[channel.category].push(channel);
          });

          setCategories(categories);
          setChannels(categoriesMap);
          setSelectedCategory(categories[0]);
          setSelectedChannel(processedChannels[0]);
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('Request was aborted');
          } else {
            console.error(`Attempt ${retryCount + 1} failed:`, err);
          }

          if (retryCount >= MAX_RETRIES - 1) {
            console.error('Failed after maximum retries');
            break;
          }

          await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY * Math.pow(2, retryCount)));
          retryCount++;
          controller = new AbortController();
        } finally {
          setLoading(false);
        }
      }
    };

    fetchChannels();
  }, []);

  const parseM3U = (data) => {
    const lines = data.split('\n');
    const categories = [];
    const channels = {};
    const epg = {};
    const channelUrls = {};

    let currentCategory = '';
    let currentChannelName = '';

    lines.forEach((line, index) => {
      line = line.trim();
      
      if (line.startsWith('#EXTGRP:')) {
        currentCategory = line.replace('#EXTGRP:', '').trim();
        if (!categories.includes(currentCategory)) {
          categories.push(currentCategory);
          channels[currentCategory] = [];
        }
      } else if (line.startsWith('#EXTINF:')) {
        const channelInfo = line.split(',');
        currentChannelName = channelInfo[1].trim();
        if (currentCategory) {
          channels[currentCategory].push(currentChannelName);
          epg[currentChannelName] = channelInfo[2] || 'Programação não disponível';
        }
      } else if (line.startsWith('http')) {
        if (currentChannelName) {
          channelUrls[currentChannelName] = line;
        }
      }
    });

    return { categories, channels, epg, channelUrls };
  };

  useEffect(() => {
    fetchEPG();
  }, []);

  useEffect(() => {
    if (selectedChannel && selectedChannel.url) {
      const hls = new Hls();
      const videoElement = playerRef.current;

      hls.loadSource(selectedChannel.url);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          console.error('Erro ao carregar stream:', data);
          hls.destroy();
        }
      });

      return () => {
        hls.destroy();
      };
    }
  }, [selectedChannel]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedChannel(null); // Reseta o canal selecionado ao mudar de categoria
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
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
            key={`cat-${category}`}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => handleCategorySelect(category)}
          >
            {category}
          </a>
        ))}
      </div>

      {/* Coluna de Canais */}
      <div className="channel-list">
        {selectedCategory && channels[selectedCategory] && channels[selectedCategory].length > 0 ? (
          channels[selectedCategory].map((channel) => (
            <div
              key={`${selectedCategory}-${channel.id}`}
              className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => handleChannelSelect(channel)}
            >
              <img
                src={channel.logo}
                alt={channel.name}
                className="channel-logo"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/icons/tv-default.png';
                }}
              />
              <span className="channel-name">{channel.name}</span>
            </div>
          ))
        ) : (
          <div className="no-channels">Nenhum canal disponível nesta categoria</div>
        )}
      </div>

      {/* Player e EPG */}
      <div className="player-container">
        <div id="player">
          {selectedChannel && <video ref={playerRef} controls />}
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
