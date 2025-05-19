import React from 'react';
import './ModalDetalhesFilme.css';

const ModalDetalhesFilme = ({ filme, onClose, onAssistir }) => {
  if (!filme) return null;

  return (
    <div className="modal-detalhes-filme-overlay">
      <div className="modal-detalhes-filme">
        <button className="modal-fechar" onClick={onClose}>&times;</button>
        <div className="modal-conteudo">
          <div className="modal-capa">
            <img src={filme.thumbnail} alt={filme.title} />
          </div>
          <div className="modal-info">
            <h2>{filme.title}</h2>
            <div className="modal-meta">
              <span>{filme.genre || 'Gênero desconhecido'}</span>
              <span> | {filme.year}</span>
              <span> | {filme.duration}</span>
            </div>
            {filme.director && <div className="modal-diretor"><b>Diretor:</b> {filme.director}</div>}
            {filme.cast && <div className="modal-elenco"><b>Elenco:</b> {filme.cast}</div>}
            <button className="modal-assistir" onClick={onAssistir}>
              <i className="fas fa-play"></i> Assistir
            </button>
            <div className="modal-sinopse">{filme.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesFilme; 