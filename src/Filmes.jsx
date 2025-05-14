import { useState, useEffect } from 'react';
import './Filmes.css';
import PlayerFilmes from './components/PlayerFilmes';

function Filmes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilme, setSelectedFilme] = useState(null);
  const [filmes, setFilmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFilmes = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        const response = await fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_vod_streams`);
        if (!response.ok) {
          throw new Error('Falha ao carregar filmes');
        }

        const data = await response.json();
        setFilmes(data.map(filme => ({
          id: filme.stream_id,
          title: filme.name,
          year: filme.year || 'N/A',
          duration: filme.duration || 'N/A',
          thumbnail: filme.stream_icon || 'https://via.placeholder.com/300x450',
          categories: filme.category_id ? [filme.category_id] : [],
          stream_id: filme.stream_id,
          container_extension: filme.container_extension || 'mp4'
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFilmes();
  }, []);

  const filteredFilmes = filmes.filter(filme =>
    filme.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilmeClick = (filme) => {
    setSelectedFilme(filme);
  };

  const handleClosePlayer = () => {
    setSelectedFilme(null);
  };

  return (
    <div className="filmes-page">
      <div className="filmes-header">
        <h1 className="filmes-title">Filmes</h1>
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar filmes..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="filmes-grid">
        {filteredFilmes.map(filme => (
          <div
            key={filme.id}
            className="filme-card"
            onClick={() => handleFilmeClick(filme)}
          >
            <img
              src={filme.thumbnail}
              alt={filme.title}
              className="filme-thumbnail"
            />
            <div className="filme-info">
              <h3 className="filme-title">{filme.title}</h3>
              <div className="filme-details">
                <span className="filme-year">
                  <i className="fas fa-calendar"></i>
                  {filme.year}
                </span>
                <span className="filme-duration">
                  <i className="fas fa-clock"></i>
                  {filme.duration}
                </span>
              </div>
              <div className="filme-categories">
                {filme.categories.map((category, index) => (
                  <span key={index} className="filme-category">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="loading">Carregando filmes...</div>}
      {error && <div className="error">{error}</div>}
      {selectedFilme && <PlayerFilmes movie={selectedFilme} onClose={handleClosePlayer} />}
    </div>
  );
}

export default Filmes;
