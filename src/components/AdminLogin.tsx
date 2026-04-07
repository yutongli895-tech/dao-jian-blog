import React, { useState } from 'react';
import { motion } from 'motion/react';

export const AdminLogin = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { token: string; error?: string };
      if (res.ok) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 sm:p-12 border border-ink/10 bg-paper shadow-2xl"
      >
        <h1 className="text-3xl font-serif mb-8 text-center uppercase tracking-widest">管理员登录</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">用户名</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-transparent border border-ink/20 focus:border-ink outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-transparent border border-ink/20 focus:border-ink outline-none transition-colors"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic">{error}</p>}
          <button 
            type="submit"
            className="w-full py-4 bg-ink text-paper uppercase tracking-widest text-xs hover:bg-moss transition-colors"
          >
            进入后台
          </button>
        </form>
      </motion.div>
    </div>
  );
};
