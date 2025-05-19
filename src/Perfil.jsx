import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Perfil.css';

function calcularDiasRestantes(validade) {
  const hoje = new Date();
  const expira = new Date(validade);
  const diff = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
  return diff;
}

function getStatusClass(diasRestantes, ativo) {
  if (!ativo) return 'status-expirado';
  if (diasRestantes <= 5) return 'status-alerta';
  return 'status-ativo';
}

export default function Perfil() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [renovando, setRenovando] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('iptvUser'));
    if (user) {
      fetch(`http://nxczs.top/player_api.php?username=${user.username}&password=${user.password}&action=user_info`)
        .then(res => res.json())
        .then(data => {
          if (data && data.user_info) {
            setPerfil({
              username: data.user_info.username,
              status: data.user_info.status,
              validade: new Date(Number(data.user_info.exp_date) * 1000).toLocaleDateString('pt-BR'),
              plano: data.user_info.is_trial === "1" ? "Teste" : "Assinante",
              ativo: data.user_info.status === 'Active',
              criado: new Date(Number(data.user_info.created_at) * 1000).toLocaleDateString('pt-BR'),
              conexoes: data.user_info.max_connections
            });
          } else {
            setErro('Não foi possível obter os dados do perfil.');
          }
        })
        .catch(error => {
          console.error('Erro na requisição:', error);
          setErro('Erro ao conectar com o servidor.');
        })
        .finally(() => setLoading(false));
    } else {
      setErro('Usuário não encontrado.');
      setLoading(false);
    }
  }, []);

  const handleRenovacao = async () => {
    setRenovando(true);
    try {
      const user = JSON.parse(localStorage.getItem('iptvUser'));
      const response = await fetch('http://nxczs.top/api/renovacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          password: user.password
        })
      });

      const data = await response.json();
      
      if (data.success && data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
      } else {
        setErro('Erro ao gerar link de pagamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro na renovação:', error);
      setErro('Erro ao processar renovação. Tente novamente.');
    } finally {
      setRenovando(false);
    }
  };

  const renderBotaoRenovacao = () => {
    if (!perfil) return null;
    
    const diasRestantes = perfil.validade ? calcularDiasRestantes(perfil.validade) : null;
    const mostrarRenovacao = !perfil.ativo || (diasRestantes !== null && diasRestantes <= 5);

    if (!mostrarRenovacao) return null;

    return (
      <button 
        className="botao-renovacao" 
        onClick={handleRenovacao}
        disabled={renovando}
      >
        {renovando ? 'Processando...' : 'Renovar Assinatura'}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="perfil-container">
        <div className="perfil-header">
          <h2>Carregando Perfil...</h2>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="perfil-container">
        <div className="perfil-header">
          <h2>Erro</h2>
          <p style={{ color: '#ff4444' }}>{erro}</p>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="perfil-container">
        <div className="perfil-header">
          <h2>Nenhum dado disponível</h2>
        </div>
      </div>
    );
  }

  const diasRestantes = perfil.validade ? calcularDiasRestantes(perfil.validade) : null;
  const statusClass = getStatusClass(diasRestantes, perfil.ativo);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <button 
        className="botao-voltar" 
        onClick={() => navigate('/')}
      >
        <svg viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        Voltar
      </button>

      <div className="perfil-container">
        <div className="perfil-header">
          <h2>Perfil do Usuário</h2>
        </div>
        
        <div className="perfil-dados">
          <div className="perfil-card">
            <div className="perfil-linha">
              <span>Usuário</span>
              <strong>{perfil.username}</strong>
            </div>
            <div className="perfil-linha">
              <span>Status</span>
              <strong className={statusClass}>
                {perfil.status === 'Active' ? 'Ativo' : 'Expirado'}
              </strong>
            </div>
            <div className="perfil-linha">
              <span>Plano</span>
              <strong>{perfil.plano}</strong>
            </div>
          </div>

          <div className="perfil-card">
            <div className="perfil-linha">
              <span>Validade</span>
              <strong>{perfil.validade}</strong>
            </div>
            <div className="perfil-linha">
              <span>Dias restantes</span>
              <strong className={statusClass}>
                {diasRestantes !== null ? (diasRestantes > 0 ? diasRestantes : 'Expirado') : '---'}
              </strong>
            </div>
            <div className="perfil-linha">
              <span>Conta criada em</span>
              <strong>{perfil.criado}</strong>
            </div>
            <div className="perfil-linha">
              <span>Conexões permitidas</span>
              <strong>{perfil.conexoes}</strong>
            </div>
          </div>
        </div>
      </div>
      {renderBotaoRenovacao()}
    </div>
  );
} 