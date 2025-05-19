import { useNavigate } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="navigation-container">
      <button className="home-button" onClick={handleGoHome}>
        <i className="fas fa-home"></i> Home
      </button>
    </div>
  );
}

export default Navigation; 