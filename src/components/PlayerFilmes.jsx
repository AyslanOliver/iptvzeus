import React, { useRef, useEffect, useState, useCallback } from 'react';
import './PlayerFilmes.css';
import Hls from 'hls.js/dist/hls.min.js';

const PlayerFilmes = ({ movie, autoPlay = true, onReady, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const playAttemptRef = useRef(null);
  const abortControllerRef = useRef(new AbortController());
  const playPromiseRef = useRef(null);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  const attemptPlay = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      // Cancela qualquer tentativa anterior de reprodução
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {
          // Ignora erros de reprodução anterior
        }
      }

      // Limpa qualquer tentativa anterior
      if (playAttemptRef.current) {
        clearTimeout(playAttemptRef.current);
      }

      // Aguarda um pequeno delay para garantir que o vídeo está pronto
      playAttemptRef.current = setTimeout(async () => {
        try {
          // Armazena a promessa de reprodução
          playPromiseRef.current = videoRef.current.play();
          await playPromiseRef.current;
        } catch (err) {
          console.error('Erro ao reproduzir:', err);
          if (err.name !== 'AbortError') {
            setError('Erro ao iniciar a reprodução. Tente novamente.');
          }
        } finally {
          playPromiseRef.current = null;
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao tentar reproduzir:', err);
    }
  }, []);

  const handleVideoReady = useCallback(() => {
    setIsLoading(false);
    if (autoPlay) {
      attemptPlay();
    }
    if (onReady) onReady();
  }, [autoPlay, onReady, attemptPlay]);

  const handleBackgroundClick = (event) => {
    if (event.target === containerRef.current) {
      onClose();
    }
  };

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initializeHls = useCallback((streamUrl) => {
    if (hlsRef.current) {
      destroyHls();
    }

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      lowLatencyMode: true,
      backBufferLength: 90,
      enableWorker: true,
      startLevel: -1,
      abrEwmaDefaultEstimate: 500000,
      testBandwidth: true,
      progressive: true,
      debug: false,
      manifestLoadingTimeOut: 20000,
      manifestLoadingMaxRetry: 6,
      manifestLoadingRetryDelay: 1000,
      levelLoadingTimeOut: 20000,
      levelLoadingMaxRetry: 6,
      levelLoadingRetryDelay: 1000,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000
    });

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('HLS.js e vídeo conectados');
    });

    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('Manifest carregado, encontradas ' + data.levels.length + ' qualidades');
      handleVideoReady();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Erro de rede fatal, tentando recuperar...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Erro de mídia fatal, tentando recuperar...');
            hls.recoverMediaError();
            break;
          default:
            console.error('Erro fatal, não é possível recuperar');
            setError('Erro fatal ao carregar o vídeo. Tente novamente.');
            destroyHls();
            break;
        }
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(videoRef.current);
    hlsRef.current = hls;
  }, [destroyHls, handleVideoReady]);

  const loadVideo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!movie?.stream_id || !movie?.container_extension) {
      setError('Informações do filme incompletas.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('iptvUser'));
    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }

    const streamUrl = `http://nxczs.top/movie/${user.username}/${user.password}/${movie.stream_id}.${movie.container_extension}`;
    console.log('Carregando stream:', streamUrl);

    try {
      if (videoRef.current) {
        // Cancela qualquer reprodução em andamento
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {
            // Ignora erros de reprodução anterior
          }
        }
        
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }

      if (movie.container_extension === 'mp4') {
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
      } else if (Hls.isSupported()) {
        initializeHls(streamUrl);
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
      } else {
        setError('Seu navegador não suporta a reprodução deste vídeo.');
      }
    } catch (err) {
      console.error('Erro ao carregar vídeo:', err);
      setError(`Erro ao carregar o vídeo: ${err.message}`);
    }
  }, [movie, handleVideoReady, initializeHls]);

  useEffect(() => {
    loadVideo();

    // Armazena as referências atuais em variáveis locais
    const video = videoRef.current;
    const abortController = abortControllerRef.current;
    const playAttempt = playAttemptRef.current;
    const playPromise = playPromiseRef.current;

    return () => {
      if (playAttempt) {
        clearTimeout(playAttempt);
      }
      if (playPromise) {
        playPromise.catch(() => {}); // Ignora erros de reprodução ao desmontar
      }
      destroyHls();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [loadVideo, destroyHls]);

  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setTimeout(loadVideo, RETRY_DELAY);
    }
  }, [retryCount, loadVideo]);

  return (
    <div className="player-filmes-container" ref={containerRef} onClick={handleBackgroundClick}>
      {error && (
        <div className="player-error">
          <p>{error}</p>
          {retryCount < MAX_RETRIES && (
            <button 
              className="retry-button"
              onClick={handleRetry}
            >
              Tentar novamente ({MAX_RETRIES - retryCount} restantes)
            </button>
          )}
        </div>
      )}

      <div className="player-header">
        <h2>{movie?.name || movie?.title || 'Player'}</h2>
        <button onClick={onClose} className="close-button" aria-label="Fechar player">&times;</button>
      </div>
  
      <div className="video-container">
        {isLoading && (
          <div className="player-loading">
            <div className="spinner"></div>
            <p>Carregando vídeo...</p>
          </div>
        )}
        <video
          ref={videoRef}
          className="video-player"
          controls
          preload="auto"
          playsInline
          onCanPlay={handleVideoReady}
          onError={(e) => {
            console.error('Erro no elemento de vídeo:', e);
            setError('Erro ao carregar o vídeo. Tente novamente.');
          }}
        />
      </div>
    </div>
  );
};

export default PlayerFilmes;
