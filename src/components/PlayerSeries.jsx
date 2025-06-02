import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { FaPlay, FaPause, FaForward, FaBackward, FaStepForward, FaTimes, FaVolumeUp, FaVolumeMute, FaExpand, FaCompress, FaClosedCaptioning, FaLanguage } from 'react-icons/fa';
import './PlayerSeries.css';

const PlayerSeries = ({ serie, episodio, onClose, episodios = [], onNextEpisode, onProgressUpdate, initialProgress = 0 }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [availableTracks, setAvailableTracks] = useState({ audio: [], subtitles: [] });
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(null);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState(null);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [trackMenuType, setTrackMenuType] = useState(null); // 'audio' ou 'subtitles'
  const controlsTimeoutRef = useRef(null);
  const playPromiseRef = useRef(null);
  const abortControllerRef = useRef(new AbortController());
  const [progress, setProgress] = useState(initialProgress);

  // Função para formatar o tempo
  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Função para atualizar o tempo atual
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setCurrentTime(videoRef.current.currentTime);
      setProgress(currentProgress);
      onProgressUpdate(episodio.id, currentProgress);
    }
  };

  // Função para atualizar a duração
  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Função para carregar faixas de áudio e legendas
  const loadTracks = () => {
    if (videoRef.current) {
      const audioTracks = Array.from(videoRef.current.audioTracks || []);
      const textTracks = Array.from(videoRef.current.textTracks || []);

      setAvailableTracks({
        audio: audioTracks.map(track => ({
          id: track.id,
          label: track.label || `Áudio ${track.language || 'Desconhecido'}`,
          language: track.language,
          kind: track.kind
        })),
        subtitles: textTracks.map(track => ({
          id: track.id,
          label: track.label || `Legenda ${track.language || 'Desconhecido'}`,
          language: track.language,
          kind: track.kind
        }))
      });

      // Selecionar primeira faixa de áudio por padrão
      if (audioTracks.length > 0) {
        setSelectedAudioTrack(audioTracks[0].id);
      }

      // Desativar legendas por padrão
      setSelectedSubtitleTrack('off');
    }
  };

  // Função para mudar faixa de áudio
  const changeAudioTrack = (trackId) => {
    if (videoRef.current) {
      const audioTracks = videoRef.current.audioTracks;
      for (let i = 0; i < audioTracks.length; i++) {
        audioTracks[i].enabled = audioTracks[i].id === trackId;
      }
      setSelectedAudioTrack(trackId);
    }
  };

  // Função para mudar legenda
  const changeSubtitleTrack = (trackId) => {
    if (videoRef.current) {
      const textTracks = videoRef.current.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = textTracks[i].id === trackId ? 'showing' : 'hidden';
      }
      setSelectedSubtitleTrack(trackId);
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

  // Função para alternar tela inteira
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Erro ao entrar em tela inteira: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (initialProgress > 0) {
        video.currentTime = (initialProgress / 100) * video.duration;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [episodio.id, initialProgress]);

  // Efeito para monitorar mudanças no estado de tela inteira
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
    <div className="player-container" onMouseMove={handleMouseMove} ref={containerRef}>
      {isLoading && (
        <div className="player-loading">
          <div className="spinner"></div>
          <p>Carregando vídeo...</p>
        </div>
      )}

      <div className="player-header">
        <h2>{serie.name} - {episodio.title || `Episódio ${episodio.episode_num}`}</h2>
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          className="video-player"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={loadTracks}
        />
      </div>

      <div className={`player-controls ${showControls ? 'visible' : 'hidden'}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
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
          <div className="volume-control">
            <button onClick={toggleMute} className="control-button">
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
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
          <div className="track-controls">
            <button 
              className="control-button"
              onClick={() => {
                setTrackMenuType('audio');
                setShowTrackMenu(!showTrackMenu);
              }}
            >
              <FaLanguage />
            </button>
            <button 
              className="control-button"
              onClick={() => {
                setTrackMenuType('subtitles');
                setShowTrackMenu(!showTrackMenu);
              }}
            >
              <FaClosedCaptioning />
            </button>
          </div>
          {episodios && episodios.length > 0 && (
            <button
              className="control-button"
              onClick={() => {
                const idx = episodios.findIndex(ep => ep.id === episodio.id);
                if (idx !== -1 && idx < episodios.length - 1) {
                  onNextEpisode(episodios[idx + 1]);
                }
              }}
              disabled={episodios.findIndex(ep => ep.id === episodio.id) === episodios.length - 1}
            >
              <FaStepForward />
            </button>
          )}
          <button onClick={toggleFullscreen} className="control-button fullscreen-button">
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>

        {showTrackMenu && (
          <div className="track-menu">
            <h3>{trackMenuType === 'audio' ? 'Áudio' : 'Legendas'}</h3>
            <div className="track-options">
              {trackMenuType === 'audio' ? (
                <>
                  {availableTracks.audio.map(track => (
                    <button
                      key={track.id}
                      className={`track-option ${selectedAudioTrack === track.id ? 'selected' : ''}`}
                      onClick={() => {
                        changeAudioTrack(track.id);
                        setShowTrackMenu(false);
                      }}
                    >
                      {track.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    className={`track-option ${selectedSubtitleTrack === 'off' ? 'selected' : ''}`}
                    onClick={() => {
                      changeSubtitleTrack('off');
                      setShowTrackMenu(false);
                    }}
                  >
                    Desativado
                  </button>
                  {availableTracks.subtitles.map(track => (
                    <button
                      key={track.id}
                      className={`track-option ${selectedSubtitleTrack === track.id ? 'selected' : ''}`}
                      onClick={() => {
                        changeSubtitleTrack(track.id);
                        setShowTrackMenu(false);
                      }}
                    >
                      {track.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSeries;