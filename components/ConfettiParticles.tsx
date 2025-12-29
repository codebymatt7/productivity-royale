"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface ConfettiParticlesProps {
  trigger: boolean;
  color: string;
}

export default function ConfettiParticles({ trigger, color }: ConfettiParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const colors = [
        color === "red" ? "#ef4444" : color === "blue" ? "#3b82f6" : color === "green" ? "#10b981" : "#a855f7",
        "#fbbf24",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
      ];
      
      const newParticles: Particle[] = [];
      for (let i = 0; i < 12; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100 - 50,
          y: Math.random() * 100 - 50,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      setParticles(newParticles);

      setTimeout(() => {
        setParticles([]);
      }, 1000);
    }
  }, [trigger, color]);

  return (
    <>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [1, 1.2, 0],
            x: particle.x,
            y: particle.y - 30,
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="absolute w-2 h-2 rounded-full pointer-events-none z-20"
          style={{ backgroundColor: particle.color }}
        />
      ))}
    </>
  );
}

