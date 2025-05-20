import './Configuracoes.css';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const opcoesBase = [
  { label: 'Perfil', icon: 'fas fa-user', rota: '/perfil' },
  { label: 'Player Settings', icon: 'fas fa-sliders-h', rota: '/configuracoes/player-settings' },
  { label: 'Player', icon: 'fas fa-play-circle', rota: null },
  { label: 'Stream Type', icon: 'fas fa-stream', rota: null },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(null); // null, 'streamtype', 'player'
  const [streamType, setStreamType] = useState('HLS');
  const [playerType, setPlayerType] = useState('Padrão');

  useEffect(() => {
    const savedStream = localStorage.getItem('streamType');
    if (savedStream) setStreamType(savedStream);
    const savedPlayer = localStorage.getItem('playerType');
    if (savedPlayer) setPlayerType(savedPlayer);
  }, []);

  const handleStreamType = (type) => {
    setStreamType(type);
    localStorage.setItem('streamType', type);
    setModalOpen(null);
  };

  const handlePlayerType = (type) => {
    setPlayerType(type);
    localStorage.setItem('playerType', type);
    setModalOpen(null);
  };

  const opcoes = opcoesBase.map(opcao => {
    if (opcao.label === 'Stream Type') {
      return { ...opcao, onClick: () => setModalOpen('streamtype'), extra: streamType };
    }
    if (opcao.label === 'Player') {
      return { ...opcao, onClick: () => setModalOpen('player'), extra: playerType };
    }
    return { ...opcao, onClick: () => navigate(opcao.rota) };
  });

  return (
    <div className="config-bg">
      <button 
        className="botao-voltar" 
        onClick={() => navigate('/')}
      >
        <svg viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Voltar
      </button>
      <h2 className="config-title">Configurações</h2>
      <div className="config-panel">
        {opcoes.map(opcao => (
          <button
            key={opcao.label}
            className="config-btn"
            onClick={opcao.onClick}
          >
            <i className={opcao.icon}></i>
            <span>{opcao.label}</span>
            {opcao.extra && (
              <span className="streamtype-badge">{opcao.extra}</span>
            )}
          </button>
        ))}
      </div>
      {modalOpen === 'streamtype' && (
        <div className="modal-streamtype-bg" onClick={() => setModalOpen(null)}>
          <div className="modal-streamtype" onClick={e => e.stopPropagation()}>
            <h3>Escolha o tipo de stream</h3>
            <div className="modal-streamtype-btns">
              <button
                className={streamType === 'HLS' ? 'active' : ''}
                onClick={() => handleStreamType('HLS')}
              >HLS</button>
              <button
                className={streamType === 'TS' ? 'active' : ''}
                onClick={() => handleStreamType('TS')}
              >TS</button>
            </div>
            <button className="modal-close" onClick={() => setModalOpen(null)}>Fechar</button>
          </div>
        </div>
      )}
      {modalOpen === 'player' && (
        <div className="modal-streamtype-bg" onClick={() => setModalOpen(null)}>
          <div className="modal-streamtype" onClick={e => e.stopPropagation()}>
            <h3>Escolha o player</h3>
            <div className="modal-streamtype-btns">
              <button
                className={playerType === 'Padrão' ? 'active' : ''}
                onClick={() => handlePlayerType('Padrão')}
              >Padrão (Web)</button>
              <button
                className={playerType === 'ExoPlayer' ? 'active' : ''}
                onClick={() => handlePlayerType('ExoPlayer')}
              >ExoPlayer (Android)</button>
            </div>
            {playerType === 'ExoPlayer' && (
              <div style={{color:'#fff', background:'#2d5be3', borderRadius:8, padding:'0.7rem 1rem', margin:'1rem 0', fontSize:'1rem', textAlign:'center'}}>
                ExoPlayer só está disponível em apps Android.<br/>No navegador, utilize o player padrão.
              </div>
            )}
            <button className="modal-close" onClick={() => setModalOpen(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
} 