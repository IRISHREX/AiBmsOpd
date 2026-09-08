import React, { useEffect } from 'react';

const CreateReferralTab = ({ referralForm, setReferralForm, setActiveTab, onSubmit }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Referral Form Data:', referralForm);
    if (onSubmit) {
      onSubmit(referralForm);
    } else {
      alert('Referral submitted successfully!');
      if (setActiveTab) setActiveTab('tracking');
    }
  };

  return (
    <div className="tab-content">
      <div className="form-component">
        <form className='create_referral_form' onSubmit={handleSubmit}>
          <h2>Create Referral Request</h2>
          
          <div className="form-section">
            <h4>Patient Information</h4>
            <div className="grid-container">
              <div className="form-group">
                <label>Patient Name *</label>
                <input 
                  type="text"
                  value={referralForm.patientName}
                  onChange={(e) => setReferralForm({...referralForm, patientName: e.target.value})}
                  placeholder="Full name"
                />
              </div>
              <div className="form-group">
                <label>Age *</label>
                <input 
                  type="number"
                  value={referralForm.age}
                  onChange={(e) => setReferralForm({...referralForm, age: e.target.value})}
                  placeholder="Years"
                />
              </div>
              <div className="form-group">
                <label>Gender *</label>
                <select 
                  value={referralForm.gender}
                  onChange={(e) => setReferralForm({...referralForm, gender: e.target.value.toLowerCase()})}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>ABHA ID (Optional)</label>
                <input 
                  type="text"
                  value={referralForm.abhaId}
                  onChange={(e) => setReferralForm({...referralForm, abhaId: e.target.value})}
                  placeholder="14-digit ABHA number"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Clinical Information</h4>
            <div className="form-group">
              <label>Diagnosis *</label>
              <input 
                type="text"
                value={referralForm.diagnosis}
                onChange={(e) => setReferralForm({...referralForm, diagnosis: e.target.value})}
                placeholder="Primary diagnosis"
              />
            </div>
            <div className="form-group">
              <label>Clinical Notes *</label>
              <textarea 
                value={referralForm.clinicalNotes}
                onChange={(e) => setReferralForm({...referralForm, clinicalNotes: e.target.value})}
                placeholder="Patient history, symptoms, examination findings..."
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Required Care</label>
              <textarea 
                value={referralForm.requiredCare}
                onChange={(e) => setReferralForm({...referralForm, requiredCare: e.target.value})}
                placeholder="Specific care requirements, procedures needed..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Urgency Level *</h4>
            <div className="radio-group">
              {['routine', 'urgent', 'emergency'].map(level => (
                <label key={level} className="radio-label">
                  <input 
                    type="radio"
                    name="urgency"
                    value={level}
                    checked={referralForm.urgency === level}
                    onChange={(e) => setReferralForm({...referralForm, urgency: e.target.value})}
                  />
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h4>Attachments</h4>
            <div className="file-upload">
              <button type="button" className="btn">Upload Reports</button>
              <span className="file-info">PDF, JPG, PNG (Max 10MB)</span>
            </div>
          </div>

          <div className="button-group">
            {setActiveTab && (
              <button type="button" className="btn" onClick={() => setActiveTab('query')}>
                Back
              </button>
            )}
            <button 
              type="submit"
              className="btn"
            >
              Submit Referral
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReferralTab;
