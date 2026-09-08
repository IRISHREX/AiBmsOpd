import React, { useState, useEffect } from 'react';
import './ErrorPage.css';

export default function CyberPunk404() {
  const [glitch, setGlitch] = useState(false);
  const [sharinganRotate, setSharinganRotate] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const glitchInterval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 100);
    }, 3000);

    const rotateInterval = setInterval(() => {
      setSharinganRotate(prev => (prev + 120) % 360);
    }, 2000);

    return () => {
      document.body.style.overflow = 'auto';
      clearInterval(glitchInterval);
      clearInterval(rotateInterval);
    };
  }, []);

  return (
    <div className="container">
      {/* Animated grid background */}
      <div className="grid-bg"></div>

      {/* Scanlines */}
      <div className="scanlines"></div>

      {/* Main content */}
      <div className="content">
        {/* Sharingan Eye */}
        <div className="sharingan-container">
          <div className="sharingan">
            {/* Outer circle */}
            <div className="outer-circle"></div>
            
            {/* Inner circle */}
            <div className="inner-circle"></div>
            
            {/* Pupil */}
            <div className="pupil"></div>
            
            {/* Tomoe (spinning commas) */}
            <div 
              className="tomoe-container"
              style={{ transform: `rotate(${sharinganRotate}deg)` }}
            >
              {[0, 120, 240].map((angle, i) => (
                <div
                  key={i}
                  className="tomoe-wrapper"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div className="tomoe"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error code */}
        <h1 className={`error-code ${glitch ? 'glitch' : ''}`}>
          404
        </h1>

        {/* Company name */}
        <div className="company-name">
          ⚡ BIOMECHASOFT ⚡
        </div>

        {/* Message */}
        <p className="message-bold">
          We like your boldness 😎
        </p>
        
        <p className="message-regular">
          But the page is not there!
        </p>

        {/* Button */}
        <button
          onClick={() => window.location.href = '/'}
          className="home-button"
        >
          &gt;&gt; Return Home
        </button>

        {/* Binary rain effect */}
        <div className="binary-rain">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="binary-digit"
              style={{
                left: `${i * 5}%`,
                animationDuration: `${3 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              {Math.random() > 0.5 ? '1' : '0'}
            </div>
          ))}
        </div>
      </div>

      
    </div>
  );
}