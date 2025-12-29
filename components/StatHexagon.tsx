"use client";

import { useState, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface StatHexagonProps {
  strength: number;
  intelligence: number;
  charisma: number;
  willpower: number;
}

export default function StatHexagon({ strength, intelligence, charisma, willpower }: StatHexagonProps) {
  // Normalize data to always show a full chart but scale with actual values
  const maxValue = Math.max(strength, intelligence, charisma, willpower, 100);
  
  const data = [
    { stat: "STR", value: strength, fullMark: maxValue },
    { stat: "INT", value: intelligence, fullMark: maxValue },
    { stat: "CHA", value: charisma, fullMark: maxValue },
    { stat: "WIL", value: willpower, fullMark: maxValue },
  ];

  // Animated data that grows from 0
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, value: 0 })));

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setAnimatedData(data.map(d => ({
        ...d,
        value: d.value * progress,
      })));

      if (step >= steps) {
        setAnimatedData(data);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [strength, intelligence, charisma, willpower, maxValue]);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={animatedData}>
          <PolarGrid 
            stroke="#334155" 
            strokeWidth={1}
            strokeOpacity={0.4}
          />
          <PolarAngleAxis 
            dataKey="stat" 
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: '600' }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, maxValue]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Stats"
            dataKey="value"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.3}
            strokeWidth={3}
            dot={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
