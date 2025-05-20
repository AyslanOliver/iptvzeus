import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Home.css';

const opcoes = [
  {
    label: 'TV ao Vivo',
    icon: 'fas fa-tv',
    rota: '/canais',
    destaque: true
  },
  {
    label: 'Filmes',
    icon: 'fas fa-film',
    rota: '/filmes'
  },
  {
    label: 'Séries',
    icon: 'fas fa-video',
    rota: '/series'
  },
  {
    label: 'Configurações',
    icon: 'fas fa-cog',
    rota: '/configuracoes'
  },
  {
    label: 'Lista',
    icon: 'fas fa-list',
    rota: '/lista'
  }
];

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
    <div className="home-bg">
      <div className="home-logo">
        <span className="logo-icone" />
        <span className="logo-texto">Zeus <span className="logo-iptv">IPTV</span></span>
      </div>
      <div className="home-panel">
        {opcoes.map((opcao, idx) => (
          <button
            key={opcao.label}
            className={`home-btn${opcao.destaque ? ' destaque' : ''}`}
            onClick={() => navigate(opcao.rota)}
            style={{ gridArea: opcao.destaque && window.innerWidth > 600 ? 'tv' : undefined }}
          >
            <i className={opcao.icon}></i>
            <span>{opcao.label}</span>
          </button>
        ))}
      </div>
      <div className="home-chamada">CONFIGURE e ASSISTA!</div>
    </div>
  );
}

export default Home;
