import React, { useState, useEffect, useCallback } from 'react';
import './Filmes.css';
import PlayerFilmes from './components/PlayerFilmes';
import Hls from 'hls.js';
import ModalDetalhesFilme from './components/ModalDetalhesFilme';
import Navigation from './components/Navigation';
import { FaSearch, FaPlay, FaFilm, FaCog, FaVideo } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Componente de imagem com fallback
const FilmeThumbnail = ({ src, alt, title }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const MAX_RETRIES = 3;
  const FALLBACK_IMAGE = 'https://via.placeholder.com/200x300?text=Sem+Imagem';

  const handleError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      // Tenta recarregar a imagem após um delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImgSrc(`${src}?retry=${retryCount + 1}`);
      }, 1000 * Math.pow(2, retryCount)); // Backoff exponencial
    } else {
      setError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  }, [retryCount, src]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  return (
    <div className="filme-thumbnail-container">
      {isLoading && <div className="thumbnail-loading">Carregando...</div>}
      <img
        src={imgSrc}
        alt={alt || title}
        className={`filme-thumbnail ${error ? 'error' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        style={{ display: error ? 'none' : 'block' }}
      />
      {error && (
        <div 
          className="filme-thumbnail error"
          style={{
            backgroundImage: `url(${FALLBACK_IMAGE})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
    </div>
  );
};

function Filmes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilme, setSelectedFilme] = useState(null);
  const [filmes, setFilmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playerLoading, setPlayerLoading] = useState(false);
  const [modalFilme, setModalFilme] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) return;
        
        const response = await fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_vod_categories`);
        if (!response.ok) return;
        
        const data = await response.json();
        setCategories(data.map(cat => ({
          category_id: cat.category_id,
          category_name: cat.category_name
        })));
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      }
    };
    
    const fetchFilmes = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        const categoryParam = selectedCategory !== 'all' ? `&category_id=${selectedCategory}` : '';
        const response = await fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=get_vod_streams${categoryParam}`);
        if (!response.ok) {
          throw new Error(`Falha ao carregar filmes: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // Remove caracteres inválidos e tenta parsear novamente
          const cleanText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          data = JSON.parse(cleanText);
        }

        if (!data || !Array.isArray(data)) {
          throw new Error('Dados inválidos recebidos da API');
        }

        setFilmes(data.map(filme => ({
          id: filme.stream_id,
          title: filme.name,
          year: filme.year || 'N/A',
          duration: filme.duration || 'N/A',
          thumbnail: filme.stream_icon || 'https://via.placeholder.com/200x350',
          category_id: filme.category_id || '',
          stream_id: filme.stream_id,
          container_extension: filme.container_extension || 'mp4',
          description: filme.description || 'Sem descrição disponível'
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
    fetchFilmes();
  }, [selectedCategory]);

  const filteredFilmes = useCallback(() => {
    let result = Array.isArray(filmes) ? filmes : [];
    
    if (selectedCategory !== 'all') {
      result = result.filter(filme => filme.category_id === selectedCategory);
    }
    
    if (searchTerm) {
      result = result.filter(filme => 
        filme.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return result;
  }, [filmes, selectedCategory, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilmeClick = (filme) => {
    setModalFilme(filme);
  };

  const handleAssistir = () => {
    setSelectedFilme(modalFilme);
    setPlayerLoading(true);
    setModalFilme(null);
  };

  const handleClosePlayer = () => {
    setSelectedFilme(null);
  };

  const predefinedCategories = React.useMemo(() => [
    {
      category_id: 'genero',
      category_name: 'Gêneros',
      subcategories: [
        { category_id: 'acao', category_name: 'Ação' },
        { category_id: 'comedia', category_name: 'Comédia' },
        { category_id: 'drama', category_name: 'Drama' },
        { category_id: 'terror', category_name: 'Terror' }
      ]
    },
    {
      category_id: 'ano',
      category_name: 'Ano de Lançamento',
      subcategories: [
        { category_id: '2020s', category_name: '2020-' },
        { category_id: '2010s', category_name: '2010-2019' },
        { category_id: '2000s', category_name: '2000-2009' }
      ]
    }
  ], []);

  return (
    <div className="filmes-container">
      {/* Barra fixa topo */}
      <div className="canais-topbar">
        <div className="titulo">Filmes</div>
        <div className="search-box">
          <FaSearch style={{marginRight:8, color:'#ffea70'}} />
          <input
            className="search-input"
            type="text"
            placeholder="Pesquisar"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="topbar-actions">
          <button className="topbar-icon" onClick={() => navigate('/')}><FaPlay /></button>
          <button className="topbar-icon" onClick={() => navigate('/filmes')}><FaFilm /></button>
          <button className="topbar-icon" onClick={() => navigate('/series')}><FaVideo /></button>
          <button className="topbar-icon" onClick={() => navigate('/configuracoes')}><FaCog /></button>
        </div>
      </div>
      <div className="filmes-page">
        {/* Sidebar para categorias */}
        <div className="categories-sidebar">
          <h2>Categorias</h2>
          <div className="categories-list">
            <div 
              className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <i className="fas fa-film"></i>
              <span>Todas Categorias</span>
            </div>
            {categories.map(category => (
              <div 
                key={category.category_id} 
                className={`category-item ${selectedCategory === category.category_id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.category_id)}
              >
                <i className="fas fa-folder"></i>
                <span>{category.category_name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo principal dos filmes */}
        <div className="filmes-main-content">
          <div className="filmes-grid">
            {filteredFilmes().map(filme => (
              <div
                key={filme.id}
                className="filme-card"
                onClick={() => handleFilmeClick(filme)}
              >
                <FilmeThumbnail
                  src={filme.thumbnail}
                  alt={filme.title}
                  title={filme.title}
                />
                <div className="filme-info">
                  <h3 className="filme-title">{filme.title}</h3>
                  <p className="filme-description">{filme.description}</p>
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
                </div>
              </div>
            ))}
            {loading && <div className="loading">Carregando filmes...</div>}
            {error && <div className="error">{error}</div>}
            {playerLoading && (
              <div className="player-loading">
                Carregando filme...
              </div>
            )}
          </div>
          {modalFilme && (
            <ModalDetalhesFilme
              filme={modalFilme}
              onClose={() => setModalFilme(null)}
              onAssistir={handleAssistir}
            />
          )}
          {selectedFilme && (
            <PlayerFilmes
              movie={selectedFilme}
              onClose={handleClosePlayer}
              autoPlay={true}
              onReady={() => setPlayerLoading(false)}
              onClick={() => setPlayerLoading(true)}
            />
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}

export default Filmes;