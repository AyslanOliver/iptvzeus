import React, { useRef, useEffect, useState } from 'react';
import './PlayerFilmes.css';
import Hls from 'hls.js';

const PlayerFilmes = ({ movie, autoPlay = true, onReady, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  const handleVideoReady = () => {
    if (autoPlay && videoRef.current) {
      console.log('Attempting autoplay'); // Adicionado log para autoplay
      videoRef.current.play().catch(err => console.error('Erro ao reproduzir:', err));
    }
    if (onReady) onReady();
  };

  const handleBackgroundClick = (event) => {
    if (event.target === containerRef.current) {
      onClose();
    }
  };

  // Estrutura consolidada com todos os recursos integrados
  useEffect(() => {
    const loadVideo = async () => {
      console.log('Attempting to load video:', movie);
      if (!movie || !movie.stream_id || !movie.container_extension) {
        setError('Informações do filme incompletas.');
        console.error('Informações do filme incompletas:', movie);
        return;
      }

      const user = JSON.parse(localStorage.getItem('iptvUser'));
      if (!user) {
        setError('Usuário não autenticado.');
        console.error('Usuário não autenticado.');
        return;
      }

      // Construir a URL do stream
      const streamUrl = `http://nxczs.top/movie/${user.username}/${user.password}/${movie.stream_id}.${movie.container_extension}`;
      console.log('Stream URL:', streamUrl);

      try {
        // Lógica de carregamento unificada
        if (movie.container_extension === 'mp4') {
          console.log('Attempting native MP4 playback');
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
        } else if (Hls.isSupported()) {
          console.log('HLS is supported');
          const hls = new Hls();
          hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            console.log('video and hls.js are now bound together !');
          });
          hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            console.log('manifest loaded, found ' + data.levels.length + ' quality levels');
            if (onReady) onReady();
          });
          hls.on(Hls.Events.ERROR, function (event, data) {
            console.error('HLS.js error:', data);
            let errorMessage = 'Erro desconhecido ao carregar o vídeo.';
            if (data.fatal) {
              switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  errorMessage = 'Erro de rede ao carregar o vídeo.';
                  console.error('fatal network error encountered, try to recover');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  errorMessage = 'Erro de mídia ao carregar o vídeo.';
                  console.error('fatal media error encountered, try to recover');
                  hls.recoverMediaError();
                  break;
                default:
                  errorMessage = 'Erro fatal ao carregar o vídeo.';
                  console.error('fatal error encountered, cannot recover');
                  onClose(); // Fechar o player em caso de erro fatal irrecuperável
                  break;
              }
            }
            setError(errorMessage);
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current);
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          console.log('HLS not supported, but native playback is possible');
          // Fallback para players nativos
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
        } else {
          setError('Seu navegador não suporta a reprodução deste vídeo.');
          console.error('Native playback not supported');
        }
      } catch (err) {
        // Tratamento unificado de erros
        console.error('Erro geral ao carregar o vídeo:', err);
        setError(`Erro ao carregar o vídeo: ${err.message}`);
      }
    };
    
    loadVideo();
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src'); // Limpa a fonte
        videoRef.current.load();
      }
      abortControllerRef.current.abort();
    };
  }, [retryCount, movie, autoPlay, onReady, onClose]);

  return (
    <div className="player-filmes-container" ref={containerRef} onClick={handleBackgroundClick}>
      {error && (
        <div className="player-error">
          <p>Erro ao carregar: {error}</p>
          {retryCount < 2 && (
            <button 
              className="retry-button"
              onClick={() => setRetryCount(c => c + 1)}
            >
              Tentar novamente ({2 - retryCount} restantes)
            </button>
          )}
        </div>
      )}

      <div className="player-header">
        <h2>{movie?.name || movie?.title || 'Player'}</h2>
        <button onClick={onClose} className="close-button" aria-label="Fechar player">&times;</button>
      </div>
  
      <div className="player-wrapper">
        <video
          ref={videoRef}
          className="video-player"
          controls
          preload="none"
          playsInline
          onCanPlay={handleVideoReady}
          onError={(e) => {
            console.error('Erro no elemento de vídeo nativo:', e.nativeEvent);
            // O erro nativo pode ser mais específico, mas o HLS.js já trata a maioria dos casos
            // setError('Formato de vídeo não suportado ou erro de rede');
          }}
        />
      </div>
    </div>
  );
};

export default PlayerFilmes;
