import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'about' | 'subscribe' | null;
  lang: 'cn' | 'en';
}

export const Modal = ({ isOpen, onClose, type, lang }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && type && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-ink/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-paper p-12 max-w-lg w-full relative border border-ink/10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-ink/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-ink" />
            </button>

            {type === 'about' ? (
              <div className="font-serif text-ink">
                <h3 className="text-3xl mb-6">{lang === 'cn' ? '关于 Dao Insight' : 'About Dao Insight'}</h3>
                <p className="text-ink/70 leading-relaxed mb-6 italic">
                  {lang === 'cn' 
                    ? 'Dao Insight 是一个致力于探索东方哲学与现代生活交汇点的数字空间。我们相信，在瞬息万变的世界中，古老的智慧能为我们提供持久的宁静。'
                    : 'Dao Insight is a digital space dedicated to exploring the intersection of Eastern philosophy and modern life. We believe ancient wisdom provides lasting peace in a rapidly changing world.'}
                </p>
                <p className="text-ink/70 leading-relaxed">
                  {lang === 'cn'
                    ? '通过“论道”与“悟道”，我们试图解构复杂的宇宙法则，将其转化为可感知的日常体验。'
                    : 'Through "Discussions" and "Insights", we attempt to deconstruct complex universal laws into perceptible daily experiences.'}
                </p>
              </div>
            ) : (
              <div className="font-serif text-ink">
                <h3 className="text-3xl mb-6">{lang === 'cn' ? '订阅我们的通讯' : 'Subscribe to Newsletter'}</h3>
                <p className="text-ink/70 mb-8">
                  {lang === 'cn'
                    ? '每周获取关于宁静与平衡的深度思考。'
                    : 'Get weekly deep thoughts on peace and balance.'}
                </p>
                <div className="flex flex-col gap-4">
                  <input 
                    type="email" 
                    placeholder={lang === 'cn' ? '您的邮箱地址' : 'Your email address'}
                    className="w-full px-4 py-3 border border-ink/20 focus:border-moss outline-none transition-colors bg-transparent text-ink"
                  />
                  <button 
                    onClick={() => {
                      alert(lang === 'cn' ? '订阅成功！' : 'Subscribed successfully!');
                      onClose();
                    }}
                    className="w-full py-3 bg-ink text-paper uppercase tracking-widest text-xs hover:bg-moss transition-colors"
                  >
                    {lang === 'cn' ? '立即订阅' : 'Subscribe Now'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
