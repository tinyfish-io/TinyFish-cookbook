'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface BentoCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  delay?: number;
  className?: string;
  enableHover3D?: boolean;
}

/**
 * Motion-enhanced Bento Grid Card
 * Features:
 * - Staggered entrance animation with spring physics
 * - Optional 3D tilt effect on hover
 * - Glassmorphism styling
 */
export default function BentoCard({
  children,
  delay = 0,
  className = '',
  enableHover3D = true,
  ...motionProps
}: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 15,
        delay,
      }}
      whileHover={
        enableHover3D
          ? {
              scale: 1.02,
              rotateX: 2,
              rotateY: 2,
              transition: { type: 'spring', stiffness: 300, damping: 20 },
            }
          : undefined
      }
      className={`glass-card ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
