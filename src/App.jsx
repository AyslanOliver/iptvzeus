import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WatchProvider } from './context/WatchContext';
import Home from './Home';
import Login from './Login';
import Canais from './Canais';
import Filmes from './Filmes';
import Series from './Series';
import Configuracoes from './Configuracoes';
import Perfil from './Perfil';
import './App.css';

function App() {
  return (
    <WatchProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/canais" element={<Canais />} />
            <Route path="/filmes" element={<Filmes />} />
            <Route path="/series" element={<Series />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/perfil" element={<Perfil />} />
          </Routes>
        </div>
      </Router>
    </WatchProvider>
  );
}

export default App;
