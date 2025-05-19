import React, { useState, useEffect } from 'react';
import PlayerSeries from './components/PlayerSeries';
import './Series.css';

const USERNAME = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).username : '';
const PASSWORD = localStorage.getItem('iptvUser') ? JSON.parse(localStorage.getItem('iptvUser')).password : '';
const DNS = 'http://nxczs.top';

const Series = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchWithRetry = async (retryCount) => {
    try {
      const response = await fetch(
        `${DNS}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_series`,
        {
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        throw new Error(`Falha ao carregar séries: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        return JSON.parse(cleanText);
      }
    } catch (err) {
      console.error(`Tentativa ${retryCount} falhou:`, err);
      return null;
    }
  };

  // Modified series loading
  useEffect(() => {
    const loadSeries = async () => {
      if (!USERNAME || !PASSWORD) {
        setError('Credenciais não encontradas');
        setLoading(false);
        return;
      }

      const MAX_RETRIES = 3;
      let retryCount = 0;
      let data = null;

      while (retryCount < MAX_RETRIES && !data) {
        data = await fetchWithRetry(retryCount);
        
        if (!data) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            throw new Error(`Falha após ${MAX_RETRIES} tentativas`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }

      try {
        const seriesArray = Array.isArray(data) ? data : Object.values(data);
        const validSeries = seriesArray
          .filter(item => item && item.name && item.series_id)
          .sort((a, b) => a.name.localeCompare(b.name));

        console.log('Total series loaded:', validSeries.length);
        setSeries(validSeries);
        setError(null);
      } catch (err) {
        console.error('Error loading series:', err);
        setError(`Erro ao carregar séries: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, []);

  const handleSeriesSelect = async (series) => {
    try {
      const response = await fetch(
        `${DNS}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_series_info&series_id=${series.series_id}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch series info: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        data = JSON.parse(cleanText);
      }

      if (!data) {
        throw new Error('Invalid series data received');
      }

      if (data.episodes) {
        const episodesList = [];
        Object.entries(data.episodes).forEach(([season, episodes]) => {
          episodes.forEach(episode => {
            episodesList.push({
              season: parseInt(season),
              episode: episode.episode_num,
              title: episode.title || `Episódio ${episode.episode_num}`,
              url: episode.container_extension === 'm3u8' ? episode.direct_source : null
            });
          });
        });
        
        const seriesData = {
          title: series.name,
          episodes: episodesList,
          totalSeasons: Object.keys(data.episodes).length
        };
        
        setSelectedSeries(seriesData);
      }
    } catch (err) {
      console.error('Error fetching series info:', err);
      setError(`Erro ao carregar informações da série: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading series...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  const handleEpisodeSelect = (episode) => {
    setSelectedEpisode(episode);
    setIsPlaying(true);
  };

  return (
    <div className="series-container">
      <h2>Séries</h2>
      <div className="series-list">
        {series.map((serie) => (
          <div
            key={serie.series_id}
            className="series-item"
            onClick={() => handleSeriesSelect(serie)}
          >
            <img src={serie.cover} alt={serie.name} />
            <span>{serie.name}</span>
          </div>
        ))}
      </div>
      {selectedSeries && (
        <div className="series-details">
          <h2>{selectedSeries.title}</h2>
          <div className="episodes-list">
            {selectedSeries.episodes && selectedSeries.episodes.map((ep, idx) => (
              <div
                key={idx}
                className="episode-item"
                onClick={() => handleEpisodeSelect(ep)}
              >
                <span>Temporada {ep.season} - Episódio {ep.episode}: {ep.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {isPlaying && selectedEpisode && (
        <PlayerSeries episode={selectedEpisode} onClose={() => setIsPlaying(false)} />
      )}
    </div>
  );
};

export default Series;
  