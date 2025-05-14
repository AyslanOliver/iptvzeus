import { useState } from 'react';
import './Filmes.css';

function Filmes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilme, setSelectedFilme] = useState(null);
  const [filmes] = useState([
    {
      id: 1,
      title: 'O Poderoso Chefão',
      year: 1972,
      duration: '2h 55min',
      thumbnail: 'https://example.com/godfather.jpg',
      categories: ['Crime', 'Drama'],
      url: 'https://example.com/video/godfather.mp4'
    },
    // Adicione mais filmes aqui
  ]);

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

      {selectedFilme && (
        <div className="player-modal" onClick={handleClosePlayer}>
          <div className="player-content" onClick={e => e.stopPropagation()}>
            <video
              className="player-video"
              src={selectedFilme.url}
              controls
              autoPlay
            />
            <div className="player-info">
              <h2>{selectedFilme.title}</h2>
              <p>{selectedFilme.year} • {selectedFilme.duration}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Filmes;
