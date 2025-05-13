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
      const urlM3U = `https://nxczs.top/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;
      const response = await fetch(urlM3U);
      
      if (!response.ok) throw new Error('Credenciais inválidas');
      
      const m3uLink = await response.text();
      
      if (!m3uLink.includes('EXTM3U')) {
        throw new Error('Link M3U inválido');
      }

      localStorage.setItem('m3uLink', m3uLink);
      localStorage.setItem('iptvUser', JSON.stringify({ username, password }));
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Erro ao conectar');
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
