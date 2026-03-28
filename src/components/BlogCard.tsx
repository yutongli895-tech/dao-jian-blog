import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

export interface Post {
  id?: number;
  title_cn: string;
  title_en: string;
  excerpt_cn: string;
  excerpt_en: string;
  content_cn: string;
  content_en: string;
  category_cn: string;
  category_en: string;
  image: string;
  date?: string;
  published?: number;
}

export const BlogCard = ({ post, index, lang }: { post: Post; index: number; lang: 'cn' | 'en' }) => {
  const navigate = useNavigate();
  const title = lang === 'cn' ? post.title_cn : post.title_en;
  const excerpt = lang === 'cn' ? post.excerpt_cn : post.excerpt_en;
  const category = lang === 'cn' ? post.category_cn : post.category_en;

  const handleClick = () => {
    if (post.id) {
      navigate(`/post/${post.id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      onClick={handleClick}
      className="group cursor-pointer border-b border-ink/10 pb-12 hover:border-ink/30 transition-colors"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-1 text-ink/30 font-serif text-2xl italic">
          0{index + 1}
        </div>
        
        <div className="md:col-span-7">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-moss bg-moss/5 px-2 py-0.5 rounded">
              {category}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-ink/40">
              {post.date}
            </span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-serif mb-4 group-hover:italic transition-all duration-500">
            {title}
          </h2>
          
          <p className="text-ink/60 text-sm leading-relaxed max-w-xl mb-6">
            {excerpt}
          </p>
          
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold group-hover:translate-x-2 transition-transform duration-300">
            {lang === 'cn' ? '阅读全文' : 'Read More'} <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
        
        <div className="md:col-span-4 overflow-hidden aspect-[4/3] rounded-sm">
          <img 
            src={post.image} 
            alt={title} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </motion.div>
  );
};
