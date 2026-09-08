import React from 'react';
import './ToggleSwitch.css';

const ToggleSwitch = ({ label, checked, onChange }) => {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider round"></span>
      <span className="label-text">{label}</span>
    </label>
  );
};

export default ToggleSwitch;
