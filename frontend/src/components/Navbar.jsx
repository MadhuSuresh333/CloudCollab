import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-brand">
        ☁️ CloudCollab
      </Link>
      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Workspaces</Link>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Log out
            </button>
            <div className="avatar" title={user?.name}>
              {initials(user?.name)}
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
