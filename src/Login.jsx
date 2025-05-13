import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          <input
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" /* Corrected for autoComplete */
          />
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
