import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <button
        className="home-button"
        onClick={() => navigate('/')}
        title="Voltar ao Início"
      >
        <FaHome />
        <span>Início</span>
      </button>
    </header>
  );
};

export default Header;