import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash, LogOut, Save, X, Languages, Loader2, Sparkles } from 'lucide-react';

interface Post {
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

export const AdminDashboard = ({ token, onLogout }: { token: string; onLogout: () => void }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWithAI = async () => {
    if (!editingPost?.title_cn) {
      alert("请先输入文章标题。");
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editingPost.title_cn })
      });

      if (!res.ok) throw new Error('Generation failed');
      
      const result = await res.json() as { title: string; excerpt: string; content: string; category: string };
      setEditingPost({
        ...editingPost,
        title_cn: result.title,
        excerpt_cn: result.excerpt,
        content_cn: result.content,
        category_cn: result.category
      });
    } catch (error) {
      console.error("Generation failed:", error);
      alert("生成失败，请检查网络或重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const translateWithAI = async () => {
    if (!editingPost?.title_cn && !editingPost?.content_cn) return;
    
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editingPost.title_cn,
          category: editingPost.category_cn,
          excerpt: editingPost.excerpt_cn,
          content: editingPost.content_cn
        })
      });

      if (!res.ok) throw new Error('Translation failed');
      
      const result = await res.json() as { title: string; excerpt: string; content: string; category: string };
      setEditingPost({
        ...editingPost,
        title_en: result.title,
        excerpt_en: result.excerpt,
        content_en: result.content,
        category_en: result.category
      });
    } catch (error) {
      console.error("Translation failed:", error);
      alert("翻译失败，请检查网络或重试。");
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchPosts = async () => {
    const res = await fetch('/api/posts');
    const data = await res.json() as Post[];
    setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    const method = editingPost.id ? 'PUT' : 'POST';
    const url = editingPost.id ? `/api/posts/${editingPost.id}` : '/api/posts';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(editingPost),
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingPost(null);
      fetchPosts();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    const res = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) fetchPosts();
  };

  const openEdit = (post: Post | null) => {
    setEditingPost(post || {
      title_cn: '', title_en: '',
      excerpt_cn: '', excerpt_en: '',
      content_cn: '', content_en: '',
      category_cn: '', category_en: '',
      image: 'https://picsum.photos/seed/dao/800/600',
      published: 1
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-paper p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
          <h1 className="text-2xl sm:text-4xl font-serif tracking-widest uppercase">后台管理系统</h1>
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            <button 
              onClick={() => openEdit(null)}
              className="flex-1 sm:flex-none px-6 py-2 bg-moss text-paper flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:bg-ink transition-colors"
            >
              <Plus className="w-4 h-4" /> 发布新文章
            </button>
            <button 
              onClick={onLogout}
              className="flex-1 sm:flex-none px-6 py-2 border border-ink/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors"
            >
              <LogOut className="w-4 h-4" /> 退出
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          {posts.map((post) => (
            <div key={post.id} className="p-6 border border-ink/10 bg-paper hover:shadow-lg transition-all flex justify-between items-center">
              <div>
                <h3 className="text-xl font-serif mb-1">{post.title_cn}</h3>
                <p className="text-xs text-ink/40 uppercase tracking-widest">{post.date} • {post.category_cn}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => openEdit(post)} className="p-2 hover:text-moss transition-colors"><Edit className="w-5 h-5" /></button>
                <button onClick={() => handleDelete(post.id!)} className="p-2 hover:text-red-500 transition-colors"><Trash className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-4xl bg-paper p-6 sm:p-12 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                <h2 className="text-xl sm:text-2xl font-serif uppercase tracking-widest">{editingPost.id ? '编辑文章' : '发布文章'}</h2>
                <button 
                  type="button"
                  onClick={translateWithAI}
                  disabled={isTranslating}
                  className="flex items-center justify-center gap-2 px-4 py-1 border border-moss text-moss text-[10px] uppercase tracking-widest hover:bg-moss hover:text-paper transition-all disabled:opacity-50 w-full sm:w-auto"
                >
                  {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                  {isTranslating ? '翻译中...' : '一键翻译至英文'}
                </button>
                <button 
                  type="button"
                  onClick={generateWithAI}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-4 py-1 border border-ink text-ink text-[10px] uppercase tracking-widest hover:bg-ink hover:text-paper transition-all disabled:opacity-50 w-full sm:w-auto"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isGenerating ? '生成中...' : '一键生成内容'}
                </button>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 sm:relative sm:top-0 sm:right-0"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">标题 (中文)</label>
                  <input 
                    value={editingPost.title_cn}
                    onChange={(e) => setEditingPost({ ...editingPost, title_cn: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">Title (English)</label>
                  <input 
                    value={editingPost.title_en}
                    onChange={(e) => setEditingPost({ ...editingPost, title_en: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">分类 (中文)</label>
                  <input 
                    value={editingPost.category_cn}
                    onChange={(e) => setEditingPost({ ...editingPost, category_cn: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">Category (English)</label>
                  <input 
                    value={editingPost.category_en}
                    onChange={(e) => setEditingPost({ ...editingPost, category_en: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink"
                    required
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">摘要 (中文)</label>
                  <textarea 
                    value={editingPost.excerpt_cn}
                    onChange={(e) => setEditingPost({ ...editingPost, excerpt_cn: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink h-24"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">Excerpt (English)</label>
                  <textarea 
                    value={editingPost.excerpt_en}
                    onChange={(e) => setEditingPost({ ...editingPost, excerpt_en: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink h-24"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">封面图 URL</label>
                  <input 
                    value={editingPost.image}
                    onChange={(e) => setEditingPost({ ...editingPost, image: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">正文内容 (中文 - 支持 Markdown)</label>
                  <textarea 
                    value={editingPost.content_cn}
                    onChange={(e) => setEditingPost({ ...editingPost, content_cn: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink h-48"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">Content (English - Markdown Support)</label>
                  <textarea 
                    value={editingPost.content_en}
                    onChange={(e) => setEditingPost({ ...editingPost, content_en: e.target.value })}
                    className="w-full p-3 bg-transparent border border-ink/20 outline-none focus:border-ink h-48"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <button 
                  type="submit"
                  className="w-full py-4 bg-ink text-paper flex items-center justify-center gap-2 uppercase tracking-widest text-xs hover:bg-moss transition-colors"
                >
                  <Save className="w-4 h-4" /> 保存并发布
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
