import React, { useCallback, useEffect, useState } from 'react';
import './ModalDetalhesSerie.css';
import { FaStar, FaRegStar } from 'react-icons/fa';

const ModalDetalhesSerie = ({ serie, onClose, onAssistir, isFavorite, onToggleFavorite, isEpisodeWatched }) => {
  const [epgInfo, setEpgInfo] = useState(null);
  const [isLoadingEpg, setIsLoadingEpg] = useState(true);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('1');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleAssistirClick = useCallback((episodio) => {
    const episodioCompleto = {
      id: episodio.id,
      title: episodio.title || `Episódio ${episodio.episode_num}`,
      name: episodio.title || `Episódio ${episodio.episode_num}`,
      episode_num: episodio.episode_num,
      season: episodio.season,
      info: episodio.info || 'Sem descrição disponível',
      duration: episodio.duration || '0',
      duration_secs: episodio.duration_secs || '0',
      bitrate: episodio.bitrate || '0'
    };
    onAssistir(serie, episodioCompleto);
  }, [serie, onAssistir]);

  useEffect(() => {
    const fetchEpgInfo = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) return;

        const epgUrl = `http://nxczs.top/xmltv.php?username=${user.username}&password=${user.password}`;
        const response = await fetch(epgUrl);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const programs = xmlDoc.getElementsByTagName('programme');
        for (let i = 0; i < programs.length; i++) {
          const program = programs[i];
          const channelId = program.getAttribute('channel');
          if (channelId === serie.series_id.toString()) {
            const title = program.getElementsByTagName('title')[0]?.textContent;
            const desc = program.getElementsByTagName('desc')[0]?.textContent;
            const category = program.getElementsByTagName('category')[0]?.textContent;
            const director = program.getElementsByTagName('director')[0]?.textContent;
            const actor = program.getElementsByTagName('actor')[0]?.textContent;

            setEpgInfo({
              title,
              description: desc,
              category,
              director,
              cast: actor
            });
            break;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar informações do EPG:', error);
      } finally {
        setIsLoadingEpg(false);
      }
    };

    const fetchEpisodes = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) return;

        const seriesUrl = `http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_series_info&series_id=${serie.series_id}`;
        const response = await fetch(seriesUrl);
        const data = await response.json();
        
        if (data.episodes) {
          const episodesList = [];
          Object.entries(data.episodes).forEach(([season, episodes]) => {
            episodes.forEach(episode => {
              episodesList.push({
                id: episode.id,
                season: season,
                episode_num: episode.episode_num,
                title: episode.title || `Episódio ${episode.episode_num}`,
                info: episode.info
              });
            });
          });
          setEpisodes(episodesList);
        }
      } catch (error) {
        console.error('Erro ao buscar episódios:', error);
      }
    };

    if (serie.series_id) {
      fetchEpgInfo();
      fetchEpisodes();
    }
  }, [serie.series_id]);

  if (!serie) return null;

  const filteredEpisodes = episodes.filter(ep => ep.season === selectedSeason);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{serie.name}</h2>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="serie-info">
            <img 
              src={serie.cover || 'https://via.placeholder.com/200x300?text=Sem+Imagem'} 
              alt={serie.name} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/200x300?text=Sem+Imagem';
              }}
            />
            <div className="serie-details">
              <p>{serie.plot || 'Sem descrição disponível'}</p>
              <p>Ano: {serie.year || 'N/A'}</p>
              <p>Gênero: {serie.genre || 'N/A'}</p>
              <button 
                className={`favorite-button ${isFavorite ? 'active' : ''}`}
                onClick={onToggleFavorite}
              >
                {isFavorite ? <FaStar /> : <FaRegStar />}
                {isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              </button>
            </div>
          </div>
          <div className="episodes-list">
            <h3>Episódios</h3>
            {filteredEpisodes.sort((a, b) => a.episode_num - b.episode_num).map((episodio) => (
              <div 
                key={episodio.id} 
                className={`episode-item ${isEpisodeWatched(episodio.id) ? 'watched' : ''}`}
                onClick={() => handleAssistirClick(episodio)}
              >
                <div className="episode-info">
                  <h4>{episodio.title || `Episódio ${episodio.episode_num}`}</h4>
                  <p>{episodio.info || 'Sem descrição disponível'}</p>
                </div>
                <div className="episode-actions">
                  <button className="watch-button">
                    {isEpisodeWatched(episodio.id) ? 'Assistido' : 'Assistir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesSerie; 