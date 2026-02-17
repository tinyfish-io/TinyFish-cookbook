import { motion, Easing } from 'framer-motion';
import { Building2, Zap, Globe } from 'lucide-react';
import hotelHero from '@/assets/hotel-hero.jpg';

const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: easeOut },
  },
};

export function HeroSection() {
  return (
    <div className="relative mb-12">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl opacity-10">
        <img 
          src={hotelHero} 
          alt="" 
          className="w-full h-full object-cover blur-sm"
        />
      </div>
      
      <motion.div 
        className="text-center space-y-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20"
          variants={badgeVariants}
        >
          <Zap className="w-4 h-4" />
          AI-Powered Multi-Platform Search
        </motion.div>
        
        <motion.h1 
          className="text-4xl md:text-6xl font-bold font-display tracking-tight"
          variants={itemVariants}
        >
          Find Hotels{' '}
          <span className="text-gradient">Everywhere</span>
        </motion.h1>
        
        <motion.p 
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          variants={itemVariants}
        >
          Search 8+ booking platforms simultaneously. Our AI agents browse Booking.com, Airbnb, Expedia, and more in real-time.
        </motion.p>
        
        <motion.div 
          className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pt-4"
          variants={itemVariants}
        >
          <motion.div 
            className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50 shadow-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Building2 className="w-5 h-5 text-primary" />
            <span>8+ Platforms</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50 shadow-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Zap className="w-5 h-5 text-accent" />
            <span>Parallel Search</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50 shadow-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Globe className="w-5 h-5 text-success" />
            <span>Real-time Results</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
