import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js/dist/hls.min.js';
import { FaPlay, FaPause, FaForward, FaBackward, FaStepForward, FaTimes } from 'react-icons/fa';
import './PlayerSeries.css';

const PlayerSeries = ({ serie, episodio, onClose, episodios = [], onNextEpisode }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const controlsTimeoutRef = useRef(null);
  const playPromiseRef = useRef(null);
  const abortControllerRef = useRef(new AbortController());

  // Função para formatar o tempo
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Função para atualizar o tempo atual
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Função para atualizar a duração
  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Função para play/pause
  const togglePlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          await videoRef.current.pause();
        } else {
          // Cancela qualquer reprodução anterior
          if (playPromiseRef.current) {
            try {
              await playPromiseRef.current;
            } catch (e) {
              // Ignora erros de reprodução anterior
            }
          }
          
          playPromiseRef.current = videoRef.current.play();
          await playPromiseRef.current;
        }
        setIsPlaying(!isPlaying);
      } catch (err) {
        console.error('Erro ao alternar reprodução:', err);
        setError('Erro ao controlar a reprodução. Tente novamente.');
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  // Função para avançar 10 segundos
  const handleForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  };

  // Função para retroceder 10 segundos
  const handleBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  };

  // Função para pular abertura
  const handleSkipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 90; // Pula para 1:30
    }
  };

  // Função para controlar o volume
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  // Função para mutar/desmutar
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Função para mostrar/esconder controles
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Função para carregar o vídeo
  const loadVideo = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('iptvUser'));
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Gera a URL do stream
      const streamUrl = `http://nxczs.top/series/${user.username}/${user.password}/${episodio.id}.mp4`;
      console.log('URL do stream:', streamUrl);

      // Verifica a extensão do arquivo para decidir o método de reprodução
      const isHls = streamUrl.toLowerCase().endsWith('.m3u8');
      const canPlayMp4Natively = videoRef.current.canPlayType('video/mp4');

      // Limpa a fonte anterior antes de definir a nova
      if (videoRef.current) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load(); // Recarrega para limpar o estado anterior
      }

      if (isHls && Hls.isSupported()) {
        // Usar HLS.js para streams HLS
        console.log('Tentando reproduzir com HLS.js');
        const hls = new Hls({
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          lowLatencyMode: true,
          debug: true,
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

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          console.log('Manifesto carregado');
          try {
            // Cancela qualquer reprodução anterior
            if (playPromiseRef.current) {
              try {
                await playPromiseRef.current;
              } catch (e) {
                // Ignora erros de reprodução anterior
              }
            }
            
            playPromiseRef.current = videoRef.current.play();
            await playPromiseRef.current;
            setIsPlaying(true);
            setIsLoading(false);
          } catch (err) {
            console.error('Erro ao iniciar reprodução:', err);
            setError('Erro ao iniciar a reprodução. Por favor, tente novamente.');
          } finally {
            playPromiseRef.current = null;
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('Erro HLS:', event, data);
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
      } else if (!isHls && canPlayMp4Natively !== '') {
        // Usar player nativo para outros formatos (como MP4) se o navegador indicar suporte
        console.log('Tentando reproduzir com player nativo (MP4)');
        videoRef.current.src = streamUrl;
        // Espera pelo evento loadedmetadata antes de tentar dar play
        videoRef.current.addEventListener('loadedmetadata', async () => {
           console.log('Metadados do vídeo carregados (Native Player)');
           try {
             // Cancela qualquer reprodução anterior
             if (playPromiseRef.current) {
               try {
                 await playPromiseRef.current;
               } catch (e) {
                 // Ignora erros de reprodução anterior
               }
             }

             playPromiseRef.current = videoRef.current.play();
             await playPromiseRef.current;
             setIsPlaying(true);
             setIsLoading(false);
             console.log('Reprodução nativa iniciada com sucesso');
           } catch (err) {
             console.error('Erro ao iniciar reprodução (Native Player):', err);
             setError('Erro ao iniciar a reprodução nativa. Tente novamente.');
           } finally {
             playPromiseRef.current = null;
           }
        }, { once: true }); // Usar once: true para remover o listener após o disparo

      } else if (isHls && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback nativo do Safari para HLS
        console.log('Tentando reproduzir com Native HLS Fallback');
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', async () => {
          console.log('Metadados do vídeo carregados (Native HLS Fallback)');
          try {
            // Cancela qualquer reprodução anterior
            if (playPromiseRef.current) {
              try {
                await playPromiseRef.current;
              } catch (e) {
                // Ignora erros de reprodução anterior
              }
            }

            playPromiseRef.current = videoRef.current.play();
            await playPromiseRef.current;
            setIsPlaying(true);
            setIsLoading(false);
          } catch (err) {
            console.error('Erro ao iniciar reprodução (Native HLS Fallback):', err);
            setError('Erro ao iniciar a reprodução. Por favor, tente novamente.');
          } finally {
            playPromiseRef.current = null;
          }
        });
      } else {
        setError('Seu navegador não suporta a reprodução deste tipo de vídeo.');
      }
    } catch (err) {
      console.error('Erro ao carregar stream:', err);
      setError('Erro ao carregar o vídeo. Por favor, tente novamente.');
    }
  };

  // Efeito para carregar o vídeo quando o componente montar
  useEffect(() => {
    if (serie && episodio) {
      loadVideo();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {}); // Ignora erros de reprodução ao desmontar
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [serie, episodio]);

  // Efeito para lidar com a tecla ESC
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

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
    <div className="player-container" onMouseMove={handleMouseMove}>
      {isLoading && (
        <div className="player-loading">
          <div className="spinner"></div>
          <p>Carregando vídeo...</p>
        </div>
      )}

      <video
        ref={videoRef}
        className="player-video"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className={`player-controls ${showControls ? 'visible' : 'hidden'}`}>
        <div className="progress-bar">
          <div 
            className="progress-filled"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="control-buttons">
          <button onClick={togglePlay} className="control-button">
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button onClick={handleBackward} className="control-button">
            <FaBackward />
          </button>
          <button onClick={handleForward} className="control-button">
            <FaForward />
          </button>
          <button onClick={handleSkipIntro} className="control-button skip-intro">
            Pular Abertura
          </button>
          <div className="volume-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      <div className="player-info">
        <div className="player-title">
          <h2>{serie.name}</h2>
          <h3>{episodio.title || `Episódio ${episodio.episode_num}`}</h3>
        </div>
        <div className="player-actions">
          {episodios && episodios.length > 0 && (
            <button
              className="player-next"
              onClick={() => {
                const idx = episodios.findIndex(ep => ep.id === episodio.id);
                if (idx !== -1 && idx < episodios.length - 1) {
                  const proximoEpisodio = episodios[idx + 1];
                  console.log('Próximo episódio:', proximoEpisodio);
                  onNextEpisode(proximoEpisodio);
                }
              }}
              disabled={episodios.findIndex(ep => ep.id === episodio.id) === episodios.length - 1}
            >
              <FaStepForward /> Próximo
            </button>
          )}
          <button className="player-close" onClick={onClose}>
            <FaTimes /> Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerSeries;