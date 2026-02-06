import { Search, Waves } from 'lucide-react';
import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-background via-primary/5 to-background border-b border-border py-3 px-6 sticky top-0 z-40 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-2 shadow-lg shadow-primary/20">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <Waves className="w-3 h-3 text-primary absolute -bottom-0.5 -right-0.5 animate-pulse" />
          </motion.div>
          <p className="text-sm text-muted-foreground font-medium">Singapore Tender Finder</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          Powered by Mino.ai
        </div>
      </div>
    </motion.header>
  );
}
