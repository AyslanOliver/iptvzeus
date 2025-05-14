import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './PlayerFilmes.css';
import { FaPlay, FaPause, FaExpand, FaCompress, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

function PlayerFilmes({ movie, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (movie && movie.streamUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;

        // Configurar URL do stream usando as credenciais do usuário
        const username = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).username : '';
        const password = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).password : '';
        const streamUrl = `http://nxczs.top/movie/${username}/${password}/${movie.stream_id}.${movie.container_extension}`;

        hls.loadSource(streamUrl);
        hls.attachMedia(playerRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (playerRef.current) {
            playerRef.current.play().catch(error => {
              console.error('Erro ao iniciar reprodução:', error);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('Erro fatal no HLS:', data);
            hls.destroy();
          }
        });

        return () => {
          if (hls) {
            hls.destroy();
          }
        };
      }
    }
  }, [movie]);

  useEffect(() => {
    const videoElement = playerRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setProgress((videoElement.currentTime / videoElement.duration) * 100);
      setDuration(videoElement.duration);
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => videoElement.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      const newMutedState = !isMuted;
      playerRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        playerRef.current.volume = 0;
        setVolume(0);
      } else {
        playerRef.current.volume = 1;
        setVolume(1);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration;
    if (playerRef.current) {
      playerRef.current.currentTime = newTime;
      setProgress(e.target.value);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!movie) return null;

  return (
    <div className="player-filmes-container" ref={containerRef}>
      <div className="player-header">
        <h2>{movie.title}</h2>
        <button className="close-button" onClick={onClose}>&times;</button>
      </div>

      <div className="player-wrapper">
        <video
          ref={playerRef}
          className="video-player"
          playsInline
        />

        <div className="player-controls">
          <div className="progress-bar">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              className="progress-slider"
            />
            <div className="time-display">
              <span>{formatTime(playerRef.current?.currentTime || 0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="control-buttons">
            <button onClick={togglePlay} className="control-button">
              {isPlaying ? <FaPause /> : <FaPlay />}
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

            <button onClick={toggleFullscreen} className="control-button">
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        </div>
      </div>

      {movie.info && (
        <div className="movie-info">
          <p className="movie-description">{movie.info}</p>
          {movie.year && <p className="movie-year">Ano: {movie.year}</p>}
          {movie.genre && <p className="movie-genre">Gênero: {movie.genre}</p>}
        </div>
      )}
    </div>
  );
}

export default PlayerFilmes;