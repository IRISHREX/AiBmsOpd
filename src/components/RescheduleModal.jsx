import React, { useState } from 'react';
import Modal from 'react-modal';
import './RescheduleModal.css';

const RescheduleModal = ({ isOpen, onClose, appointment, onSave, isLoading }) => {
  const [selectedDate, setSelectedDate] = useState(
    appointment?.appointment_date ? appointment.appointment_date.split('T')[0] : ''
  );

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const handleSave = () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    if (selectedDate <= today) {
      alert('Appointment date must be in the future');
      return;
    }

    // Keep the date as YYYY-MM-DD string - don't convert to ISO with timezone
    // The backend expects YYYY-MM-DD format
    onSave(appointment._id, selectedDate);
    setSelectedDate(appointment?.appointment_date ? appointment.appointment_date.split('T')[0] : '');
  };

  const handleClose = () => {
    setSelectedDate(appointment?.appointment_date ? appointment.appointment_date.split('T')[0] : '');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      contentLabel="Reschedule Appointment"
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        },
        content: {
          maxWidth: '500px',
          margin: 'auto',
          borderRadius: '12px',
          padding: '2rem',
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
        },
      }}
    >
      <div className="reschedule-modal-content">
        <h2>Reschedule Appointment</h2>
        
        <div className="appointment-info">
          <p>
            <strong>Patient:</strong> {appointment?.name}
          </p>
          <p>
            <strong>Doctor:</strong> {appointment?.doctor?.firstName} {appointment?.doctor?.lastName}
          </p>
          <p>
            <strong>Current Date:</strong>{' '}
            {appointment?.appointment_date
              ? new Date(appointment.appointment_date).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>

        <div className="date-picker-section">
          <label htmlFor="new-date">
            <strong>Select New Date (Future dates only):</strong>
          </label>
          <input
            id="new-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            className="date-input"
          />
        </div>

        <div className="modal-actions">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          <button
            className="cancel-btn"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RescheduleModal;
