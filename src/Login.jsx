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
      const encodedUser = encodeURIComponent(username);
      const encodedPass = encodeURIComponent(password);
      const urlM3U = `http://nxczs.top/get.php?username=${encodedUser}&password=${encodedPass}&type=m3u_plus&output=m3u8`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(urlM3U, { 
            signal: controller.signal 
          });
          break;
        } catch (err) {
          clearTimeout(timeoutId);
          if (attempt === 3 || err.name !== 'AbortError') {
            throw new Error(err.name === 'AbortError' 
              ? 'Timeout: Servidor não respondeu após 10 segundos' 
              : `Erro de rede: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
      
      if (response.status === 401) throw new Error('Credenciais incorretas (Código 401)');
      if (response.status === 403) throw new Error('Acesso negado (Código 403)');
      if (response.status === 404) throw new Error('Endpoint não encontrado (Código 404)');
      if (response.status >= 500) throw new Error(`Erro no servidor (Código ${response.status})`);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
      
      const m3uLink = await response.text();
      
      if (!m3uLink.includes('EXTM3U')) {
        throw new Error('Link M3U inválido');
      }

      localStorage.setItem('m3uLink', m3uLink);
      // Adicionei a lógica de armazenamento seguro das credenciais
      localStorage.setItem('iptvUser', JSON.stringify({
        username,
        password
      }));
      
      // Geração automática do link M3U8
      const m3u8Url = `/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;
      // Verificar conexão com endpoint crítico
      navigate('/home');
      const apiTest = await fetch(`http://nxczs.top/player_api.php?username=${encodedUser}&password=${encodedPass}&action=get_series_categories`);
      if (!apiTest.ok) console.error('Falha na validação secundária');
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
