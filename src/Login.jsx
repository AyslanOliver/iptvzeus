import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaLock } from 'react-icons/fa';

import './Login.css';

function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('iptvUser');
    if (user) {
      try {
        JSON.parse(user);
        navigate('/home');
      } catch (e) {
        console.error('Erro ao parsear usuário do localStorage:', e);
        // Limpar dados inválidos se houver erro no parse
        localStorage.removeItem('iptvUser');
      }
    }
  }, [navigate]);


  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setIsAnimating(true);

    if (!username || !password) {
      setError('Por favor preencha usuário e senha');
      setLoading(false);
      setIsAnimating(false);
      return;
    }

    try {
      // Gera o link M3U8
      const m3u8Link = `/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;

      // Simula validade para 30 dias a partir do login
      const hoje = new Date();
      const validade = new Date(hoje.setDate(hoje.getDate() + 30)).toISOString().slice(0, 10); // formato YYYY-MM-DD
      const plano = 'Mensal';

      // Armazena as credenciais e o link M3U8 no localStorage
      localStorage.setItem('iptvUser', JSON.stringify({
        username,
        password,
        m3u8Link,
        validade,
        plano
      }));
      
      setTimeout(() => {
        navigate('/home');
      }, 1000);
    } catch (err) {
      console.error('Erro ao processar login:', err);

      setError('Erro ao processar login');
      setIsAnimating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container">
          <h1>ZEUS</h1>
          <div className="logo-subtitle">IPTV Premium</div>
        </div>
        
        <form onSubmit={handleSubmit} className={isAnimating ? 'animate' : ''}>
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              placeholder="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={error && !username ? 'error' : ''}
            />
          </div>
          
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={error && !password ? 'error' : ''}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={loading ? 'loading' : ''}
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              'Entrar'
            )}
          </button>
          
          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
