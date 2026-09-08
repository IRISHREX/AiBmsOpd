import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './MedicineForm.css';

const MedicineForm = ({ initialData = {}, onSave, onCancel, submitLabel = 'Save' }) => {
  const [form, setForm] = useState({
    name: '',
    composition: '',
    type: '',
    dose: '',
    frequency: '',
    route: '',
    duration: '',
    notes: '',
  });

  useEffect(() => {
    if (!initialData) return;
    setForm({
      name: initialData.name || '',
      composition: Array.isArray(initialData.composition) 
        ? initialData.composition.join(', ') 
        : (initialData.composition || ''),
      type: initialData.type || '',
      dose: initialData.dose || '',
      frequency: initialData.frequency || '',
      route: initialData.route || '',
      duration: initialData.duration || '',
      notes: initialData.notes || '',
    });
  }, [initialData]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e && e.preventDefault();
    
    const compositionArray = String(form.composition || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    const payload = {
      name: (form.name || '').trim(),
      composition: compositionArray,
      type: (form.type || '').trim(),
      dose: (form.dose || '').trim(),
      frequency: (form.frequency || '').trim(),
      route: (form.route || '').trim(),
      duration: (form.duration || '').trim(),
      notes: (form.notes || '').trim(),
    };
    
    if (!payload.name) {
      alert('Name is required');
      return;
    }
    
    if (onSave) onSave(payload);
  };

  return (
    <div className="medicine-form-container">
      <div className="form-group full-width">
        <label className="form-label">
          Medicine Name <span className="required">*</span>
        </label>
        <input
          className="form-input"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter medicine name"
          required
        />
      </div>

      <div className="form-group full-width">
        <label className="form-label">
          Composition
          <span className="helper-text">(comma separated)</span>
        </label>
        <input
          className="form-input"
          name="composition"
          value={form.composition}
          onChange={handleChange}
          placeholder="e.g., paracetamol, caffeine"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type</label>
          <input
            className="form-input"
            name="type"
            value={form.type}
            onChange={handleChange}
            placeholder="e.g., Tablet"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Dose</label>
          <input
            className="form-input"
            name="dose"
            value={form.dose}
            onChange={handleChange}
            placeholder="e.g., 500mg"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <input
            className="form-input"
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
            placeholder="e.g., Twice daily"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Route</label>
          <input
            className="form-input"
            name="route"
            value={form.route}
            onChange={handleChange}
            placeholder="e.g., Oral"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Duration</label>
          <input
            className="form-input"
            name="duration"
            value={form.duration}
            onChange={handleChange}
            placeholder="e.g., 7 days"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <input
            className="form-input"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Additional notes"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-submit" onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
};

MedicineForm.propTypes = {
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  submitLabel: PropTypes.string,
};

export default MedicineForm;