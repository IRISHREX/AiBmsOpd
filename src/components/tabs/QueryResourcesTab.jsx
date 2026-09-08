import React, { useState } from 'react';

const QueryResourcesTab = ({ selectedHospitals = [], queryParams, setQueryParams, setActiveTab, onSubmit }) => {
  const [hospitalQueries, setHospitalQueries] = useState(
    selectedHospitals.reduce((acc, hospital) => {
      const hospitalId = hospital._id || hospital.id;
      acc[hospitalId] = {
        bedType: 'general',
        icuType: '',
        otRequired: false,
        services: [],
      };
      return acc;
    }, {})
  );

  const handleHospitalQueryChange = (hospitalId, field, value) => {
    setHospitalQueries(prev => ({
      ...prev,
      [hospitalId]: {
        ...prev[hospitalId],
        [field]: value,
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      // Multi-step referral workflow - send all hospital queries
      onSubmit({
        bedType: queryParams.bedType,
        icuType: queryParams.icuType,
        otRequired: queryParams.otRequired,
        services: queryParams.services,
        hospitalQueries, // Include individual hospital queries
      });
    } else {
      setActiveTab('tracking');
    }
  };

  const handleBack = () => {
    setActiveTab('search');
  };

  return (
    <div className="tab-content">
      <div className="form-component">
        <form onSubmit={handleSubmit}>
          <h2>Query Hospital Resources</h2>
          
          {!selectedHospitals || selectedHospitals.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              <p>No hospitals selected</p>
            </div>
          ) : (
            <>
              <div className="selected-hospital" style={{ marginBottom: '20px' }}>
                <h4>Selected Hospitals ({selectedHospitals.length}):</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedHospitals.map(hospital => (
                    <div 
                      key={hospital._id || hospital.id}
                      style={{
                        backgroundColor: '#e8f5e9',
                        border: '1px solid #4CAF50',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: '#2e7d32'
                      }}
                    >
                      <strong>{hospital.name}</strong> - {hospital.city || hospital.address}
                    </div>
                  ))}
                </div>
              </div>

              <h4 style={{ marginTop: '30px', marginBottom: '20px' }}>Specify Requirements for Each Hospital</h4>

              {selectedHospitals.map(hospital => {
                const hospitalId = hospital._id || hospital.id;
                const query = hospitalQueries[hospitalId] || {
                  bedType: 'general',
                  icuType: '',
                  otRequired: false,
                  services: [],
                };

                return (
                  <div 
                    key={hospitalId} 
                    style={{
                      backgroundColor: '#f9f9f9',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}
                  >
                    <h5 style={{ marginTop: 0, color: '#333' }}>{hospital.name}</h5>

                    <div className="form-section">
                      <h5>Bed Type</h5>
                      <div className="radio-group">
                        {['general', 'semi-private', 'private', 'icu'].map(type => (
                          <label key={type} className="radio-label">
                            <input 
                              type="radio" 
                              name={`bedType-${hospitalId}`}
                              value={type}
                              checked={query.bedType === type}
                              onChange={(e) => handleHospitalQueryChange(hospitalId, 'bedType', e.target.value)}
                            />
                            {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </label>
                        ))}
                      </div>
                    </div>

                    {query.bedType === 'icu' && (
                      <div className="form-section">
                        <h5>ICU Type</h5>
                        <select 
                          value={query.icuType}
                          onChange={(e) => handleHospitalQueryChange(hospitalId, 'icuType', e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                        >
                          <option value="">Select ICU Type</option>
                          <option value="micu">MICU (Medical)</option>
                          <option value="sicu">SICU (Surgical)</option>
                          <option value="picu">PICU (Pediatric)</option>
                          <option value="nicu">NICU (Neonatal)</option>
                        </select>
                      </div>
                    )}

                    <div className="form-section">
                      <h5>Services Needed</h5>
                      <div className="checkbox-list">
                        {['Ventilator', 'Dialysis', 'OT Slot', 'MRI/CT', 'Cath Lab', 'Laboratory'].map(service => (
                          <label key={service} className="checkbox-label">
                            <input 
                              type="checkbox"
                              checked={query.services.includes(service)}
                              onChange={(e) => {
                                const services = e.target.checked 
                                  ? [...query.services, service]
                                  : query.services.filter(s => s !== service);
                                handleHospitalQueryChange(hospitalId, 'services', services);
                              }}
                            />
                            {service}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-section">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          checked={query.otRequired}
                          onChange={(e) => handleHospitalQueryChange(hospitalId, 'otRequired', e.target.checked)}
                        />
                        OT Required
                      </label>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="button-group">
            <button type="button" className="btn" onClick={handleBack}>
              Back to Search
            </button>
            <button type="submit" className="btn" disabled={!selectedHospitals || selectedHospitals.length === 0}>
              {onSubmit ? 'Submit Query' : 'Create Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QueryResourcesTab;
