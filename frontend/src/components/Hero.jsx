import { useEffect, useRef, useState } from 'react';
import { triggerDemo } from '../api';
import './Hero.css';

export default function Hero() {
  const canvasRef = useRef(null);
  const [typed, setTyped] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const fullText = 'Autonomous IoT Defense System';

  // Typing animation
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setTyped(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    const connections = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles (network nodes)
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 1,
        type: Math.random() > 0.8 ? 'threat' : 'normal'
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move & draw particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (p.type === 'threat') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
        } else {
          ctx.fillStyle = 'rgba(0, 245, 255, 0.4)';
          ctx.shadowColor = 'rgba(0, 245, 255, 0.2)';
        }
        ctx.shadowBlur = 10;
        ctx.fill();
      }

      // Draw connections
      ctx.shadowBlur = 0;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const alpha = (1 - dist / 150) * 0.15;
            ctx.strokeStyle = particles[i].type === 'threat' || particles[j].type === 'threat'
              ? `rgba(239, 68, 68, ${alpha})`
              : `rgba(0, 245, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleDemo = async (mode) => {
    setDemoLoading(true);
    await triggerDemo(mode);
    setTimeout(() => setDemoLoading(false), 1500);
  };

  return (
    <section id="hero" className="hero-section">
      <canvas ref={canvasRef} className="hero-canvas" />

      <div className="hero-overlay" />

      <div className="hero-content">
        <div className="hero-badge mono">
          <span className="badge-dot" />
          ANVIL 2026 — AUTONOMOUS MULTI-AGENT SECURITY
        </div>

        <h1 className="hero-title">
          <span className="title-line-1">AI Home</span>
          <span className="title-line-2 gradient-text">Shield</span>
        </h1>

        <div className="hero-typed mono">
          <span className="typed-prefix">&gt; </span>
          <span className="typed-text">{typed}</span>
          <span className="typed-cursor">|</span>
        </div>

        <p className="hero-desc">
          Zero-intervention threat detection, LLM-powered reasoning, autonomous response.
          Multi-agent pipeline protects your home IoT network 24/7.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={() => handleDemo('honeytoken')} disabled={demoLoading}>
            {demoLoading ? (
              <><span className="spinner" /> Pipeline Running...</>
            ) : (
              <><span className="btn-icon">⚡</span> Launch Attack Demo</>
            )}
          </button>
          <button className="btn-secondary" onClick={() => document.getElementById('devices')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="btn-icon">🔍</span> View Network
          </button>
        </div>

        <div className="hero-stats">
          {[
            { val: '4', label: 'Protected Devices', icon: '📡' },
            { val: '<2s', label: 'Response Time', icon: '⚡' },
            { val: '6', label: 'Active Agents', icon: '🤖' },
            { val: '24/7', label: 'Autonomous', icon: '🛡️' },
          ].map((s, i) => (
            <div key={i} className="hero-stat glass-card">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-val">{s.val}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-indicator" onClick={() => document.getElementById('devices')?.scrollIntoView({ behavior: 'smooth' })}>
        <div className="scroll-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </div>
    </section>
  );
}
