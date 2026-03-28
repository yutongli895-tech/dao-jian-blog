import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { BlogCard, Post } from './components/BlogCard';
import { Footer } from './components/Footer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from './lib/translations';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'cn' | 'en'>('cn');
  const [posts, setPosts] = useState<Post[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('dao_token'));
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsLoaded(true);
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json() as Post[];
      setPosts(data);
    } catch (err) {
      console.error('Failed to fetch posts');
    }
  };

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('dao_token', newToken);
    navigate('/admin');
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('dao_token');
    navigate('/login');
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(prev => prev === 'cn' ? 'en' : 'cn');

  const t = translations[lang];

  return (
    <div className="min-h-screen selection:bg-moss selection:text-paper transition-colors duration-500">
      <AnimatePresence>
        {!isLoaded && (
          <motion.div 
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-paper flex items-center justify-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-2 border-ink/10 border-t-ink rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <>
            <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} t={t} />
            <main>
              <Hero t={t.hero} />
              <section className="max-w-7xl mx-auto px-6 py-32 relative">
                <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.03] pointer-events-none text-ink">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M50 10 A40 40 0 1 1 49.9 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 50" />
                  </svg>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
                  <div className="max-w-xl">
                    <span className="text-xs uppercase tracking-[0.3em] text-moss font-bold mb-4 block">{t.blog.tag}</span>
                    <h2 className="text-5xl md:text-6xl font-serif leading-tight">{t.blog.title}</h2>
                  </div>
                  <div className="text-ink/40 text-sm font-serif italic max-w-xs text-right">{t.blog.quote}</div>
                </div>
                
                <div className="space-y-24">
                  {posts.length > 0 ? (
                    posts.map((post, index) => (
                      <BlogCard key={post.id} post={post} index={index} lang={lang} />
                    ))
                  ) : (
                    <div className="py-24 text-center text-ink/20 font-serif italic">
                      {lang === 'cn' ? '暂无文章，请前往后台发布。' : 'No posts yet. Please visit admin to publish.'}
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-mist py-48 px-6 text-center overflow-hidden relative transition-colors duration-500">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }} className="relative z-10">
                  <blockquote className="text-4xl md:text-7xl font-serif italic leading-tight max-w-5xl mx-auto mb-12">
                    {lang === 'cn' ? '“致虚极，守静笃。万物并作，吾以观复。”' : '"Attain complete vacuity, maintain steadfast quietude."'}
                  </blockquote>
                  <cite className="text-xs uppercase tracking-[0.5em] font-bold text-ink/40 not-italic">— {lang === 'cn' ? '老子《道德经》第十六章' : 'Laozi, Tao Te Ching, Chapter 16'}</cite>
                </motion.div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square border border-ink/5 rounded-full pointer-events-none" />
              </section>
            </main>
            <Footer t={t.footer} />
          </>
        } />

        {/* Admin Routes */}
        <Route path="/login" element={<AdminLogin onLogin={handleLogin} />} />
        <Route path="/admin" element={
          token ? <AdminDashboard token={token} onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />
        } />
      </Routes>
    </div>
  );
}
