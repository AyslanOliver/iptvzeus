import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Home.css';

function Home() {
  const [favoriteChannels, setFavoriteChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteChannels');
    if (savedFavorites) {
      setFavoriteChannels(JSON.parse(savedFavorites));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('iptvUser');
    navigate('/'); // ou '/login' se sua rota de login for diferente
  };

  return (
    <div className="lobby-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1>IPTV Zeus</h1>
          <p className="hero-description">Acesso ilimitado a milhares de canais, filmes e séries</p>
        </div>
      </div>
      
      <div className="menu-options">
        <Link to="/canais" className="menu-button menu-button-primary">
          <i className="fas fa-tv"></i>
          <span>Canais ao Vivo</span>
        </Link>

        <Link to="/filmes" className="menu-button menu-button-movies">
          <i className="fas fa-film"></i>
          <span>Filmes</span>
        </Link>

        <Link to="/series" className="menu-button menu-button-series">
          <i className="fas fa-video"></i>
          <span>Séries</span>
        </Link>

        <Link to="/favoritos" className="menu-button menu-button-favorites">
          <i className="fas fa-heart"></i>
          <span>Favoritos</span>
          {favoriteChannels.length > 0 && (
            <span className="favorite-count">{favoriteChannels.length}</span>
          )}
        </Link>

        <Link to="/perfil" className="menu-button menu-button-profile">
          <i className="fas fa-user"></i>
          <span>Perfil</span>
        </Link>

        <button
          onClick={handleLogout}
          className="menu-button menu-button-logout"
          style={{
            marginTop: 12,
            background: '#e50914',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

export default Home;
