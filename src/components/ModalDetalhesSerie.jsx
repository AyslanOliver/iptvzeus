import React, { useCallback, useEffect, useState } from 'react';
import './ModalDetalhesSerie.css';

const ModalDetalhesSerie = ({ serie, onClose, onAssistir }) => {
  const [epgInfo, setEpgInfo] = useState(null);
  const [isLoadingEpg, setIsLoadingEpg] = useState(true);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('1');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleAssistirClick = useCallback((episodio) => {
    onAssistir(serie, episodio);
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
    <div className="modal-detalhes-serie-overlay">
      <div className="modal-detalhes-serie">
        <button className="modal-fechar" onClick={handleClose}>×</button>
        
        <div className="modal-conteudo">
          <div className="modal-imagem">
            <img 
              src={serie.cover} 
              alt={serie.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder.jpg';
              }}
            />
          </div>
          
          <div className="modal-info">
            <h2>{serie.name}</h2>
            
            {epgInfo && (
              <>
                {epgInfo.category && (
                  <div className="info-item">
                    <strong>Gênero:</strong> {epgInfo.category}
                  </div>
                )}
                {epgInfo.director && (
                  <div className="info-item">
                    <strong>Diretor:</strong> {epgInfo.director}
                  </div>
                )}
                {epgInfo.cast && (
                  <div className="info-item">
                    <strong>Elenco:</strong> {epgInfo.cast}
                  </div>
                )}
                {epgInfo.description && (
                  <div className="modal-sinopse">
                    <h3>Sinopse</h3>
                    <p>{epgInfo.description}</p>
                  </div>
                )}
              </>
            )}

            <div className="temporadas">
              <h3>Temporadas</h3>
              <div className="temporadas-selector">
                {Array.from(new Set(episodes.map(ep => ep.season))).sort((a, b) => a - b).map(season => (
                  <button
                    key={season}
                    className={`temporada-btn ${selectedSeason === season ? 'active' : ''}`}
                    onClick={() => setSelectedSeason(season)}
                  >
                    Temporada {season}
                  </button>
                ))}
              </div>
            </div>

            <div className="episodios">
              <h3>Episódios</h3>
              <div className="episodios-lista">
                {filteredEpisodes.sort((a, b) => a.episode_num - b.episode_num).map((episodio) => (
                  <div
                    key={episodio.id}
                    className="episodio-item"
                    onClick={() => handleAssistirClick(episodio)}
                  >
                    <div className="episodio-info">
                      <h4>Episódio {episodio.episode_num}</h4>
                      <p>{episodio.title}</p>
                    </div>
                    <button className="assistir-btn">Assistir</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesSerie; 