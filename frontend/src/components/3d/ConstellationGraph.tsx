import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GRAPH } from '@/api/mocks/mockDb';
import { prefersReducedMotion } from '@/lib/motion';

interface ConstellationGraphProps {
  interactive?: boolean;
  masteryMap?: Record<number, number>;
  highlightNodeId?: number;
  height?: string;
  onNodeClick?: (conceptId: number) => void;
}

export const ConstellationGraph: React.FC<ConstellationGraphProps> = ({
  interactive = true,
  masteryMap,
  highlightNodeId,
  height = '500px',
  onNodeClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredConcept, setHoveredConcept] = useState<{
    id: number;
    name: string;
    level: number;
    mastery: number;
  } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || reducedMotion) return;

    const width = mount.clientWidth || 600;
    const heightPx = mount.clientHeight || 500;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = null; // transparent to match paper

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(0, 5, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    // Graph layout calculations (38 nodes distributed across 6 tiers)
    const nodeCount = GRAPH.nodes.length;
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeDataMap = new Map<number, { pos: THREE.Vector3; concept: typeof GRAPH.nodes[0] }>();

    // Count descendants / degrees for node sizing
    const degreeMap: Record<number, number> = {};
    GRAPH.edges.forEach((edge) => {
      degreeMap[edge.from] = (degreeMap[edge.from] || 0) + 1;
      degreeMap[edge.to] = (degreeMap[edge.to] || 0) + 1;
    });

    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Place nodes in tiered 3D cylinder/spiral
    GRAPH.nodes.forEach((node) => {
      const level = node.level; // 1 to 6
      const nodesAtLevel = GRAPH.nodes.filter((n) => n.level === level);
      const indexInLevel = nodesAtLevel.findIndex((n) => n.id === node.id);
      const totalAtLevel = nodesAtLevel.length;

      const angle = (indexInLevel / totalAtLevel) * Math.PI * 2 + (level * 0.4);
      const radius = 5.5 + (node.id % 3) * 0.6;
      const y = (level - 3.5) * 3.2 + (Math.sin(node.id) * 0.5);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const pos = new THREE.Vector3(x, y, z);
      nodeDataMap.set(node.id, { pos, concept: node });

      // Determine color by mastery band:
      // Strong (>= 0.7): Lagoon #1D6B66
      // Developing (0.4 - 0.7): Amber #D99A1E
      // Weak (< 0.4): Terracotta #C8452F
      const mastery = masteryMap ? masteryMap[node.id] ?? 0.6 : 0.65;
      let colorHex = 0x1d6b66; // default lagoon
      if (mastery < 0.4 || node.id === highlightNodeId) {
        colorHex = 0xc8452f; // terracotta
      } else if (mastery < 0.7) {
        colorHex = 0xd99a1e; // amber
      }

      const degree = degreeMap[node.id] || 1;
      const nodeRadius = 0.35 + Math.min(degree * 0.08, 0.45);

      const sphereGeo = new THREE.SphereGeometry(nodeRadius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.copy(pos);
      mesh.userData = { conceptId: node.id, concept: node, mastery };
      graphGroup.add(mesh);
      nodeMeshes.push(mesh);
    });

    // Edges geometry
    const edgePoints: THREE.Vector3[] = [];
    GRAPH.edges.forEach((edge) => {
      const fromNode = nodeDataMap.get(edge.from);
      const toNode = nodeDataMap.get(edge.to);
      if (fromNode && toNode) {
        edgePoints.push(fromNode.pos);
        edgePoints.push(toNode.pos);
      }
    });

    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xe3ded2, // line color
      transparent: true,
      opacity: 0.65,
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    graphGroup.add(edgeLines);

    // Raycaster for hover/click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging && interactive) {
        const deltaX = e.clientX - prevMouse.x;
        const deltaY = e.clientY - prevMouse.y;
        graphGroup.rotation.y += deltaX * 0.005;
        graphGroup.rotation.x += deltaY * 0.005;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: MouseEvent) => {
      isDragging = false;
      const rect = mount.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const clickY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        const cid = intersects[0].object.userData.conceptId;
        if (cid && onNodeClick) {
          onNodeClick(cid);
        }
      }
    };

    mount.addEventListener('mousemove', handlePointerMove);
    mount.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isDragging) {
        graphGroup.rotation.y += 0.002;
      }

      // Check intersections for tooltips
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        setHoveredConcept({
          id: data.conceptId,
          name: data.concept.name,
          level: data.concept.level,
          mastery: data.mastery,
        });
        document.body.style.cursor = 'pointer';
      } else {
        setHoveredConcept(null);
        document.body.style.cursor = 'default';
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousemove', handlePointerMove);
      mount.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      document.body.style.cursor = 'default';
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion, interactive, masteryMap, highlightNodeId, onNodeClick]);

  if (reducedMotion) {
    return (
      <div
        className="relative flex flex-col items-center justify-center rounded-card border border-line bg-surface p-8 text-center"
        style={{ height }}
      >
        <div className="font-display text-2xl text-ink">38-Concept Knowledge Graph</div>
        <p className="mt-2 text-sm text-muted max-w-md">
          Static view active due to reduced-motion preference. The graph models 38 prerequisite connections across 6 curricular levels.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono-numbers">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-lagoon"></span> Strong (≥70%)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber"></span> Developing (40-69%)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-terracotta"></span> Weak (&lt;40%)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <div ref={mountRef} className="h-full w-full" />

      {/* Floating Hover Tooltip */}
      {hoveredConcept && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-card border border-line bg-surface/95 px-4 py-2.5 shadow-card backdrop-blur-sm">
          <div className="text-xs uppercase tracking-wider text-muted font-mono-numbers">
            Level {hoveredConcept.level} Concept
          </div>
          <div className="font-medium text-ink text-sm">{hoveredConcept.name}</div>
          <div className="mt-1 flex items-center gap-2 text-xs font-mono-numbers text-muted">
            <span>Mastery: {Math.round(hoveredConcept.mastery * 100)}%</span>
          </div>
        </div>
      )}

      {/* Graph Legend */}
      <div className="pointer-events-none absolute top-4 right-4 z-20 flex flex-col gap-1.5 rounded-card border border-line bg-surface/90 px-3 py-2 text-[11px] font-mono-numbers shadow-card backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-lagoon" />
          <span className="text-muted">Strong (≥70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber" />
          <span className="text-muted">Developing (40-69%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
          <span className="text-muted">Weak (&lt;40%)</span>
        </div>
        <div className="mt-1 border-t border-line/60 pt-1 text-[10px] text-muted">
          Node radius ∝ descendants
        </div>
      </div>
    </div>
  );
};
