import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Home from './Home';
import Canais from './Canais';
import Filmes from './Filmes';
import Series from './Series';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/canais" element={<Canais />} />
        <Route path="/filmes" element={<Filmes />} />
        <Route path="/series" element={<Series />} />
      </Routes>
    </Router>
  );
}

export default App;
