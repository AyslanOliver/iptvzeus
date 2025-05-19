import React, { useCallback, useEffect, useState } from 'react';
import './ModalDetalhesFilme.css';

const ModalDetalhesFilme = ({ filme, onClose, onAssistir }) => {
  const [epgInfo, setEpgInfo] = useState(null);
  const [isLoadingEpg, setIsLoadingEpg] = useState(false);

  const handleClose = useCallback((e) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handleAssistirClick = useCallback((e) => {
    e.stopPropagation();
    onAssistir();
  }, [onAssistir]);

  useEffect(() => {
    const fetchEpgInfo = async () => {
      if (!filme?.stream_id) return;

      setIsLoadingEpg(true);
      try {
        const user = JSON.parse(localStorage.getItem('iptvUser'));
        if (!user) return;

        const epgUrl = `http://zed7.top/xmltv.php?username=${user.username}&password=${user.password}`;
        console.log('Buscando EPG em:', epgUrl);
        
        const response = await fetch(epgUrl);
        const xmlText = await response.text();
        
        // Criar um parser XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Buscar todos os programas
        const programmes = xmlDoc.getElementsByTagName("programme");
        console.log('Total de programas:', programmes.length);
        
        // Buscar o programa específico pelo ID
        const targetId = filme.stream_id.toString();
        console.log('Buscando programa com ID:', targetId);
        
        for (let i = 0; i < programmes.length; i++) {
          const programme = programmes[i];
          const channelId = programme.getAttribute("channel");
          
          if (channelId === targetId) {
            console.log('Programa encontrado!');
            
            // Extrair informações do programa
            const title = programme.querySelector('title')?.textContent;
            const desc = programme.querySelector('desc')?.textContent;
            const category = programme.querySelector('category')?.textContent;
            const director = programme.querySelector('director')?.textContent;
            const actor = programme.querySelector('actor')?.textContent;
            const length = programme.querySelector('length')?.textContent;
            
            console.log('Informações encontradas:', {
              title,
              desc,
              category,
              director,
              actor,
              length
            });
            
            // Formatar a duração
            let formattedDuration = null;
            if (length) {
              const minutes = parseInt(length);
              if (!isNaN(minutes)) {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                formattedDuration = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
              }
            }
            
            setEpgInfo({
              title,
              description: desc,
              category,
              director,
              cast: actor,
              duration: formattedDuration
            });
            break;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar informações do EPG:', error);
      } finally {
        setIsLoadingEpg(false);
      }
    };

    fetchEpgInfo();
  }, [filme?.stream_id]);

  if (!filme) return null;

  return (
    <div className="modal-detalhes-filme-overlay" onClick={handleClose}>
      <div className="modal-detalhes-filme" onClick={e => e.stopPropagation()}>
        <button className="modal-fechar" onClick={handleClose}>&times;</button>
        <div className="modal-conteudo">
          <div className="modal-capa">
            <img src={filme.thumbnail} alt={filme.title} />
          </div>
          <div className="modal-info">
            <h2>{epgInfo?.title || filme.title}</h2>
            <div className="modal-meta">
              <span>{epgInfo?.category || filme.genre || 'Gênero desconhecido'}</span>
              {epgInfo?.duration && <span> | {epgInfo.duration}</span>}
              {!epgInfo?.duration && filme.duration && <span> | {filme.duration}</span>}
            </div>
            {epgInfo?.director && <div className="modal-diretor"><b>Diretor:</b> {epgInfo.director}</div>}
            {!epgInfo?.director && filme.director && <div className="modal-diretor"><b>Diretor:</b> {filme.director}</div>}
            {epgInfo?.cast && <div className="modal-elenco"><b>Elenco:</b> {epgInfo.cast}</div>}
            {!epgInfo?.cast && filme.cast && <div className="modal-elenco"><b>Elenco:</b> {filme.cast}</div>}
            <button className="modal-assistir" onClick={handleAssistirClick}>
              <i className="fas fa-play"></i> Assistir
            </button>
            <div className="modal-sinopse">
              <h3>Sinopse</h3>
              {isLoadingEpg ? (
                <p>Carregando informações...</p>
              ) : (
                <p>{epgInfo?.description || filme.description || 'Sinopse não disponível.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesFilme; 