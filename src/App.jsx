import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Play, Info, Plus, X, Menu, LogOut, ShieldCheck, Film, TrendingUp, CreditCard, Trash2, Pencil, Check, LoaderCircle, History as HistoryIcon, Users, RefreshCw, Share2 } from 'lucide-react';
import api from './api';
import { useAuth } from './context/AuthContext';
function Header({ onSearch = () => { }, showSearch = true }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false), [q, setQ] = useState('');
  return <header className="topbar">
    <Link className="brand" to={user ? '/browse' : '/'}>STREAMFLIX</Link>
    <button className="icon-btn mobile-menu" onClick={() => setOpen(!open)}>
      <Menu />
    </button>
    <nav className={open ? 'nav-links show' : 'nav-links'}>
      <NavLink to={user ? '/browse' : '/'}>Home</NavLink>
      {user && <><a href="/browse#popular">TV Shows</a><a href="/browse#popular">Movies</a></>}
      <Link to={user ? '/plans' : '/login?next=%2Fplans'}>Plans</Link>{user && <Link to="/history">My History</Link>}{user?.role === 'admin' && <Link to="/admin">Admin</Link>}</nav>
    <div className="header-actions">
      {showSearch && user && <form className="search-box" onSubmit={e => {
        e.preventDefault();
        onSearch(q)
      }}>
        <Search size={17} />
        <input placeholder="Search titles..." value={q} onChange={e => {
          setQ(e.target.value);
          onSearch(e.target.value)
        }} />
      </form>}
      {user && <Bell className="bell" size={18} />}{user ? <div className="user-menu">
        <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
        <button className="logout" onClick={logout}>
          <LogOut size={16} />
        </button>
      </div> : <Link className="sign-in" to="/login">Sign In</Link>}</div>
  </header>
}
function useMovies() {
  const [movies, setMovies] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  async function refresh(params = {}) {
    setLoading(true);
    try {
      const r = await api.get('/movies', { params });
      setMovies(Array.isArray(r.data.movies) ? r.data.movies : []);
      setError('')
    } catch (e) {
      setMovies([]);
      setError(e.response?.data?.message || 'Catalogue unavailable. Make sure the backend and MongoDB are running.')
    } finally { setLoading(false) }
  } useEffect(() => { refresh() }, []);
  return { movies, error, loading, refresh }
}
function Trailer({ movie, close }) {
  const [shareMessage, setShareMessage] = useState('');
  useEffect(() => {
    const f = e => e.key === 'Escape' && close();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f)
  }, [close]);
  useEffect(() => { setShareMessage('') }, [movie?._id]);
  if (!movie) return null;
  async function shareMovie() {
    const shareUrl = `${window.location.origin}/browse?movie=${encodeURIComponent(movie._id || '')}`;
    const shareData = { title: `${movie.title} | StreamFlix`, text: `Watch the trailer for ${movie.title} on StreamFlix.`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage('Share menu opened successfully.');
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const field = document.createElement('textarea');
        field.value = shareUrl;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(field);
        if (!copied) throw new Error('Copy not supported');
      }
      setShareMessage('Movie link copied!');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setShareMessage('Could not share automatically. Copy this URL from your browser: ' + shareUrl);
    }
  }
  return <div className="modal-backdrop" onClick={close}>
    <div className="trailer-modal" onClick={e => e.stopPropagation()}>
      <button className="close-modal icon-btn" onClick={close}><X /></button>
      {movie.trailerId ? <iframe src={`https://www.youtube-nocookie.com/embed/${movie.trailerId}?autoplay=1&rel=0`} title={`${movie.title} trailer`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <div className="no-trailer">Trailer not available yet.</div>}
      <div className="modal-info">
        <h2>{movie.title}</h2>
        <p>{movie.description}</p>
        <small>{movie.year} · {movie.rating} · {movie.duration}</small>
        <div className="trailer-share-actions"><button className="btn btn-outline" onClick={shareMovie}><Share2 size={17} /> Share movie</button>{shareMessage && <span role="status" className="share-feedback">{shareMessage}</span>}</div>
      </div>
    </div>
  </div>
}

function Card({ m, play, rank }) {
  return <article className="movie-card">
    <button className="poster-button" onClick={() => play(m)}>
      <img loading="lazy" src={m.posterUrl} alt={`${m.title} poster`} onError={e => e.currentTarget.src = 'https://placehold.co/320x480/202020/ffffff?text=StreamFlix'} />
      <span className="card-play">
        <Play fill="currentColor" />
      </span>{rank && <span className="rank">{rank}</span>}</button>
    <div className="card-meta">
      <div>
        <strong>{m.title}</strong>
        <span>{m.year} · {m.rating}</span>
      </div>
      <button className="plus-btn" onClick={() => play(m)}>
        <Plus size={18} />
      </button>
    </div>
  </article>
}
function Row({ title, items, play, rank }) {
  if (!items.length) return null;
  return <section className="movie-row" id={title === 'Popular on StreamFlix' ? 'popular' : undefined}>
    <div className="row-heading">
      <h2>{title}</h2>
      <span>Explore all <b>›</b>
      </span>
    </div>
    <div className="movie-track">{items.map((m, i) => <Card key={m._id || m.title} m={m} play={play} rank={rank ? i + 1 : null} />)}</div>
  </section>
}
function Landing() {
  const { user } = useAuth();
  const { movies, loading } = useMovies();
  const featured = movies.find((movie) => movie.featured) || movies[0];
  const previews = movies.slice(0, 6);
  const startLink = user ? '/browse' : '/register?next=%2Fbrowse';

  return <div className="landing-page">
    <div className="landing-backdrop" style={featured ? { backgroundImage: `linear-gradient(90deg, #000 0%, rgba(0,0,0,.72) 48%, rgba(0,0,0,.28) 100%), linear-gradient(0deg,#141414 0%,transparent 65%), url("${featured.backdropUrl || featured.posterUrl}")` } : undefined} />
    <Header showSearch={false} />
    <main className="landing-content">
      <section className="landing-hero">
        <span className="landing-kicker"><span className="n-mark">N</span> THE STREAMFLIX EXPERIENCE</span>
        <h1>Stories that stay with you.</h1>
        <p className="landing-lead">Movies, unforgettable worlds, and trailers worth watching. Your next favourite is waiting.</p>
        <p className="landing-subtext">Ready to watch? Sign in or create an account to enter StreamFlix.</p>
        <div className="landing-actions">
          <Link className="btn btn-red landing-primary" to={startLink}>{user ? 'Browse Movies' : 'Get Started'} <span aria-hidden="true">›</span></Link>
          {!user && <Link className="btn btn-light" to="/login?next=%2Fbrowse">Sign In</Link>}
        </div>
        {featured && <div className="landing-featured-label"><span className="live-dot" /> Featured title <b>{featured.title}</b></div>}
      </section>
      <section className="landing-preview">
        <div className="landing-preview-heading">
          <div><span className="eyebrow">MADE FOR YOUR NEXT MOVIE NIGHT</span><h2>Discover your next obsession</h2></div>
          <span className="preview-lock"><ShieldCheck size={15} /> Sign in to explore</span>
        </div>
        {loading ? <p className="landing-loading">Loading featured titles from StreamFlix…</p> : previews.length ? <div className="landing-poster-strip">
          {previews.map((movie) => <article className="landing-poster" key={movie._id}>
            <img src={movie.posterUrl} alt={`${movie.title} poster`} onError={(event) => { event.currentTarget.src = 'https://placehold.co/220x330/202020/ffffff?text=StreamFlix'; }} />
            <span>{movie.title}</span>
          </article>)}
        </div> : <p className="landing-loading">Your movie collection will appear here once the admin adds titles.</p>}
      </section>
      <section className="landing-benefits">
        <article><Play size={22} /><h3>Trailers worth the wait</h3><p>Preview titles with YouTube trailers after signing in.</p></article>
        <article><HistoryIcon size={22} /><h3>Your own watch history</h3><p>Keep track of the titles you have explored.</p></article>
        <article><ShieldCheck size={22} /><h3>One account, your space</h3><p>Your subscription demo and viewing activity stay with your account.</p></article>
      </section>
    </main>
    <footer className="landing-footer"><p>© 2026 StreamFlix Demo · Built for learning</p><span>Demo subscriptions only · No real payments</span></footer>
  </div>;
}

function Home() {
  const { movies, error, loading, refresh } = useMovies();
  const { user } = useAuth();
  const nav = useNavigate();
  const [selected, setSelected] = useState(null), [search, setSearch] = useState('');
  useEffect(() => { if (!user) nav('/login?next=%2Fbrowse', { replace: true }); }, [user, nav]);
  const location = useLocation();
  useEffect(() => {
    const movieId = new URLSearchParams(location.search).get('movie');
    if (!movieId || !user || !movies.length) return;
    const sharedMovie = movies.find(movie => movie._id === movieId);
    if (sharedMovie) playMovie(sharedMovie);
  }, [location.search, user, movies]);
  function playMovie(movie) {
    setSelected(movie);
    if (user && movie?._id) api.post(`/history/${movie._id}`).catch(() => { });
  } const feature = movies.find(m => m.featured) || movies[0], popular = useMemo(() => [...movies].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)), [movies]);
  function searchFor(q) {
    setSearch(q);
    refresh(q.trim() ? { search: q } : {})
  } if (!user) return null;
  return <>
    <Header onSearch={searchFor} />{error && <div className="api-notice">{error}</div>}<main>{feature ? <section className="hero" style={{ backgroundImage: `linear-gradient(90deg,#141414 0%,rgba(20,20,20,.86) 33%,rgba(20,20,20,.15) 80%),linear-gradient(0deg,#141414 0%,transparent 48%),url("${feature.backdropUrl || feature.posterUrl}")` }}>
      <div className="hero-content">
        <div className="eyebrow">
          <span className="n-mark">N</span> SERIES</div>
        <p className="top-ten">
          <TrendingUp size={17} /> Featured on StreamFlix</p>
        <h1>{feature.title}</h1>
        <p className="hero-description">{feature.description}</p>
        <div className="hero-tags">
          <span>{feature.year}</span>
          <span>{feature.rating}</span>
          <span>{feature.duration}</span>
          <span>{feature.genre?.slice(0, 2).join(' · ')}</span>
        </div>
        <div className="hero-actions">
          <button className="btn btn-light" onClick={() => playMovie(feature)}>
            <Play fill="currentColor" size={20} /> Play Trailer</button>
          <button className="btn btn-muted" onClick={() => playMovie(feature)}>
            <Info size={20} /> More Info</button>
        </div>
      </div>
      <div className="maturity">{feature.rating || 'TV-MA'}</div>
    </section> : <section className="hero hero-empty">
      <div className="hero-content">
        <div className="eyebrow">
          <span className="n-mark">N</span> STREAMFLIX</div>
        <h1>{loading ? 'Loading catalogue…' : 'Your next favourite starts here.'}</h1>
        <p className="hero-description">{loading ? 'Fetching titles from the StreamFlix API and MongoDB.' : 'No titles are in the database yet. Sign in as an admin and add movies from the Admin Dashboard.'}</p>{!loading && <Link className="btn btn-red" to="/login">Admin Sign In</Link>}</div>
    </section>}<div className="catalogue">{search && <p className="search-result">Search results for “{search}”</p>}{!loading && !error && !movies.length && <div className="empty-catalogue">
      <h2>No movies found</h2>
      <p>Add titles in the admin dashboard or run <code>npm run seed</code> in the server folder to insert sample records into MongoDB.</p>
    </div>}<Row title="Popular on StreamFlix" items={popular} play={playMovie} rank />
        <Row title="Trending Now" items={[...popular].reverse()} play={playMovie} />
        <Row title="Sci-Fi & Adventure" items={movies.filter(m => m.genre?.some(g => ['Sci-Fi', 'Adventure'].includes(g)))} play={playMovie} />
        <Row title="Thrillers & Mysteries" items={movies.filter(m => m.genre?.some(g => ['Thriller', 'Mystery'].includes(g)))} play={playMovie} />
      </div>
    </main>
    <footer>
      <div className="footer-social">f　◎　▶　𝕏</div>
      <div className="footer-links">
        <span>Help Centre</span>
        <span>Media Centre</span>
        <span>Terms of Use</span>
        <span>Privacy</span>
        <span>Legal Notices</span>
        <span>Contact</span>
      </div>
      <p>© 2026 StreamFlix Demo · Built for learning</p>
    </footer>
    <Trailer movie={selected} close={() => setSelected(null)} />
  </>
}
function AuthPage({ mode }) {
  const { login, register, user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const returnTo = params.get('next') || '';
  const destination = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : (user?.role === 'admin' ? '/admin' : '/browse');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (user) nav(destination, { replace: true }) }, [user, destination, nav]);
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedInUser = mode === 'login' ? await login(email, password) : await register(name, email, password);
      const next = params.get('next') || '';
      nav(next.startsWith('/') && !next.startsWith('//') ? next : (signedInUser?.role === 'admin' ? '/admin' : '/browse'), { replace: true })
    } catch (e) { setError(e.response?.data?.message || 'Could not connect to API.') } finally { setBusy(false) }
  } return <div className="auth-screen">
    <Header />
    <div className="auth-card">
      <h1>{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
      <form onSubmit={submit}>{mode === 'register' && <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />}<input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />{error && <p className="form-error">{error}</p>}<button className="btn btn-red full-width" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
      </form>
      <p className="auth-switch">{mode === 'login' ? 'New to StreamFlix?' : 'Already have an account?'} <Link to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Sign up now' : 'Sign in'}</Link>
      </p>
      <small>Learning demo. Do not reuse sensitive passwords.</small>
    </div>
  </div>
}
function Plans() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState([{ id: 'basic', name: 'Basic', price: 499, quality: '720p', screens: 1 }, { id: 'standard', name: 'Standard', price: 899, quality: '1080p', screens: 2 }, { id: 'premium', name: 'Premium', price: 1299, quality: '4K + HDR', screens: 4 }]), [message, setMessage] = useState('');
  useEffect(() => { api.get('/subscriptions/plans').then(r => setPlans(r.data.plans)).catch(() => { }) }, []);
  async function choose(id) {
    if (!user) {
      nav('/login?next=%2Fplans');
      return
    } try {
      const r = await api.post('/subscriptions/subscribe', { planId: id });
      setMessage(r.data.message)
    } catch (e) { setMessage(e.response?.data?.message || 'Could not activate plan.') }
  } return <>
    <Header />
    <main className="plans-page">
      <div className="plans-intro">
        <span className="eyebrow">STREAM WITHOUT LIMITS</span>
        <h1>One plan. Endless stories.</h1>
        <p>Choose a demo plan. No real payment is processed.</p>
      </div>
      <div className="plans-grid">{plans.map((p, i) => <article className={`plan-card ${i === 2 ? 'plan-featured' : ''}`} key={p.id}>{i === 2 && <span className="popular-pill">MOST POPULAR</span>}<h2>{p.name}</h2>
        <p>For your viewing style</p>
        <div className="plan-price">
          <strong>Rs {p.price.toLocaleString()}</strong>
          <span>/ month</span>
        </div>
        <ul>
          <li>
            <Check /> Video quality: {p.quality}</li>
          <li>
            <Check /> Screens at once: {p.screens}</li>
          <li>
            <Check /> Catalogue browsing</li>
          <li>
            <Check /> Trailer previews</li>
        </ul>
        <button className={`btn ${i === 2 ? 'btn-red' : 'btn-outline'} full-width`} onClick={() => choose(p.id)}>Choose {p.name}</button>
      </article>)}</div>{message && <p className="plan-message">{message}</p>}</main>
  </>
}
const blank = { title: '', description: '', year: 2026, rating: 'TV-MA', duration: '1h 45m', genre: 'Drama, Thriller', posterUrl: '', backdropUrl: '', trailerId: '', featured: false, popularity: 50 };
function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      nav('/login?next=%2Fadmin');
      return;
    }
    if (user.role !== 'admin') {
      nav('/');
      return;
    }
    loadMovies();
    loadUsers();
  }, [user]);

  async function loadMovies() {
    setLoading(true);
    try {
      const response = await api.get('/movies');
      setMovies(response.data.movies || []);
    }
    catch (e) {
      setError(e.response?.data?.message || 'Could not load catalogue.');
    }
    finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setUserLoading(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    }
    catch (e) {
      setError(e.response?.data?.message || 'Could not load users.');
    }
    finally {
      setUserLoading(false);
    }
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function edit(movie) {
    setEditing(movie._id);
    setForm({ ...movie, genre: (movie.genre || []).join(', '), trailerId: movie.trailerId || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() {
    setEditing(null);
    setForm(blank);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const payload = { ...form, genre: form.genre.split(',').map((genre) => genre.trim()).filter(Boolean), year: Number(form.year), popularity: Number(form.popularity), trailerId: getYouTubeId(form.trailerId) || form.trailerId.trim() };
    try {
      if (editing) await api.put(`/movies/${editing}`, payload);
      else await api.post('/movies', payload);
      setSuccess(editing ? 'Movie updated.' : 'Movie added.');
      reset();
      await loadMovies();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save movie.');
    }
  }

  async function removeMovie(id) {
    if (!window.confirm('Delete this movie? Its watch-history entries will also be removed.')) return;
    try {
      await api.delete(`/movies/${id}`);
      setMovies((current) => current.filter((movie) => movie._id !== id));
      setSuccess('Movie deleted.');
    }
    catch (e) {
      setError(e.response?.data?.message || 'Delete failed.');
    }
  }

  async function removeUser(id, email) {
    if (!window.confirm(`Delete user ${email}? Their watch history and subscription will also be deleted. This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((current) => current.filter((item) => item._id !== id));
      setSuccess(`Deleted ${email}.`);
    }
    catch (e) {
      setError(e.response?.data?.message || 'Could not delete user.');
    }
  }

  if (!user || user.role !== 'admin') return null;
  return <>
    <Header />
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">CONTROL CENTRE</span>
          <h1>
            <ShieldCheck /> Admin Dashboard</h1>
          <p>Manage titles, registered users, demo plans and watch history.</p>
        </div>
        <Link className="btn btn-outline" to="/">View Site</Link>
      </div>
      <div className="admin-stats">
        <div>
          <Film />
          <span>Total Titles</span>
          <strong>{movies.length}</strong>
        </div>
        <div>
          <Users />
          <span>Registered Users</span>
          <strong>{users.length}</strong>
        </div>
        <div>
          <CreditCard />
          <span>Active Demo Plans</span>
          <strong>{users.filter((item) => item.subscription?.status === 'active').length}</strong>
        </div>
      </div>
      <section className="admin-panel">
        <h2>{editing ? 'Edit Movie' : 'Add a Movie'}</h2>
        <form className="movie-form" onSubmit={save}>
          <label>Title<input value={form.title} onChange={(e) => update('title', e.target.value)} required />
          </label>
          <label>Year<input type="number" value={form.year} onChange={(e) => update('year', e.target.value)} required />
          </label>
          <label>Age rating<input value={form.rating} onChange={(e) => update('rating', e.target.value)} />
          </label>
          <label>Duration<input value={form.duration} onChange={(e) => update('duration', e.target.value)} />
          </label>
          <label className="span-two">Poster image URL<input type="url" value={form.posterUrl} onChange={(e) => update('posterUrl', e.target.value)} required placeholder="https://..." />
          </label>
          <label className="span-two">Backdrop image URL<input type="url" value={form.backdropUrl} onChange={(e) => update('backdropUrl', e.target.value)} placeholder="https://..." />
          </label>
          <label className="span-two">YouTube trailer URL or ID<input value={form.trailerId} onChange={(e) => update('trailerId', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <label className="span-two">Genres, comma separated<input value={form.genre} onChange={(e) => update('genre', e.target.value)} />
          </label>
          <label className="span-two">Description<textarea rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} />
          </label>
          <label>Popularity score<input type="number" value={form.popularity} onChange={(e) => update('popularity', e.target.value)} />
          </label>
          <label className="check-label">
            <input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => update('featured', e.target.checked)} /> Feature on homepage</label>
          <div className="form-buttons">
            <button className="btn btn-red">{editing ? 'Save Changes' : 'Add Movie'}</button>{editing && <button className="btn btn-outline" type="button" onClick={reset}>Cancel</button>}</div>
        </form>{error && <p className="form-error">{error}</p>}{success && <p className="form-success">{success}</p>}</section>
      <section className="admin-panel">
        <div className="table-heading">
          <h2>Catalogue</h2>
          <button className="btn btn-outline" onClick={loadMovies}>
            <RefreshCw size={15} /> Refresh</button>
        </div>{loading ? <p>Loading movies…</p> : movies.map((movie) => <div className="admin-movie" key={movie._id}>
          <img src={movie.posterUrl} alt="" onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/70x100/222/fff?text=Movie';
          }} />
          <div className="admin-movie-info">
            <strong>{movie.title}</strong>
            <span>{movie.year} · {movie.genre?.join(', ')} {movie.featured ? '· Featured' : ''}</span>
          </div>
          <button className="icon-btn" aria-label={`Edit ${movie.title}`} onClick={() => edit(movie)}>
            <Pencil size={17} />
          </button>
          <button className="icon-btn danger" aria-label={`Delete ${movie.title}`} onClick={() => removeMovie(movie._id)}>
            <Trash2 size={17} />
          </button>
        </div>)}</section>
      <section className="admin-panel">
        <div className="table-heading">
          <div>
            <h2>Users & Watch History</h2>
            <p className="admin-muted">Passwords are never displayed or retrievable. They are stored only as secure password hashes.</p>
          </div>
          <button className="btn btn-outline" onClick={loadUsers}>
            <RefreshCw size={15} /> Refresh</button>
        </div>
        {userLoading ? <p>Loading users…</p> : !users.length ? <p>No registered users yet.</p> : users.map((item) => <details className="user-record" key={item._id}>
          <summary>
            <div className="user-record-main">
              <strong>{item.name}</strong>
              <span>{item.email}</span>
            </div>
            <div className="user-record-plan">
              <b>{item.subscription?.status === 'active' ? (item.subscription?.planId || 'free').toUpperCase() : 'FREE'}</b>
              <small>{item.subscription?.status || 'free'}</small>
            </div>
            <span className="history-count">{item.watchHistory?.length || 0} watched</span>
          </summary>
          <div className="user-record-details">
            <p>
              <b>Email:</b> {item.email}</p>
            <p>
              <b>Plan:</b> {item.subscription?.planId || 'free'} · <b>Status:</b> {item.subscription?.status || 'free'}</p>
            <p>
              <b>Joined:</b> {new Date(item.createdAt).toLocaleDateString()}</p>
            <h3>Watch history</h3>{item.watchHistory?.length ? <div className="history-grid">{item.watchHistory.map((entry) => <div className="history-item" key={entry.movieId}>
              <img src={entry.posterUrl} alt="" />
              <div>
                <strong>{entry.title}</strong>
                <span>{entry.year} · {new Date(entry.watchedAt).toLocaleString()}</span>
              </div>
            </div>)}</div> : <p>This user has not watched any trailers while logged in.</p>}<button className="btn btn-outline danger-button" onClick={() => removeUser(item._id, item.email)}>
              <Trash2 size={15} /> Delete User</button>
          </div>
        </details>)}
      </section>
    </main>
  </>;
}
function getYouTubeId(value = '') {
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v') || '';
      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || '';
    }
  } catch {
    return '';
  }
  return '';
}
function HistoryPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) {
      nav('/login?next=%2Fhistory');
      return;
    }
    api.get('/history').then((response) => setHistory(response.data.history || [])).catch((e) => setError(e.response?.data?.message || 'Could not load watch history.')).finally(() => setLoading(false));
  }, [user, nav]);
  async function clearHistory() {
    if (!window.confirm('Clear your entire watch history?')) return;
    try {
      await api.delete('/history');
      setHistory([]);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not clear history.');
    }
  }
  return <>
    <Header />
    <main className="history-page">
      <div className="table-heading">
        <div>
          <span className="eyebrow">YOUR STREAMING ACTIVITY</span>
          <h1>
            <HistoryIcon /> My Watch History</h1>
          <p>Trailers you have opened while signed in.</p>
        </div>{history.length > 0 && <button className="btn btn-outline" onClick={clearHistory}>Clear History</button>}</div>{error && <p className="form-error">{error}</p>}{loading ? <p>Loading your history…</p> : history.length ? <div className="history-grid history-page-grid">{history.map((entry) => <article className="history-card" key={entry._id}>
          <img src={entry.movie.posterUrl} alt={`${entry.movie.title} poster`} />
          <div>
            <h3>{entry.movie.title}</h3>
            <p>{entry.movie.year} · {entry.movie.rating}</p>
            <small>Last watched: {new Date(entry.watchedAt).toLocaleString()}</small>
            <button className="btn btn-outline" onClick={() => api.delete(`/history/${entry.movie._id}`).then(() => setHistory((current) => current.filter((item) => item.movie._id !== entry.movie._id))).catch((e) => setError(e.response?.data?.message || 'Could not remove item.'))}>Remove</button>
          </div>
        </article>)}</div> : <div className="empty-catalogue">
          <h2>No watch history yet</h2>
          <p>Open a movie trailer while signed in and it will appear here.</p>
          <Link className="btn btn-red" to="/browse">Browse titles</Link>
        </div>}</main>
  </>;
}
function Missing() {
  return <div className="not-found">
    <Header />
    <h1>404</h1>
    <p>This page went off-script.</p>
    <Link className="btn btn-red" to="/">Back to StreamFlix</Link>
  </div>
}
export default function App() {
  const { loading } = useAuth(), location = useLocation();
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname]);
  if (loading) return <div className="boot-screen">
    <span className="brand">STREAMFLIX</span>
    <LoaderCircle className="spin" />
  </div>;
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/browse" element={<Home />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/plans" element={<Plans />} />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="*" element={<Missing />} />
  </Routes>
}
