import React, { useState, useRef, useEffect } from 'react';
import './HeaderFooterCreator.css';

const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Trebuchet MS'];

const HeaderFooterCreator = () => {
  const headerCanvasRef = useRef(null);
  const footerCanvasRef = useRef(null);

  const [headerData, setHeaderData] = useState({
    nameEn: 'Dr. Golam Jakaria',
    specialtyEn: 'General Physician & Child\'s Doctor',
    qual1En: 'M.B.B.S (Kolkata Medical College)',
    qual2En: 'House Physician (Pediatric Medicine)',
    qual3En: 'House Physician (Chest Medicine)',
    qual4En: 'Medical Officer, Bedrabad R.H.',
    helplineEn: 'Helpline: 8906805818',
    requestEn: 'ON REQUEST',
    nameBn: 'ডাঃ গোলাম জাকারিয়া',
    specialtyBn: 'জেনারেল ফিজিশিয়ান ও শিশু চিকিৎসক',
    qual1Bn: 'এম.বি.বি.এস (কলকাতা মেডিক্যাল কলেজ)',
    qual2Bn: 'হাউস ফিজিশিয়ান (পেডিয়াট্রিক মেডিসিন)',
    qual3Bn: 'হাউস ফিজিশিয়ান (চেস্ট মেডিসিন)',
    qual4Bn: 'মেডিক্যাল অফিসার, বেদ্রাবাদ রুরাল হাসপাতাল',
    helplineBn: 'হেল্পলাইন: ৮৯০৬৮০৫৮১৮',
    requestBn: 'অনুরোধে',
    nameColor: '#1e40af',
    specialtyColor: '#059669',
    textColor: '#374151',
    helplineColor: '#dc2626',
    backgroundColor: '#ffffff',
    font: 'Arial',
    textPositionX: 0,
    textPositionY: 0,
    buttonPosition: 'center',
  });

  const [footerData, setFooterData] = useState({
    footerMainEn: 'For Appointment or Emergency',
    footerInstEn: 'Contact immediately or rush to hospital',
    footerHoursEn: 'Contact Hours: 6:00 AM to 10:00 PM',
    footerPhoneEn: '📞 8906805818 / 8327402232',
    footerMainBn: 'অ্যাপয়েন্টমেন্ট অথবা জরুরী অবস্থায়',
    footerInstBn: 'তাৎক্ষণিক ফোন করুন অথবা হাসপাতালে যোগাযোগ করুন',
    footerHoursBn: 'যোগাযোগের সময়- সকাল ৬টা থেকে রাত্রি ১০টা পর্যন্ত',
    footerPhoneBn: '📞 ৮৯০৬৮০৫৮১৮ / ৮৩২৭৪০২২৩২',
    backgroundColor: '#ffffff',
    font: 'Arial',
    textPositionX: 0,
    textPositionY: 0,
    buttonPosition: 'center',
  });

  const [activeTab, setActiveTab] = useState('header');

  // Draw Header on Canvas
  useEffect(() => {
    drawHeader();
  }, [headerData]);

  // Draw Footer on Canvas
  useEffect(() => {
    drawFooter();
  }, [footerData]);

  const drawHeader = () => {
    const canvas = headerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 400;

    // Background
    ctx.fillStyle = headerData.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top accent bar
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#2563eb');
    gradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 8);

    // Center divider line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 30);
    ctx.lineTo(canvas.width / 2, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    const baseX = 300 + headerData.textPositionX;
    const baseY = 70 + headerData.textPositionY;

    // LEFT SIDE - ENGLISH
    let textAlign = 'center';
    let xPos = baseX;
    if (headerData.buttonPosition === 'left') {
      textAlign = 'left';
      xPos = 100 + headerData.textPositionX;
    } else if (headerData.buttonPosition === 'right') {
      textAlign = 'right';
      xPos = 500 + headerData.textPositionX;
    }

    ctx.textAlign = textAlign;

    ctx.fillStyle = headerData.nameColor;
    ctx.font = `bold 36px ${headerData.font}`;
    ctx.fillText(headerData.nameEn, xPos, baseY);

    ctx.fillStyle = headerData.specialtyColor;
    ctx.font = `bold 22px ${headerData.font}`;
    ctx.fillText(headerData.specialtyEn, xPos, baseY + 40);

    ctx.fillStyle = headerData.textColor;
    ctx.font = `18px ${headerData.font}`;
    ctx.fillText(headerData.qual1En, xPos, baseY + 80);
    ctx.fillText(headerData.qual2En, xPos, baseY + 110);
    ctx.fillText(headerData.qual3En, xPos, baseY + 140);
    ctx.fillText(headerData.qual4En, xPos, baseY + 170);

    ctx.fillStyle = headerData.helplineColor;
    ctx.font = `bold 20px ${headerData.font}`;
    ctx.fillText(headerData.helplineEn, xPos, baseY + 210);

    ctx.fillStyle = headerData.specialtyColor;
    ctx.font = `italic bold 24px ${headerData.font}`;
    ctx.fillText(headerData.requestEn, xPos, baseY + 260);

    // RIGHT SIDE - BENGALI
    const baseXBn = 900 + headerData.textPositionX;
    let xPosBn = baseXBn;
    if (headerData.buttonPosition === 'left') {
      xPosBn = 700 + headerData.textPositionX;
    } else if (headerData.buttonPosition === 'right') {
      xPosBn = 1100 + headerData.textPositionX;
    }

    ctx.textAlign = textAlign;

    ctx.fillStyle = headerData.nameColor;
    ctx.font = `bold 36px ${headerData.font}`;
    ctx.fillText(headerData.nameBn, xPosBn, baseY);

    ctx.fillStyle = headerData.specialtyColor;
    ctx.font = `bold 22px ${headerData.font}`;
    ctx.fillText(headerData.specialtyBn, xPosBn, baseY + 40);

    ctx.fillStyle = headerData.textColor;
    ctx.font = `18px ${headerData.font}`;
    ctx.fillText(headerData.qual1Bn, xPosBn, baseY + 80);
    ctx.fillText(headerData.qual2Bn, xPosBn, baseY + 110);
    ctx.fillText(headerData.qual3Bn, xPosBn, baseY + 140);
    ctx.fillText(headerData.qual4Bn, xPosBn, baseY + 170);

    ctx.fillStyle = headerData.helplineColor;
    ctx.font = `bold 20px ${headerData.font}`;
    ctx.fillText(headerData.helplineBn, xPosBn, baseY + 210);

    ctx.fillStyle = headerData.specialtyColor;
    ctx.font = `italic bold 24px ${headerData.font}`;
    ctx.fillText(headerData.requestBn, xPosBn, baseY + 260);

    // Bottom border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 10);
    ctx.lineTo(canvas.width - 50, canvas.height - 10);
    ctx.stroke();
  };

  const drawFooter = () => {
    const canvas = footerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 200;

    // Background
    ctx.fillStyle = footerData.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 10);
    ctx.lineTo(canvas.width - 50, 10);
    ctx.stroke();

    // Center divider line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 30);
    ctx.lineTo(canvas.width / 2, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    const baseX = 300 + footerData.textPositionX;
    const baseY = 60 + footerData.textPositionY;

    // LEFT SIDE - ENGLISH
    let textAlign = 'center';
    let xPos = baseX;
    if (footerData.buttonPosition === 'left') {
      textAlign = 'left';
      xPos = 100 + footerData.textPositionX;
    } else if (footerData.buttonPosition === 'right') {
      textAlign = 'right';
      xPos = 500 + footerData.textPositionX;
    }

    ctx.textAlign = textAlign;
    ctx.fillStyle = headerData.nameColor;
    ctx.font = `bold 20px ${footerData.font}`;
    ctx.fillText(footerData.footerMainEn, xPos, baseY);

    ctx.fillStyle = headerData.textColor;
    ctx.font = `18px ${footerData.font}`;
    ctx.fillText(footerData.footerInstEn, xPos, baseY + 30);

    ctx.font = `16px ${footerData.font}`;
    ctx.fillText(footerData.footerHoursEn, xPos, baseY + 55);

    ctx.fillStyle = headerData.helplineColor;
    ctx.font = `bold 22px ${footerData.font}`;
    ctx.fillText(footerData.footerPhoneEn, xPos, baseY + 90);

    // RIGHT SIDE - BENGALI
    const baseXBn = 900 + footerData.textPositionX;
    let xPosBn = baseXBn;
    if (footerData.buttonPosition === 'left') {
      xPosBn = 700 + footerData.textPositionX;
    } else if (footerData.buttonPosition === 'right') {
      xPosBn = 1100 + footerData.textPositionX;
    }

    ctx.textAlign = textAlign;
    ctx.fillStyle = headerData.nameColor;
    ctx.font = `bold 20px ${footerData.font}`;
    ctx.fillText(footerData.footerMainBn, xPosBn, baseY);

    ctx.fillStyle = headerData.textColor;
    ctx.font = `18px ${footerData.font}`;
    ctx.fillText(footerData.footerInstBn, xPosBn, baseY + 30);

    ctx.font = `16px ${footerData.font}`;
    ctx.fillText(footerData.footerHoursBn, xPosBn, baseY + 55);

    ctx.fillStyle = headerData.helplineColor;
    ctx.font = `bold 22px ${footerData.font}`;
    ctx.fillText(footerData.footerPhoneBn, xPosBn, baseY + 90);

    // Bottom accent bar
    const gradient = ctx.createLinearGradient(0, canvas.height - 8, canvas.width, canvas.height - 8);
    gradient.addColorStop(0, '#2563eb');
    gradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 8, canvas.width, 8);
  };

  const downloadHeader = () => {
    const canvas = headerCanvasRef.current;
    canvas.toBlob(function(blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'Header.jpg';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  };

  const downloadFooter = () => {
    const canvas = footerCanvasRef.current;
    canvas.toBlob(function(blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'Footer.jpg';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  };

  const handleHeaderChange = (field, value) => {
    setHeaderData({ ...headerData, [field]: value });
  };

  const handleFooterChange = (field, value) => {
    setFooterData({ ...footerData, [field]: value });
  };

  return (
    <section className="page">
      <div className="header-footer-creator">
        <div className="creator-header">
          <h2>Header & Footer Creator</h2>
          <p>Customize your prescription header and footer</p>
        </div>

        {/* Tabs */}
        <div className="creator-tabs">
          <button
            className={`tab-btn ${activeTab === 'header' ? 'active' : ''}`}
            onClick={() => setActiveTab('header')}
          >
            📋 Header Creator
          </button>
          <button
            className={`tab-btn ${activeTab === 'footer' ? 'active' : ''}`}
            onClick={() => setActiveTab('footer')}
          >
            📄 Footer Creator
          </button>
        </div>

        {/* Header Tab */}
        {activeTab === 'header' && (
          <div className="creator-content">
            <div className="controls-section">
              <h3>English Side</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Doctor Name (English)</label>
                  <input
                    type="text"
                    value={headerData.nameEn}
                    onChange={(e) => handleHeaderChange('nameEn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Specialty (English)</label>
                  <input
                    type="text"
                    value={headerData.specialtyEn}
                    onChange={(e) => handleHeaderChange('specialtyEn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 1</label>
                  <input
                    type="text"
                    value={headerData.qual1En}
                    onChange={(e) => handleHeaderChange('qual1En', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 2</label>
                  <input
                    type="text"
                    value={headerData.qual2En}
                    onChange={(e) => handleHeaderChange('qual2En', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 3</label>
                  <input
                    type="text"
                    value={headerData.qual3En}
                    onChange={(e) => handleHeaderChange('qual3En', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 4</label>
                  <input
                    type="text"
                    value={headerData.qual4En}
                    onChange={(e) => handleHeaderChange('qual4En', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Helpline Text</label>
                  <input
                    type="text"
                    value={headerData.helplineEn}
                    onChange={(e) => handleHeaderChange('helplineEn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>On Request Text</label>
                  <input
                    type="text"
                    value={headerData.requestEn}
                    onChange={(e) => handleHeaderChange('requestEn', e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ marginTop: '30px' }}>Bengali Side</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Doctor Name (Bengali)</label>
                  <input
                    type="text"
                    value={headerData.nameBn}
                    onChange={(e) => handleHeaderChange('nameBn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Specialty (Bengali)</label>
                  <input
                    type="text"
                    value={headerData.specialtyBn}
                    onChange={(e) => handleHeaderChange('specialtyBn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 1</label>
                  <input
                    type="text"
                    value={headerData.qual1Bn}
                    onChange={(e) => handleHeaderChange('qual1Bn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 2</label>
                  <input
                    type="text"
                    value={headerData.qual2Bn}
                    onChange={(e) => handleHeaderChange('qual2Bn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 3</label>
                  <input
                    type="text"
                    value={headerData.qual3Bn}
                    onChange={(e) => handleHeaderChange('qual3Bn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification 4</label>
                  <input
                    type="text"
                    value={headerData.qual4Bn}
                    onChange={(e) => handleHeaderChange('qual4Bn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Helpline Text</label>
                  <input
                    type="text"
                    value={headerData.helplineBn}
                    onChange={(e) => handleHeaderChange('helplineBn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>On Request Text</label>
                  <input
                    type="text"
                    value={headerData.requestBn}
                    onChange={(e) => handleHeaderChange('requestBn', e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ marginTop: '30px' }}>Colors & Font</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={headerData.backgroundColor}
                    onChange={(e) => handleHeaderChange('backgroundColor', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Font Style</label>
                  <select
                    value={headerData.font}
                    onChange={(e) => handleHeaderChange('font', e.target.value)}
                  >
                    {FONTS.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Name Color</label>
                  <input
                    type="color"
                    value={headerData.nameColor}
                    onChange={(e) => handleHeaderChange('nameColor', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Specialty Color</label>
                  <input
                    type="color"
                    value={headerData.specialtyColor}
                    onChange={(e) => handleHeaderChange('specialtyColor', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={headerData.textColor}
                    onChange={(e) => handleHeaderChange('textColor', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Helpline Color</label>
                  <input
                    type="color"
                    value={headerData.helplineColor}
                    onChange={(e) => handleHeaderChange('helplineColor', e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ marginTop: '30px' }}>Position & Layout</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Text Position X</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={headerData.textPositionX}
                    onChange={(e) => handleHeaderChange('textPositionX', parseInt(e.target.value))}
                  />
                  <span className="value-display">{headerData.textPositionX}</span>
                </div>
                <div className="form-group">
                  <label>Text Position Y</label>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    value={headerData.textPositionY}
                    onChange={(e) => handleHeaderChange('textPositionY', parseInt(e.target.value))}
                  />
                  <span className="value-display">{headerData.textPositionY}</span>
                </div>
                <div className="form-group full-width">
                  <label>Button Position</label>
                  <div className="button-position-group">
                    <button
                      className={`position-btn ${headerData.buttonPosition === 'left' ? 'active' : ''}`}
                      onClick={() => handleHeaderChange('buttonPosition', 'left')}
                    >
                      ⬅️ Left
                    </button>
                    <button
                      className={`position-btn ${headerData.buttonPosition === 'center' ? 'active' : ''}`}
                      onClick={() => handleHeaderChange('buttonPosition', 'center')}
                    >
                      ⬆️ Center
                    </button>
                    <button
                      className={`position-btn ${headerData.buttonPosition === 'right' ? 'active' : ''}`}
                      onClick={() => handleHeaderChange('buttonPosition', 'right')}
                    >
                      ➡️ Right
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-section">
              <h3>Header Preview</h3>
              <canvas ref={headerCanvasRef}></canvas>
              <button className="btn btn-download" onClick={downloadHeader}>
                ⬇️ Download Header JPG
              </button>
            </div>
          </div>
        )}

        {/* Footer Tab */}
        {activeTab === 'footer' && (
          <div className="creator-content">
            <div className="controls-section">
              <h3>English Side</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Main Text</label>
                  <input
                    type="text"
                    value={footerData.footerMainEn}
                    onChange={(e) => handleFooterChange('footerMainEn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Instruction Text</label>
                  <input
                    type="text"
                    value={footerData.footerInstEn}
                    onChange={(e) => handleFooterChange('footerInstEn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Hours</label>
                  <input
                    type="text"
                    value={footerData.footerHoursEn}
                    onChange={(e) => handleFooterChange('footerHoursEn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Numbers</label>
                  <input
                    type="text"
                    value={footerData.footerPhoneEn}
                    onChange={(e) => handleFooterChange('footerPhoneEn', e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ marginTop: '30px' }}>Bengali Side</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Main Text</label>
                  <input
                    type="text"
                    value={footerData.footerMainBn}
                    onChange={(e) => handleFooterChange('footerMainBn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Instruction Text</label>
                  <input
                    type="text"
                    value={footerData.footerInstBn}
                    onChange={(e) => handleFooterChange('footerInstBn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Hours</label>
                  <input
                    type="text"
                    value={footerData.footerHoursBn}
                    onChange={(e) => handleFooterChange('footerHoursBn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Numbers</label>
                  <input
                    type="text"
                    value={footerData.footerPhoneBn}
                    onChange={(e) => handleFooterChange('footerPhoneBn', e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ marginTop: '30px' }}>Colors & Font</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={footerData.backgroundColor}
                    onChange={(e) => handleFooterChange('backgroundColor', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Font Style</label>
                  <select
                    value={footerData.font}
                    onChange={(e) => handleFooterChange('font', e.target.value)}
                  >
                    {FONTS.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 style={{ marginTop: '30px' }}>Position & Layout</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Text Position X</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={footerData.textPositionX}
                    onChange={(e) => handleFooterChange('textPositionX', parseInt(e.target.value))}
                  />
                  <span className="value-display">{footerData.textPositionX}</span>
                </div>
                <div className="form-group">
                  <label>Text Position Y</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={footerData.textPositionY}
                    onChange={(e) => handleFooterChange('textPositionY', parseInt(e.target.value))}
                  />
                  <span className="value-display">{footerData.textPositionY}</span>
                </div>
                <div className="form-group full-width">
                  <label>Button Position</label>
                  <div className="button-position-group">
                    <button
                      className={`position-btn ${footerData.buttonPosition === 'left' ? 'active' : ''}`}
                      onClick={() => handleFooterChange('buttonPosition', 'left')}
                    >
                      ⬅️ Left
                    </button>
                    <button
                      className={`position-btn ${footerData.buttonPosition === 'center' ? 'active' : ''}`}
                      onClick={() => handleFooterChange('buttonPosition', 'center')}
                    >
                      ⬆️ Center
                    </button>
                    <button
                      className={`position-btn ${footerData.buttonPosition === 'right' ? 'active' : ''}`}
                      onClick={() => handleFooterChange('buttonPosition', 'right')}
                    >
                      ➡️ Right
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-section">
              <h3>Footer Preview</h3>
              <canvas ref={footerCanvasRef}></canvas>
              <button className="btn btn-download" onClick={downloadFooter}>
                ⬇️ Download Footer JPG
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeaderFooterCreator;
