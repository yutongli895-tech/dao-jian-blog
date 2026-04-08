import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Tag, Share2, Globe, Landmark, Scale, User, Target } from 'lucide-react';
import { Post } from './BlogCard';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { translations } from '../lib/translations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import matter from 'gray-matter';
import mermaid from 'mermaid';

// Mermaid component to render diagrams using a stable CDN approach to avoid asset loading issues
const Mermaid = ({ chart, theme }: { chart: string; theme: 'light' | 'dark' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || chart.trim().length < 5) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        
        // Use dynamic import from CDN to ensure all chunks (like dagre) are loaded from the same CDN
        // This fixes the "Failed to fetch dynamically imported module" error in production
        // @ts-ignore - Dynamic import from CDN
        const mermaidModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs');
        const mermaid = mermaidModule.default;

        mermaid.initialize({ 
          startOnLoad: false, 
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          themeVariables: {
            primaryColor: '#00896C',
            primaryTextColor: '#FFFFFF',
            primaryBorderColor: '#00896C',
            lineColor: '#00896C',
            secondaryColor: '#F2F0E9',
            tertiaryColor: '#FFFFFF',
            fontSize: '16px',
            mainBkg: '#00896C',
            nodeBorder: '#00896C',
            clusterBkg: '#F2F0E9',
            titleColor: '#00896C',
            edgeLabelBackground: '#FFFFFF',
            nodeRadius: '4px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          flowchart: {
            htmlLabels: true,
            useMaxWidth: false, // Disable automatic scaling to prevent width calculation errors
            curve: 'basis',
            padding: 40,
            nodeSpacing: 60,
            rankSpacing: 60
          }
        });

        try {
          await mermaid.parse(chart);
        } catch (e) {
          if (isMounted.current) setError('Invalid Mermaid Syntax');
          return;
        }

        const { svg: renderedSvg } = await mermaid.render(id, chart);
        if (isMounted.current) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted.current) setError('Render Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    renderChart();
  }, [chart, theme]);

  if (error) {
    return (
      <div className="my-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/20 rounded-sm">
        <p className="text-xs font-mono text-red-600 dark:text-red-400 mb-2">{error}</p>
        <pre className="text-[10px] text-ink/40 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="mermaid-container flex justify-center my-16 overflow-x-auto w-full bg-mist p-8 rounded-sm border border-moss/10 shadow-sm transition-colors duration-500 min-h-[300px]" 
      dangerouslySetInnerHTML={{ __html: svg || '<div class="h-40 bg-moss/5 w-full rounded-sm flex items-center justify-center text-moss/20 text-xs uppercase tracking-widest">Preparing Diagram...</div>' }}
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
  const summary = lang === 'cn' 
    ? (frontmatter.summary_cn || frontmatter.summary || post.excerpt_cn) 
    : (frontmatter.summary_en || frontmatter.summary || post.excerpt_en);

  // Calculate reading time
  const wordCount = finalContent?.length || 0;
  const readingTime = Math.ceil(wordCount / (lang === 'cn' ? 300 : 200));

  // Pre-process content to ensure Mermaid blocks, Tables, and HTML tags are correctly identified
  // Also handle literal \n sequences that might come from the API
  const processedContent = (finalContent || '')
    .replace(/\\n/g, '\n')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Ensure Mermaid blocks have blank lines before and after, and remove indentation
    .replace(/[ \t]*```mermaid\s*([\s\S]*?)```/g, (match, p1) => {
      const cleanMermaid = p1.split('\n').map(line => line.trim()).join('\n');
      return `\n\n\`\`\`mermaid\n${cleanMermaid}\n\`\`\`\n\n`;
    })
    // Ensure HTML blocks have blank lines before and after to help rehype-raw
    .replace(/(<div class="abstract-container">[\s\S]*?<\/div>)/g, '\n\n$1\n\n')
    .replace(/(<div class="golden-sentence">[\s\S]*?<\/div>)/g, '\n\n$1\n\n')
    // Ensure tables have a blank line before them
    .replace(/([^\n])\n[ \t]*\|/g, '$1\n\n|')
    // Ensure tables have a blank line after them
    .replace(/\|\n([^\n|])/g, '|\n\n$1')
    // Ensure table rows are not separated by extra spaces
    .replace(/\|\s*\n\s*\|/g, '|\n|');

  let processedSummary = (String(summary || ''))
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]*```mermaid\s*([\s\S]*?)```/g, (match, p1) => {
      const cleanMermaid = p1.split('\n').map(line => line.trim()).join('\n');
      return `\n\n\`\`\`mermaid\n${cleanMermaid}\n\`\`\`\n\n`;
    });

  // Check if content already contains the abstract container to avoid double summary
  const hasCustomAbstract = processedContent.includes('abstract-container');

  // If the summary starts with the title's first character, strip it to avoid redundancy with the big "道" icon
  const firstChar = title?.[0];
  if (firstChar && processedSummary.startsWith(firstChar)) {
    processedSummary = processedSummary.substring(1).trim();
  }

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

            {summary && !hasCustomAbstract && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-20"
              >
                <h2 className="flex items-center gap-4 mb-10">
                  <span className="w-10 h-10 bg-moss/5 rounded-sm flex items-center justify-center text-moss">
                    <Target className="w-5 h-5" />
                  </span>
                  {lang === 'cn' ? '文章摘要' : 'Abstract'}
                </h2>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="text-8xl font-serif text-moss/80 leading-none select-none pt-2">“{firstChar || '道'}”</div>
                  <div className="flex-1 text-xl md:text-2xl font-serif italic leading-[1.8] text-ink/80">
                    <ReactMarkdown 
                      key={`summary-${processedSummary.length}`}
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const content = String(children || '').trim();
                          const isMermaid = className?.includes('language-mermaid') || className?.includes('mermaid');
                          if (!inline && isMermaid) {
                            const chart = content.replace(/^mermaid\n?/, '').replace(/^```mermaid\n?/, '').replace(/\n?```$/, '').trim();
                            return <Mermaid key={chart.substring(0, 50)} chart={chart} theme={theme} />;
                          }
                          return <code className={className} {...props}>{children}</code>;
                        }
                      }}
                    >
                      {String(processedSummary || '').trim()}
                    </ReactMarkdown>
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
              <ReactMarkdown 
                key={`content-${processedContent.length}`}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h2({ children, node }: any) {
                    const icons = [Globe, Landmark, Scale, User];
                    const h2Index = (node?.position?.start?.line || 0) % icons.length;
                    const Icon = icons[h2Index];
                    
                    return (
                      <h2 className="flex items-center gap-5 group">
                        <span className="w-10 h-10 bg-moss/5 border border-moss/10 rounded-sm flex items-center justify-center text-moss shadow-sm group-hover:bg-moss/10 transition-colors">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1">{children}</span>
                      </h2>
                    );
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const content = String(children || '').trim();
                    const isMermaid = className?.includes('language-mermaid') || className?.includes('mermaid');
                    
                    if (!inline && isMermaid) {
                      // Clean the chart code - remove any markdown artifacts
                      const chart = content
                        .replace(/^mermaid\n?/, '')
                        .replace(/^```mermaid\n?/, '')
                        .replace(/\n?```$/, '')
                        .trim();
                      return <Mermaid key={chart.substring(0, 50)} chart={chart} theme={theme} />;
                    }
                    
                    // Fallback for cases where mermaid might be in a generic code block but starts with graph/sequence etc.
                    if (!inline && !className && (
                      content.startsWith('graph ') || 
                      content.startsWith('graph TD') || 
                      content.startsWith('graph LR') ||
                      content.startsWith('sequenceDiagram') ||
                      content.startsWith('pie') ||
                      content.startsWith('gantt') ||
                      content.startsWith('classDiagram') ||
                      content.startsWith('stateDiagram')
                    )) {
                      return <Mermaid key={content.substring(0, 50)} chart={content} theme={theme} />;
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {String(processedContent || '').trim()}
              </ReactMarkdown>

              {frontmatter.golden_sentence && (
                <div className="mt-24 text-center">
                  <p className="text-2xl md:text-3xl font-serif text-moss italic leading-relaxed">
                    核心金句：“{frontmatter.golden_sentence}”
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
