import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="lobby-container">
      <h1>Menu Principal</h1>

      <div className="menu-options">
        <Link to="/canais" className="menu-button">
          📺 Canais
        </Link>

        <Link to="/filmes" className="menu-button">
          🎬 Filmes
        </Link>

        <Link to="/series" className="menu-button">
          📺 Séries
        </Link>
      </div>
    </div>
  );
}

export default Home;
