import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './PlayerSeries.css';
import { FaStepBackward, FaStepForward } from 'react-icons/fa';

function PlayerSeries({ series, onClose }) {
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [currentEpisodeData, setCurrentEpisodeData] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (series && series.episodes) {
      const episode = series.episodes.find(
        ep => ep.season === currentSeason && ep.episode === currentEpisode
      );
      setCurrentEpisodeData(episode);
    }
  }, [series, currentSeason, currentEpisode]);

  useEffect(() => {
    if (currentEpisodeData && currentEpisodeData.url) {
      const hls = new Hls();
      const videoElement = playerRef.current;

      hls.loadSource(currentEpisodeData.url);
      hls.attachMedia(videoElement);
      videoElement.load();

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          console.error('Erro ao carregar stream:', data);
          if (hls) {
            hls.destroy();
          }
        }
      });

      return () => {
        if (hls) {
          hls.destroy();
        }
      };
    }
  }, [currentEpisodeData]);

  const handleSeasonChange = (e) => {
    setCurrentSeason(Number(e.target.value));
    setCurrentEpisode(1); // Reset episódio ao mudar de temporada
  };

  const handleEpisodeChange = (e) => {
    setCurrentEpisode(Number(e.target.value));
  };

  const nextEpisode = () => {
    const episodes = series.episodes.filter(ep => ep.season === currentSeason);
    const currentIndex = episodes.findIndex(ep => ep.episode === currentEpisode);
    
    if (currentIndex < episodes.length - 1) {
      setCurrentEpisode(episodes[currentIndex + 1].episode);
    } else if (currentSeason < series.totalSeasons) {
      setCurrentSeason(currentSeason + 1);
      setCurrentEpisode(1);
    }
  };

  const previousEpisode = () => {
    const episodes = series.episodes.filter(ep => ep.season === currentSeason);
    const currentIndex = episodes.findIndex(ep => ep.episode === currentEpisode);
    
    if (currentIndex > 0) {
      setCurrentEpisode(episodes[currentIndex - 1].episode);
    } else if (currentSeason > 1) {
      const previousSeasonEpisodes = series.episodes.filter(ep => ep.season === currentSeason - 1);
      setCurrentSeason(currentSeason - 1);
      setCurrentEpisode(previousSeasonEpisodes[previousSeasonEpisodes.length - 1].episode);
    }
  };

  if (!series) return null;

  const seasons = Array.from(
    new Set(series.episodes.map(episode => episode.season))
  ).sort((a, b) => a - b);

  const episodes = series.episodes
    .filter(episode => episode.season === currentSeason)
    .sort((a, b) => a.episode - b.episode);

  return (
    <div className="player-series-container">
      <div className="player-header">
        <h2>{series.title}</h2>
        <button className="close-button" onClick={onClose}>&times;</button>
      </div>

      <div className="player-controls">
        <select value={currentSeason} onChange={handleSeasonChange}>
          {seasons.map(season => (
            <option key={season} value={season}>
              Temporada {season}
            </option>
          ))}
        </select>

        <select value={currentEpisode} onChange={handleEpisodeChange}>
          {episodes.map(episode => (
            <option key={episode.episode} value={episode.episode}>
              Episódio {episode.episode}
            </option>
          ))}
        </select>

        <div className="navigation-buttons">
          <button onClick={previousEpisode} disabled={currentSeason === 1 && currentEpisode === 1}>
            <FaStepBackward /> Anterior
          </button>
          <button onClick={nextEpisode} disabled={currentSeason === series.totalSeasons && currentEpisode === episodes[episodes.length - 1].episode}>
            Próximo <FaStepForward />
          </button>
        </div>
      </div>

      <div className="player-wrapper">
        <video
          ref={playerRef}
          controls
          autoPlay
          playsInline
          className="video-player"
        />
      </div>

      <div className="episode-info">
        <h3>Temporada {currentSeason} - Episódio {currentEpisode}</h3>
      </div>
    </div>
  );
}

export default PlayerSeries;