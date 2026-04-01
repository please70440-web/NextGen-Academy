import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#0ea5e9',
    primaryTextColor: '#fff',
    primaryBorderColor: '#0ea5e9',
    lineColor: '#64748b',
    secondaryColor: '#22c55e',
    tertiaryColor: '#f8fafc',
  },
  securityLevel: 'loose',
});

interface MermaidProps {
  chart: string;
}

export const Mermaid = ({ chart }: MermaidProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      const renderChart = async () => {
        try {
          // Unique ID for each render
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (e) {
          console.error("Mermaid render error:", e);
        }
      };
      renderChart();
    }
  }, [chart]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto" ref={ref} />
  );
};
