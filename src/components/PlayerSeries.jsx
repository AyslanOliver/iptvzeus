import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaPlay, FaPause, FaForward, FaBackward, FaStepForward, FaTimes, FaVolumeUp, FaVolumeMute, FaExpand, FaCompress, FaClosedCaptioning, FaLanguage } from 'react-icons/fa';
import Hls from 'hls.js';
import './PlayerSeries.css';

const PlayerSeries = ({ serie, episodio, onClose, episodios = [], onNextEpisode, onProgressUpdate, initialProgress = 0 }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const [Hls, setHls] = useState(null);
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
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      
      if (duration > 0) {
        const currentProgress = (currentTime / duration) * 100;
        setCurrentTime(currentTime);
        setProgress(currentProgress);
        
        // Salvar o progresso no localStorage
        const progressData = {
          time: currentTime,
          progress: currentProgress,
          timestamp: Date.now()
        };
        localStorage.setItem(`progress_${episodio.id}`, JSON.stringify(progressData));
        
        // Notificar o componente pai sobre o progresso
        onProgressUpdate(episodio.id, currentProgress);
      }
    }
  };

  // Função para lidar com o clique na barra de progresso
  const handleProgressBarClick = (e) => {
    if (videoRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = clickPosition * videoRef.current.duration;
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(clickPosition * 100);
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

  const loadVideo = useCallback(async () => {
    if (!episodio || !episodio.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem('iptvUser'));
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Carregar progresso salvo
      const savedProgress = localStorage.getItem(`progress_${episodio.id}`);
      let savedTime = 0;
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        savedTime = progressData.time;
        setProgress(progressData.progress);
        setCurrentTime(progressData.time);
      }

      // Gera a URL do stream
      const streamUrl = episodio.url || `http://nxczs.top/series/${user.username}/${user.password}/${episodio.id}.mp4`;
      console.log('URL do stream:', streamUrl);

      // Verifica a extensão do arquivo para decidir o método de reprodução
      const isHls = streamUrl.toLowerCase().endsWith('.m3u8');
      const canPlayMp4Natively = videoRef.current.canPlayType('video/mp4');

      // Limpa a fonte anterior antes de definir a nova
      if (videoRef.current) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (savedTime > 0) {
            videoRef.current.currentTime = savedTime;
          }
          videoRef.current.play().catch(err => {
            console.error('Erro ao iniciar reprodução:', err);
            setError('Erro ao iniciar a reprodução. Tente novamente.');
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('Erro fatal no HLS:', data);
            setError('Erro ao carregar o vídeo. Tente novamente.');
          }
        });
      } else if (canPlayMp4Natively) {
        videoRef.current.src = streamUrl;
        if (savedTime > 0) {
          videoRef.current.currentTime = savedTime;
        }
        videoRef.current.play().catch(err => {
          console.error('Erro ao iniciar reprodução:', err);
          setError('Erro ao iniciar a reprodução. Tente novamente.');
        });
      } else {
        throw new Error('Formato de vídeo não suportado');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar vídeo:', error);
      setError(error.message || 'Erro ao carregar o vídeo');
      setIsLoading(false);
    }
  }, [episodio, Hls]);

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

  // Efeito para carregar o vídeo quando o componente montar ou quando Hls mudar
  useEffect(() => {
    const abortController = abortControllerRef.current;
    
    if (serie && episodio && Hls) {
      loadVideo();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {}); // Ignora erros de reprodução ao desmontar
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [serie, episodio, Hls, loadVideo]);

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

  // Efeito para salvar o progresso periodicamente
  useEffect(() => {
    const saveProgressInterval = setInterval(() => {
      if (videoRef.current && videoRef.current.duration > 0) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        const currentProgress = (currentTime / duration) * 100;
        
        const progressData = {
          time: currentTime,
          progress: currentProgress,
          timestamp: Date.now()
        };
        localStorage.setItem(`progress_${episodio.id}`, JSON.stringify(progressData));
      }
    }, 1000); // Salva a cada segundo

    return () => {
      clearInterval(saveProgressInterval);
    };
  }, [episodio.id]);

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
          <div 
            className="progress-bar"
            onClick={handleProgressBarClick}
          >
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