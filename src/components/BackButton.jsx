import React, { useEffect } from 'react';
import './BackButton.css';
import { useNavigate } from 'react-router-dom';

const BackButton = () => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    createFlash(x, y);
    createBurstRing(x, y);
    createParticles(x, y);

    btn.style.transform = 'scale(0.85)';
    setTimeout(() => {
      btn.style.transform = '';
      navigate(-1); // Navigate back after the animation
    }, 100);
  };

  const createParticles = (x, y) => {
    const particleCount = 12;
    const emoji = ['✨', '💥', '⚡', '🔥', '💫'];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.textContent = emoji[Math.floor(Math.random() * emoji.length)];

      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 80 + Math.random() * 40;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  };

  const createBurstRing = (x, y) => {
    const ring = document.createElement('div');
    ring.className = 'burst-ring';
    ring.style.left = x - 20 + 'px';
    ring.style.top = y - 20 + 'px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
  };

  const createFlash = (x, y) => {
    const flash = document.createElement('div');
    flash.className = 'flash';
    flash.style.setProperty('--x', x + 'px');
    flash.style.setProperty('--y', y + 'px');
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
  };

  return (
    <button className="arrow-btn" title="Go back" onClick={handleClick}></button>
  );
};

export default BackButton;