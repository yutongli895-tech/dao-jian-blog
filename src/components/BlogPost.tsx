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
const Mermaid = ({ chart, theme }: { chart: string; theme: 'light' | 'dark' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const isDark = theme === 'dark';
        
        mermaid.initialize({ 
          startOnLoad: false, 
          theme: isDark ? 'dark' : 'base',
          securityLevel: 'loose',
          fontFamily: 'Noto Serif SC, serif',
          themeVariables: {
            primaryColor: '#00896C',
            primaryTextColor: '#FFFFFF',
            primaryBorderColor: '#00896C',
            lineColor: '#00896C',
            secondaryColor: isDark ? '#1E1E1E' : '#F2F0E9',
            tertiaryColor: isDark ? '#121212' : '#FFFFFF',
            fontSize: '16px',
            mainBkg: '#00896C',
            nodeBorder: '#00896C',
            clusterBkg: isDark ? '#1E1E1E' : '#F2F0E9',
            titleColor: '#00896C',
            edgeLabelBackground: isDark ? '#121212' : '#FDFCF8',
            nodeRadius: '4px'
          }
        });
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError(false);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(true);
      }
    };
    renderChart();
  }, [chart, theme]);

  if (error) return <pre className="text-xs text-red-500 p-4 bg-red-50 overflow-x-auto">{chart}</pre>;

  return (
    <div 
      className="mermaid-container flex justify-center my-16 overflow-x-auto w-full bg-mist p-8 rounded-sm border border-moss/10 shadow-sm transition-colors duration-500" 
      dangerouslySetInnerHTML={{ __html: svg || '<div class="animate-pulse h-40 bg-moss/5 w-full rounded-sm"></div>' }}
    />
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const t = translations[lang];

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  const finalContent = cleanContent.replace(/<!--more-->/g, '').trim();
  const summary = lang === 'cn' ? frontmatter.summary_cn || frontmatter.summary : frontmatter.summary_en || frontmatter.summary;

  // Calculate reading time
  const wordCount = finalContent?.length || 0;
  const readingTime = Math.ceil(wordCount / (lang === 'cn' ? 300 : 200));

  // Pre-process content to ensure Mermaid blocks and Tables are correctly identified
  const processedContent = finalContent
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Ensure Mermaid blocks have blank lines before and after, and remove indentation
    .replace(/^\s*```mermaid\s*([\s\S]*?)```/gm, (match, p1) => {
      return `\n\n\`\`\`mermaid\n${p1.trim()}\n\`\`\`\n\n`;
    })
    // Ensure tables have a blank line before them and remove leading spaces
    .replace(/([^\n])\n\s*\|/g, '$1\n\n|')
    // Ensure tables have a blank line after them
    .replace(/\|\n([^\n|])/g, '|\n\n$1')
    // Ensure table rows are not separated by extra spaces
    .replace(/\|\s*\n\s*\|/g, '|\n|');

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

      {/* Reading Progress Bar */}
      <div className="fixed top-[72px] left-0 w-full h-[2px] bg-moss/5 z-50">
        <motion.div 
          className="h-full bg-moss"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
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
              className="text-4xl md:text-6xl font-serif leading-[1.15] mb-12 tracking-tight text-ink"
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
                <div className="abstract-title">
                  {lang === 'cn' ? '文章摘要' : 'Abstract'}
                </div>
                <div className="abstract-content-wrapper flex-col sm:flex-row gap-6 sm:gap-10">
                  <div className="abstract-drop-cap text-7xl sm:text-9xl">“道”</div>
                  <div className="abstract-text text-lg sm:text-2xl">
                    {summary}
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1.2 }}
              className="aspect-[16/10] sm:aspect-[21/9] rounded-sm overflow-hidden mb-16 grayscale hover:grayscale-0 transition-all duration-1000 group relative shadow-2xl shadow-ink/5"
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
                    const h2Index = (node?.position?.start?.line || 0) % icons.length;
                    const Icon = icons[h2Index];
                    
                    return (
                      <h2 className="flex items-center gap-5 group">
                        <span className="w-12 h-12 bg-moss/5 border border-moss/10 rounded-sm flex items-center justify-center text-moss shadow-sm group-hover:bg-moss/10 transition-colors">
                          <Icon className="w-6 h-6" />
                        </span>
                        <span className="flex-1">{children}</span>
                      </h2>
                    );
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const content = String(children).trim();
                    // More robust Mermaid detection
                    const isMermaid = className?.includes('language-mermaid') || 
                                     className?.includes('mermaid') ||
                                     content.startsWith('graph ') || 
                                     content.startsWith('graph TD') ||
                                     content.startsWith('sequenceDiagram') ||
                                     content.startsWith('pie') ||
                                     content.startsWith('gantt') ||
                                     content.includes('```mermaid') ||
                                     content.includes('graph TD') ||
                                     content.includes('graph LR');
                    
                    if (!inline && isMermaid) {
                      // Clean the chart code
                      const chart = content
                        .replace(/^mermaid\n?/, '')
                        .replace(/^```mermaid\n?/, '')
                        .replace(/\n?```$/, '')
                        .replace(/^```mermaid\n?/, '') // Double check for nested backticks
                        .trim();
                      return <Mermaid key={chart.substring(0, 30)} chart={chart} theme={theme} />;
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {processedContent}
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
