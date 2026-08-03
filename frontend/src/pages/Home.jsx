import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="auth-shell" style={{ flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
          Where your team plans, builds, and ships together
        </h1>
        <p style={{ color: 'var(--text-dim)', maxWidth: '480px', margin: '0 auto' }}>
          Workspaces, kanban boards, and real-time collaboration — CloudCollab keeps
          remote teams moving in the same direction.
        </p>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {isAuthenticated ? (
          <Link className="btn btn-primary" to="/dashboard">
            Go to your workspaces
          </Link>
        ) : (
          <>
            <Link className="btn btn-primary" to="/register">
              Get started free
            </Link>
            <Link className="btn btn-secondary" to="/login">
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
