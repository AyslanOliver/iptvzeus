import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

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

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    if (!username || !password) {
      setError('Por favor preencha usuário e senha');
      setLoading(false);
      return;
    }

    try {
      // Gera o link M3U8
      const m3u8Link = `/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;

      // Armazena as credenciais e o link M3U8 no localStorage
      localStorage.setItem('iptvUser', JSON.stringify({
        username,
        password,
        m3u8Link
      }));
      
      // Redireciona para a página home
      navigate('/home');
    } catch (err) {
      console.error('Erro ao processar login:', err);

      setError('Erro ao processar login');
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
        <h1>🔥ZEUS🔥</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <i className="fas fa-user"></i>
            <input
              type="text"
              placeholder="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
