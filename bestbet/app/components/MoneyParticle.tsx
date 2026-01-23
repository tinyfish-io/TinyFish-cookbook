"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

type MoneyParticleProps = {
  id: string;
  image: string;
  x: number;
  y: number;
  onComplete: (id: string) => void;
};

export default function MoneyParticle({
  id,
  image,
  x,
  y,
  onComplete,
}: MoneyParticleProps) {
  const { driftX, rotation, duration, fallDistance } = useMemo(() => ({
    driftX: (Math.random() - 0.5) * 80,
    rotation: (Math.random() - 0.5) * 360,
    duration: 4.5 + Math.random() * 2,
    fallDistance: typeof window !== "undefined" ? window.innerHeight + 150 : 1000,
  }), []);

  return (
    <motion.div
      initial={{ y: 0, opacity: 1, rotate: 0, scale: 0.8 }}
      animate={{
        y: fallDistance,
        x: driftX,
        opacity: [1, 1, 0.8, 0],
        rotate: rotation,
        scale: [0.8, 1, 1, 0.9],
      }}
      transition={{
        duration,
        ease: "easeIn",
        opacity: { duration, times: [0, 0.6, 0.85, 1] },
        scale: { duration, times: [0, 0.2, 0.8, 1] },
      }}
      onAnimationComplete={() => onComplete(id)}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <Image src={image} alt="money" width={50} height={50} />
    </motion.div>
  );
}
