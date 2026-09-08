import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { setTheme, setCustomTheme } from '../store/themeSlice';
import { playSaveSound, playLoadSound, playLoadSound2, playDeleteSound } from '../utils/soundUtils';
import HeaderFooterCreator from './HeaderFooterCreator';
import "./Settings.css";
import "./GeneralSettings.css";


const themes = [
  { key: "theme-light", name: "Light" },
  { key: "theme-dark", name: "Dark" },
  { key: "theme-cyberpunk", name: "Cyberpunk" },
  { key: "theme-blackpink", name: "Black Pink" },
  { key: "theme-retro", name: "Retro" },
  { key: "theme-darkgreen", name: "Dark Green" },
];

const GeneralSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected = useSelector(state => state.theme.theme);
  const custom = useSelector(state => state.theme.custom);
  const [activeSection, setActiveSection] = useState('themes');
  
  // Sound settings state
  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem('soundVolume');
    return stored ? parseFloat(stored) : 50;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem('soundMuted');
    return stored ? JSON.parse(stored) : false;
  });

  // Save volume to localStorage and soundUtils
  useEffect(() => {
    localStorage.setItem('soundVolume', volume);
    // Update global sound volume
    window.globalSoundVolume = volume / 100;
  }, [volume]);

  // Save mute state to localStorage
  useEffect(() => {
    localStorage.setItem('soundMuted', isMuted);
    window.globalSoundMuted = isMuted;
  }, [isMuted]);

  // Handlers for custom theme settings
  const handleCustom = (key, value) => {
    dispatch(setCustomTheme({ [key]: value }));
  };

  // Test sound functions
  const testSaveSound = () => {
    if (!isMuted) playSaveSound();
  };

  const testLoadSound = () => {
    if (!isMuted) playLoadSound();
  };

  const testLoginSound = () => {
    if (!isMuted) playLoadSound2();
  };

  const testDeleteSound = () => {
    if (!isMuted) playDeleteSound();
  };

  // Live preview for custom theme
  React.useEffect(() => {
    if (selected === 'theme-custom') {
      const root = document.documentElement;
      root.style.setProperty('--btn-radius', custom.btnRadius + 'px');
      root.style.setProperty('--btn-opacity', custom.btnOpacity);
      root.style.setProperty('--text-size', custom.textSize + 'px');
      root.style.setProperty('--bg-main', custom.bgMain);
      root.style.setProperty('--accent', custom.accent);
    } else {
      // Reset to default for non-custom themes
      const root = document.documentElement;
      root.style.removeProperty('--btn-radius');
      root.style.removeProperty('--btn-opacity');
      root.style.removeProperty('--text-size');
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--accent');
    }
  }, [selected, custom]);

  return (
    <section className="page">
      <div className="settings-page">
        <button onClick={() => navigate(-1)} className="back-btn add-btn">
          ← Go Back
        </button>
        <h2>General Settings</h2>

        {/* Navigation Bar */}
        <div className="general-settings-nav-bar">
          <button
            className={`general-nav-item ${activeSection === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveSection('themes')}
          >
            🎨 Themes
          </button>
          <button
            className={`general-nav-item ${activeSection === 'sounds' ? 'active' : ''}`}
            onClick={() => setActiveSection('sounds')}
          >
            🔊 Sounds
          </button>
          <button
            className={`general-nav-item ${activeSection === 'header-footer' ? 'active' : ''}`}
            onClick={() => setActiveSection('header-footer')}
          >
            📄 Header & Footer
          </button>
        </div>

        {/* Themes Section */}
        {activeSection === 'themes' && (
          <div style={{ marginBottom: "3rem" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>Theme</h3>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {themes.map(theme => (
                <button
                  key={theme.key}
                  style={{
                    padding: "1rem 2rem",
                    borderRadius: "10px",
                    border: selected === theme.key ? "2px solid #0b74ff" : "1px solid #ccc",
                    background: selected === theme.key ? "var(--btn-gradient)" : "var(--bg-card)",
                    color: selected === theme.key ? "var(--text-accent)" : "var(--text-main)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                  onClick={() => dispatch(setTheme(theme.key))}
                >
                  {theme.name}
                </button>
              ))}
              <button
                key="theme-custom"
                style={{
                  padding: "1rem 2rem",
                  borderRadius: "10px",
                  border: selected === 'theme-custom' ? "2px solid #0b74ff" : "1px solid #ccc",
                  background: selected === 'theme-custom' ? "var(--btn-gradient)" : "var(--bg-card)",
                  color: selected === 'theme-custom' ? "var(--text-accent)" : "var(--text-main)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1.1rem"
                }}
                onClick={() => dispatch(setTheme('theme-custom'))}
              >
                Custom
              </button>
            </div>
            {selected === 'theme-custom' && (
              <div style={{ marginTop: '2.5rem', maxWidth: 500 }}>
                <h4>Customize Theme</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <label>
                    Button Radius: <input type="range" min={0} max={32} value={custom.btnRadius} onChange={e => handleCustom('btnRadius', Number(e.target.value))} /> {custom.btnRadius}px
                  </label>
                  <label>
                    Button Opacity: <input type="range" min={0.2} max={1} step={0.01} value={custom.btnOpacity} onChange={e => handleCustom('btnOpacity', Number(e.target.value))} /> {custom.btnOpacity}
                  </label>
                  <label>
                    Text Size: <input type="range" min={12} max={32} value={custom.textSize} onChange={e => handleCustom('textSize', Number(e.target.value))} /> {custom.textSize}px
                  </label>
                  <label>
                    Background Color: <input type="color" value={custom.bgMain} onChange={e => handleCustom('bgMain', e.target.value)} /> {custom.bgMain}
                  </label>
                  <label>
                    Accent Color: <input type="color" value={custom.accent} onChange={e => handleCustom('accent', e.target.value)} /> {custom.accent}
                  </label>
                </div>
              </div>
            )}
            </div>
        )}

        {/* Sound Settings Section */}
        {activeSection === 'sounds' && (
          <div style={{
            padding: "2rem",
            background: "var(--bg-card)",
            borderRadius: "15px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Sound Settings</span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                padding: "0.5rem 1.5rem",
                borderRadius: "8px",
                border: isMuted ? "2px solid #ff6b6b" : "2px solid #51cf66",
                background: isMuted ? "rgba(255, 107, 107, 0.1)" : "rgba(81, 207, 102, 0.1)",
                color: isMuted ? "#ff6b6b" : "#51cf66",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "0.95rem",
                transition: "all 0.3s ease"
              }}
              title={isMuted ? "Click to unmute" : "Click to mute"}
              >
                {isMuted ? "🔇 Muted" : "🔊 Unmuted"}
              </button>
            </h3>

            {/* Volume Control */}
            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <span style={{ minWidth: "100px", fontWeight: "500" }}>Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{ flex: 1, cursor: "pointer" }}
                />
                <span style={{ minWidth: "50px", textAlign: "right", fontWeight: "bold" }}>{volume}%</span>
              </label>
            </div>

            {/* Test Buttons */}
            <div style={{ marginTop: "2rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>Test Sounds</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                <button
                  onClick={testSaveSound}
                  style={{
                    padding: "0.8rem 1.2rem",
                    borderRadius: "8px",
                    border: "1px solid #51cf66",
                    background: "rgba(81, 207, 102, 0.15)",
                    color: "var(--text-main)",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    transition: "all 0.2s",
                    opacity: isMuted ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => !isMuted && (e.target.style.background = "rgba(81, 207, 102, 0.3)")}
                  onMouseLeave={(e) => (e.target.style.background = "rgba(81, 207, 102, 0.15)")}
                  disabled={isMuted}
                >
                  ▶ Save Sound
                </button>
                <button
                  onClick={testLoadSound}
                  style={{
                    padding: "0.8rem 1.2rem",
                    borderRadius: "8px",
                    border: "1px solid #4dabf7",
                    background: "rgba(77, 171, 247, 0.15)",
                    color: "var(--text-main)",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    transition: "all 0.2s",
                    opacity: isMuted ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => !isMuted && (e.target.style.background = "rgba(77, 171, 247, 0.3)")}
                  onMouseLeave={(e) => (e.target.style.background = "rgba(77, 171, 247, 0.15)")}
                  disabled={isMuted}
                >
                  ▶ Load Sound
                </button>
                <button
                  onClick={testLoginSound}
                  style={{
                    padding: "0.8rem 1.2rem",
                    borderRadius: "8px",
                    border: "1px solid #ffd43b",
                    background: "rgba(255, 212, 59, 0.15)",
                    color: "var(--text-main)",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    transition: "all 0.2s",
                    opacity: isMuted ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => !isMuted && (e.target.style.background = "rgba(255, 212, 59, 0.3)")}
                  onMouseLeave={(e) => (e.target.style.background = "rgba(255, 212, 59, 0.15)")}
                  disabled={isMuted}
                >
                  ▶ Login Sound
                </button>
                <button
                  onClick={testDeleteSound}
                  style={{
                    padding: "0.8rem 1.2rem",
                    borderRadius: "8px",
                    border: "1px solid #ff6b6b",
                    background: "rgba(255, 107, 107, 0.15)",
                    color: "var(--text-main)",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    transition: "all 0.2s",
                    opacity: isMuted ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => !isMuted && (e.target.style.background = "rgba(255, 107, 107, 0.3)")}
                  onMouseLeave={(e) => (e.target.style.background = "rgba(255, 107, 107, 0.15)")}
                  disabled={isMuted}
                >
                  ▶ Delete Sound
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header & Footer Section */}
        {activeSection === 'header-footer' && (
          <div className="general-settings-header-footer-section">
            <HeaderFooterCreator />
          </div>
        )}
      </div>
    </section>
  );
};

export default GeneralSettings;
