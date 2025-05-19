import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './PlayerSeries.css';

const PlayerSeries = ({ serie, episodio, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const fetchStreamUrl = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        // Primeiro, vamos buscar a URL do stream através da API
        const apiUrl = `http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_series_info&series_id=${serie.series_id}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.episodes) {
          throw new Error('Informações do episódio não encontradas');
        }

        // Encontrar o episódio específico
        let streamUrl = null;
        Object.entries(data.episodes).forEach(([season, episodes]) => {
          const foundEpisode = episodes.find(ep => ep.id === episodio.id);
          if (foundEpisode && foundEpisode.info && foundEpisode.info.movie_data) {
            streamUrl = foundEpisode.info.movie_data.stream_url;
          }
        });

        if (!streamUrl) {
          throw new Error('URL do stream não encontrada');
        }

        // Configurar o player com a URL do stream
        if (Hls.isSupported()) {
          const hls = new Hls({
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            },
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            lowLatencyMode: true,
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current.play().catch(err => {
              console.error('Erro ao iniciar reprodução:', err);
              setError('Erro ao iniciar a reprodução. Por favor, tente novamente.');
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('Erro de rede:', data);
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('Erro de mídia:', data);
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('Erro fatal:', data);
                  hls.destroy();
                  setError('Erro ao reproduzir o vídeo. Por favor, tente novamente.');
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            videoRef.current.play().catch(err => {
              console.error('Erro ao iniciar reprodução:', err);
              setError('Erro ao iniciar a reprodução. Por favor, tente novamente.');
            });
          });
        } else {
          setError('Seu navegador não suporta a reprodução deste tipo de vídeo.');
        }
      } catch (err) {
        console.error('Erro ao carregar stream:', err);
        setError('Erro ao carregar o vídeo. Por favor, tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    if (serie && episodio) {
      fetchStreamUrl();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [serie, episodio]);

  if (error) {
    return (
      <div className="player-container">
        <div className="player-error">
          <p>{error}</p>
          <button onClick={onClose}>Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-container">
      {isLoading && (
        <div className="player-loading">
          <div className="spinner"></div>
          <p>Carregando vídeo...</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="player-video"
        controls
        playsInline
        autoPlay
        crossOrigin="anonymous"
      />

      <div className="player-info">
        <h2>{serie.name}</h2>
        <h3>{episodio.title || `Episódio ${episodio.episode_num}`}</h3>
        <button className="player-close" onClick={onClose}>Voltar</button>
      </div>
    </div>
  );
};

export default PlayerSeries;