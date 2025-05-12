import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './Series.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

function Series() {
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [seriesData, setSeriesData] = useState([]);
  const [visibleSeries, setVisibleSeries] = useState([]);
  const [page, setPage] = useState(1);
  const seriesPerPage = 20;
  const [favoriteSeries, setFavoriteSeries] = useState([]);

  const [categories, setCategories] = useState(['all']);

  const filteredSeries = seriesData.filter(serie => {
    const matchesSearch = serie.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || serie.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteSeries');
    if (savedFavorites) {
      setFavoriteSeries(JSON.parse(savedFavorites));
    }
  }, []);

  useEffect(() => {
    setSelectedCategory('all');
  }, []);

  const toggleFavorite = (series) => {
    const newFavorites = favoriteSeries.includes(series.id)
      ? favoriteSeries.filter(id => id !== series.id)
      : [...favoriteSeries, series.id];
    
    setFavoriteSeries(newFavorites);
    localStorage.setItem('favoriteSeries', JSON.stringify(newFavorites));
  };

  const loadMoreSeries = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    const start = 0;
    const end = page * seriesPerPage;
    setVisibleSeries(filteredSeries.slice(start, end));
  }, [page, filteredSeries]);

  useEffect(() => {
    const loadSeries = async () => {
      setLoading(true);
      try {
        const userData = JSON.parse(localStorage.getItem('iptvUser'));
        if (!userData) {
          console.error('Usuário não autenticado');
          setLoading(false);
          return;
        }
        const response = await fetch(
          `http://nxczs.top/get.php?username=${userData.username}&password=${userData.password}&type=m3u_plus&output=m3u8`,
          { timeout: 10000 }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const m3uContent = await response.text();
        const series = parseSeries(m3uContent);
        setSeriesData(series);
        // Atualiza categorias dinamicamente
        const cats = Array.from(new Set(series.map(s => s.category).filter(Boolean)));
        setCategories(['all', ...cats]);
      } catch (error) {
        console.error('Erro ao carregar séries:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSeries();
  }, []);

  const parseSeries = (m3uContent) => {
    const lines = m3uContent.split('\n');
    const series = [];
    let currentSerie = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
      if (line.startsWith('#EXTINF')) {
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        if (!groupMatch || !groupMatch[1].toLowerCase().includes('serie')) continue;
        const titleMatch = line.match(/tvg-name="([^"]+)"/i);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        if (titleMatch) {
          // Extrai temporada e episódio se houver
          const info = titleMatch[1].match(/(.+?)(?:\s+[Tt]?(\d+)[Ee](\d+))?$/);
          const [, title, season = '1', episode = '1'] = info || [];
          currentSerie = {
            id: Math.random().toString(36).substr(2, 9),
            title: title ? title.trim() : titleMatch[1],
            image: logoMatch ? logoMatch[1] : 'https://via.placeholder.com/200x280',
            category: groupMatch[1],
            season: parseInt(season),
            episode: parseInt(episode),
            url: nextLine.startsWith('http') ? nextLine : null
          };
          if (currentSerie.url) {
            let existing = series.find(s => s.title === currentSerie.title && s.category === currentSerie.category);
            if (existing) {
              existing.episodes = existing.episodes || [];
              existing.episodes.push({ season: currentSerie.season, episode: currentSerie.episode, url: currentSerie.url });
              existing.totalSeasons = Math.max(existing.totalSeasons || 1, currentSerie.season);
              existing.totalEpisodes = (existing.episodes || []).length;
            } else {
              currentSerie.episodes = [{ season: currentSerie.season, episode: currentSerie.episode, url: currentSerie.url }];
              currentSerie.totalSeasons = currentSerie.season;
              currentSerie.totalEpisodes = 1;
              series.push(currentSerie);
            }
          }
        }
      }
    }
    return series;
  };

  return (
    <div className="series-page">
      <div className="series-header">
        <h1>Séries</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar séries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="categories">
        {categories.map(category => (
          <button
            key={category}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <span>Carregando séries...</span>
        </div>
      ) : (
        <div className="series-grid">
          {visibleSeries.map(serie => (
            <div key={serie.id} className="serie-card">
              <img src={serie.image} alt={serie.title} className="serie-image" />
              <div className="serie-info">
                <h3 className="serie-title">{serie.title}</h3>
                <div className="serie-details">
                  <p>{serie.totalSeasons} Temporadas | {serie.totalEpisodes} Episódios</p>
                </div>
                <button
                  className="favorite-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(serie);
                  }}
                >
                  {favoriteSeries.includes(serie.id) ? <FaHeart /> : <FaRegHeart />}
                </button>
              </div>
            </div>
          ))}
          {visibleSeries.length < filteredSeries.length && (
            <button className="load-more" onClick={loadMoreSeries}>
              Carregar mais séries
            </button>
          )}
        </div>
      )}
    </div>
  );
}
  
  export default Series;
  