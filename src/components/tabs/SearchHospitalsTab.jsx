import React, { useState } from 'react';

const SearchHospitalsTab = ({ searchFilters, setSearchFilters, hospitals, setSelectedHospitals, setActiveTab, onHospitalSelect, loading = false }) => {
  const [selected, setSelected] = useState([]);

  const handleHospitalSelect = (hospital) => {
    const hospitalId = hospital._id || hospital.id;
    const isAlreadySelected = selected.some(h => (h._id || h.id) === hospitalId);
    let updatedSelected;

    if (isAlreadySelected) {
      updatedSelected = selected.filter(h => (h._id || h.id) !== hospitalId);
    } else {
      updatedSelected = [...selected, hospital];
    }

    setSelected(updatedSelected);
    setSelectedHospitals(updatedSelected);

    // If in referral workflow and hospital selected, log it
    if (onHospitalSelect && updatedSelected.length > 0) {
      console.log('Selected Hospitals:', updatedSelected);
    }
  };

  const handleProceed = () => {
    if (selected.length > 0) {
      if (onHospitalSelect) {
        // Multi-step referral workflow
        onHospitalSelect(selected);
      } else {
        // Normal dashboard workflow
        setActiveTab('query');
      }
    } else {
      alert('Please select at least one hospital');
    }
  };

  if (loading) {
    return (
      <div className="tab-content">
        <div className="form-component">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading hospitals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="form-component">
        <form>
          <h2>Search Hospitals</h2>
          <div className="grid-container">
            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                placeholder="Enter city or area"
                value={searchFilters.location}
                onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Specialty</label>
              <select 
                value={searchFilters.specialty}
                onChange={(e) => setSearchFilters({...searchFilters, specialty: e.target.value})}
              >
                <option value="">All Specialties</option>
                <option value="cardiology">Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="orthopedics">Orthopedics</option>
                <option value="oncology">Oncology</option>
              </select>
            </div>
            <div className="form-group">
              <label>Insurance Network</label>
              <input 
                type="text" 
                placeholder="Insurance provider"
                value={searchFilters.insurance}
                onChange={(e) => setSearchFilters({...searchFilters, insurance: e.target.value})}
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox"
                  checked={searchFilters.nabh}
                  onChange={(e) => setSearchFilters({...searchFilters, nabh: e.target.checked})}
                />
                NABH Accredited Only
              </label>
            </div>
          </div>
        </form>
        
        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {hospitals.length === 0 ? 'No hospitals available' : `Found: ${hospitals.length} hospital${hospitals.length !== 1 ? 's' : ''} | Selected: ${selected.length}`}
          </p>
        </div>

        <div className="doctors banner">
          {hospitals.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
              No hospitals available
            </div>
          ) : (
            hospitals.map(hospital => {
              const isSelected = selected.some(h => (h._id || h.id) === (hospital._id || hospital.id));
              return (
                <div 
                  key={hospital._id || hospital.id} 
                  className="card"
                  style={{
                    border: isSelected ? '3px solid #4CAF50' : '1px solid #ddd',
                    backgroundColor: isSelected ? '#f0f8f0' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}
                  onClick={() => handleHospitalSelect(hospital)}
                >
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleHospitalSelect(hospital)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>

                  <div className="doc-card-header">
                    <div>
                      <h4>{hospital.name}</h4>
                      <p>{hospital.address} {hospital.city ? `• ${hospital.city}` : ''}</p>
                      {hospital.features?.specialty?.length > 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#999' }}>{hospital.features.specialty.join(', ')}</p>
                      )}
                    </div>
                    <div className="rating-badge">{hospital.rating || 0} ★</div>
                  </div>
                  <div className="doc-card-details">
                    <div className="detail-item">
                      <span>Available Beds:</span>
                      <span>{hospital.features?.bedCount || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span>ICU Beds:</span>
                      <span>{hospital.features?.icuBedCount || 0}</span>
                    </div>
                    {hospital.features?.nabh && <span className="badge nabh-badge">NABH</span>}
                    {hospital.active && <span className="badge" style={{ backgroundColor: '#10b981', color: '#fff' }}>Active</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selected.length > 0 && (
          <div className="button-group" style={{ marginTop: '20px' }}>
            <button 
              className="btn"
              onClick={handleProceed}
            >
              Proceed to Query Resources ({selected.length} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchHospitalsTab;
