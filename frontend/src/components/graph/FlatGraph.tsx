import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';
import { GRAPH } from '@/api/mocks/mockDb';

cytoscape.use(dagre);

interface FlatGraphProps {
  masteryMap?: Record<number, number>;
  onNodeClick?: (conceptId: number) => void;
  height?: string;
}

export const FlatGraph: React.FC<FlatGraphProps> = ({
  masteryMap,
  onNodeClick,
  height = '500px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];

    GRAPH.nodes.forEach((node) => {
      const mastery = masteryMap ? masteryMap[node.id] ?? 0.6 : 0.65;
      let bgColor = '#1D6B66'; // Lagoon
      if (mastery < 0.4) {
        bgColor = '#C8452F'; // Terracotta
      } else if (mastery < 0.7) {
        bgColor = '#D99A1E'; // Amber
      }

      elements.push({
        data: {
          id: `node-${node.id}`,
          conceptId: node.id,
          label: `${node.code}\n${node.name}`,
          level: node.level,
          mastery,
          bgColor,
        },
      });
    });

    GRAPH.edges.forEach((edge, idx) => {
      elements.push({
        data: {
          id: `edge-${idx}`,
          source: `node-${edge.from}`,
          target: `node-${edge.to}`,
        },
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'font-size': '10px',
            'font-family': 'Geist, sans-serif',
            color: '#121212',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': 'data(bgColor)',
            width: 26,
            height: 26,
            'border-width': 1,
            'border-color': '#FFFFFF',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#E3DED2',
            'target-arrow-color': '#E3DED2',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 40,
        rankSep: 70,
      } as cytoscape.LayoutOptions,
    });

    cy.on('tap', 'node', (evt) => {
      const cid = evt.target.data('conceptId');
      if (cid && onNodeClick) {
        onNodeClick(cid);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [masteryMap, onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-card border border-line bg-surface/50"
      style={{ height }}
    />
  );
};
