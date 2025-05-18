import React, { useState, useEffect, useCallback } from 'react';
import './Filmes.css';
import PlayerFilmes from './components/PlayerFilmes';
import Hls from 'hls.js';
import Header from './Header';

function Filmes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilme, setSelectedFilme] = useState(null);
  const [filmes, setFilmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playerLoading, setPlayerLoading] = useState(false);

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
          container_extension: filme.container_extension || 'mp4'
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
    setSelectedFilme(filme);
    setPlayerLoading(true);
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
    <div className="filmes-page">
      <div className="filmes-header">
        <h1 className="filmes-title">Filmes</h1>
        <div className="filmes-controls">
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar filmes..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="category-filter">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">Todas Categorias</option>
              {categories.map(category => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div> {/* This div closes filmes-header */}
      {/* Sidebar para categorias */}
      <div className="categories-sidebar">
        <h2>Categorias</h2>
        <ul>
          <li 
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            Todas Categorias
          </li>
          {categories.map(category => (
            <li 
              key={category.category_id} 
              className={selectedCategory === category.category_id ? 'active' : ''}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              {category.category_name}
            </li>
          ))}
        </ul>
      </div> {/* This div closes categories-sidebar */}

      {/* Conteúdo principal dos filmes */}
      <div className="filmes-main-content">
        <div className="filmes-grid">
          {filteredFilmes().map(filme => (
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
 );
}

export default Filmes;