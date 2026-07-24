'use client';

import React, { useEffect, useRef } from 'react';

export const BlockchainCanvasAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width / 2,
      y: height / 2,
      active: false,
      radius: 180,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Node particles definition
    const nodeCount = Math.min(Math.floor((width * height) / 16000), 50);
    const nodes: {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      pulse: number;
    }[] = [];

    const colors = ['#06b6d4', '#10b981', '#3b82f6', '#0284c7', '#34d399'];

    for (let i = 0; i < nodeCount; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      nodes.push({
        x: rx,
        y: ry,
        baseX: rx,
        baseY: ry,
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        radius: Math.random() * 2.2 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Mouse interactive magnetic connections
      if (mouse.active) {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius
        );
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw node connection lines
      const maxDistance = 140;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            let alpha = (1 - dist / maxDistance) * 0.28;

            // Extra glow if near cursor
            if (mouse.active) {
              const mDist = Math.hypot(
                (nodes[i].x + nodes[j].x) / 2 - mouse.x,
                (nodes[i].y + nodes[j].y) / 2 - mouse.y
              );
              if (mDist < mouse.radius) {
                alpha += (1 - mDist / mouse.radius) * 0.35;
              }
            }

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${Math.min(1, alpha)})`;
            ctx.lineWidth = alpha > 0.3 ? 1.2 : 0.8;
            ctx.stroke();
          }
        }
      }

      // Update and draw nodes with mouse repulsion/attraction physics
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Mouse force
        if (mouse.active) {
          const mdx = mouse.x - node.x;
          const mdy = mouse.y - node.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mDist < mouse.radius) {
            const force = (mouse.radius - mDist) / mouse.radius;
            const angle = Math.atan2(mdy, mdx);
            node.x -= Math.cos(angle) * force * 2.5;
            node.y -= Math.sin(angle) * force * 2.5;
          }
        }

        // Standard movement
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        node.pulse += 0.04;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.6;

        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-55 transition-opacity duration-500"
    />
  );
};
