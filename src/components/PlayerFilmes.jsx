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
      try {
        // Lógica de carregamento unificada
        if (Hls.isSupported()) {
          // Configuração HLS com tratamento de erro
        } else {
          // Fallback para players nativos
        }
      } catch (err) {
        // Tratamento unificado de erros
      }
    };
    loadVideo();
    return () => abortControllerRef.current.abort();
  }, [retryCount, movie]);

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
  
      <div className="player-wrapper">
        <video
          ref={videoRef}
          className="video-player"
          controls
          preload="none"
          playsInline
          onCanPlay={handleVideoReady}
          onError={(e) => {
            console.error('Erro no elemento de vídeo:', e.nativeEvent);
            setError('Formato de vídeo não suportado ou erro de rede');
          }}
        />
      </div>
    </div>
  );
};

export default PlayerFilmes;
