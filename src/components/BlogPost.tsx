import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Tag, Share2, Home, Zap, Target, Compass } from 'lucide-react';
import { Post } from './BlogCard';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { translations } from '../lib/translations';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import matter from 'gray-matter';
import mermaid from 'mermaid';

// Mermaid component to render diagrams
const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ 
        startOnLoad: true, 
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'Noto Serif SC, serif',
        themeVariables: {
          primaryColor: '#2D4B44',
          primaryTextColor: '#FDFCF8',
          primaryBorderColor: '#2D4B44',
          lineColor: '#2D4B44',
          secondaryColor: '#E8F0EE',
          tertiaryColor: '#FDFCF8',
          fontSize: '14px'
        }
      });
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="mermaid flex justify-center my-16 overflow-x-auto" ref={ref}>
      {chart}
    </div>
  );
};

export const BlogPost = ({ theme, toggleTheme, lang, toggleLang, onNavClick, onSubscribe }: { 
  theme: 'light' | 'dark'; 
  toggleTheme: () => void;
  lang: 'cn' | 'en';
  toggleLang: () => void;
  onNavClick: (item: string) => void;
  onSubscribe: () => void;
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${id}`);
        if (!res.ok) throw new Error('Post not found');
        const data = await res.json() as Post;
        setPost(data);
      } catch (err) {
        console.error(err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-ink/10 border-t-ink rounded-full"
        />
      </div>
    );
  }

  if (!post) return null;

  const title = lang === 'cn' ? post.title_cn : post.title_en;
  const rawContent = lang === 'cn' ? post.content_cn : post.content_en;
  const category = lang === 'cn' ? post.category_cn : post.category_en;

  // Strip frontmatter and <!--more-->
  const { data: frontmatter, content: cleanContent } = matter(rawContent || '');
  const finalContent = cleanContent.replace(/<!--more-->/g, '');
  const summary = lang === 'cn' ? frontmatter.summary_cn || frontmatter.summary : frontmatter.summary_en || frontmatter.summary;

  // Calculate reading time
  const wordCount = finalContent?.length || 0;
  const readingTime = Math.ceil(wordCount / (lang === 'cn' ? 300 : 200));

  return (
    <div className="min-h-screen bg-paper transition-colors duration-500 relative overflow-hidden">
      {/* Aesthetic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[1000px] bg-gradient-to-b from-moss/5 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-moss/5 blur-[120px] rounded-full pointer-events-none" />
      
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        lang={lang} 
        toggleLang={toggleLang} 
        t={t} 
        onNavClick={onNavClick}
        onSubscribe={onSubscribe}
      />
      
      <main className="pt-32 pb-24 px-6 relative z-10">
        <article className="max-w-3xl mx-auto">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-ink/40 hover:text-ink mb-12 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {lang === 'cn' ? '返回首页' : 'Back to Home'}
          </motion.button>

          <header className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-6 mb-8"
            >
              <button 
                onClick={() => onNavClick(category)}
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-moss bg-moss/5 px-3 py-1 rounded-full hover:bg-moss/10 transition-colors"
              >
                <Tag className="w-3 h-3" />
                {category}
              </button>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-ink/40">
                <Calendar className="w-3 h-3" />
                {post.date}
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-ink/40">
                <span className="w-1 h-1 bg-ink/20 rounded-full" />
                {readingTime} {lang === 'cn' ? '分钟阅读' : 'min read'}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-6xl font-serif leading-[1.15] mb-12 tracking-tight text-ink"
            >
              {title}
            </motion.h1>

            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="abstract-container"
              >
                <div className="abstract-drop-cap">“</div>
                <div className="abstract-content">
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-moss/40 mb-4">
                    {lang === 'cn' ? '文章摘要' : 'Abstract'}
                  </div>
                  <p className="text-xl md:text-2xl font-serif italic leading-relaxed text-ink/70">
                    {summary}
                  </p>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1.2 }}
              className="aspect-[21/9] rounded-sm overflow-hidden mb-16 grayscale hover:grayscale-0 transition-all duration-1000 group relative shadow-2xl shadow-ink/5"
            >
              <div className="absolute inset-0 bg-ink/5 group-hover:bg-transparent transition-colors duration-1000 z-10" />
              <img 
                src={post.image} 
                alt={title} 
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="prose prose-ink dark:prose-invert max-w-none relative"
          >
            <div className="markdown-body drop-cap selection:bg-moss/20">
              <Markdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h2({ children, node }: any) {
                    const icons = [Home, Zap, Target, Compass];
                    // Find index of this h2 among all h2s in the content
                    const h2Index = (node?.position?.start?.line || 0) % icons.length;
                    const Icon = icons[h2Index];
                    
                    return (
                      <h2 className="flex items-center gap-4">
                        <span className="w-10 h-10 bg-moss/5 border border-moss/10 rounded-sm flex items-center justify-center text-moss">
                          <Icon className="w-5 h-5" />
                        </span>
                        {children}
                      </h2>
                    );
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match && match[1] === 'mermaid') {
                      return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {finalContent}
              </Markdown>

              {frontmatter.golden_sentence && (
                <div className="golden-sentence">
                  <div className="golden-sentence-icon">核</div>
                  <p className="text-2xl font-serif text-moss leading-relaxed">
                    {frontmatter.golden_sentence}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <footer className="mt-24 pt-12 border-t border-ink/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-ink/40 text-sm font-serif italic">
              {lang === 'cn' ? '感谢阅读，愿你有所收获。' : 'Thank you for reading. May you find insight.'}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert(lang === 'cn' ? '链接已复制' : 'Link copied');
              }}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-ink/60 hover:text-ink transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'cn' ? '分享文章' : 'Share Post'}
            </button>
          </footer>
        </article>
      </main>

      <Footer t={t.footer} onNavClick={onNavClick} onSubscribe={onSubscribe} />
    </div>
  );
};
