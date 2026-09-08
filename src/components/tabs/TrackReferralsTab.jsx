import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useSnackbar } from '../../context/SnackbarContext';
import useSound from 'use-sound';
import { FaTrash, FaPen, FaEye, FaSync } from 'react-icons/fa';
import Toolbar from '../Toolbar';
import { BsEye, BsSave, BsTrash2 } from 'react-icons/bs';
import { FiEdit } from 'react-icons/fi';
import { GiCancel, GiCancer } from 'react-icons/gi';
import { MdCancel } from 'react-icons/md';

const TrackReferralsTab = ({ referrals: initialReferrals, onSubmit, loading: initialLoading = false }) => {
  const snackbar = useSnackbar();
  const [playDeleteSound] = useSound("/delete.mp3");
  const [playSaveSound] = useSound("/save.mp3");
  const [allReferrals, setAllReferrals] = useState(initialReferrals || []);
  const [loading, setLoading] = useState(initialLoading);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleting, setDeleting] = useState(null);

  // Fetch all referrals on component mount
  useEffect(() => {
    fetchAllReferrals();
  }, []);

  const fetchAllReferrals = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/v1/referral/all?limit=1000');
      setAllReferrals(data.referrals || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      snackbar.error('Error fetching referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateFilter === 'today') {
      return { start: today, end: tomorrow };
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    } else if (dateFilter === 'custom' && startDate && endDate) {
      return { 
        start: new Date(startDate), 
        end: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) 
      };
    }
    return null;
  };

  // Filter referrals based on search, filters, and dates
  const filteredReferrals = allReferrals.filter(referral => {
    const matchesSearch = 
      referral.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referralNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || referral.status === statusFilter;
    const matchesUrgency = !urgencyFilter || referral.urgency === urgencyFilter;

    // Date filtering
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const dateRange = getDateRange();
      if (dateRange) {
        const referralDate = new Date(referral.createdAt);
        referralDate.setHours(0, 0, 0, 0);
        matchesDate = referralDate >= dateRange.start && referralDate < dateRange.end;
      }
    }
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesDate;
  });

  const handleEdit = (referral) => {
    setEditingId(referral._id);
    setEditData({
      status: referral.status,
      diagnosis: referral.diagnosis,
      clinicalNotes: referral.clinicalNotes,
      urgency: referral.urgency,
    });
  };

  const handleSaveEdit = async (referralId) => {
    try {
      await api.put(`/api/v1/referral/update/${referralId}`, editData);
      snackbar.success('Referral updated successfully');
      playSaveSound();
      setEditingId(null);
      fetchAllReferrals(); // Refresh list
    } catch (error) {
      snackbar.error('Error updating referral: ' + error.response?.data?.message);
    }
  };

  const handleDelete = async (referralId) => {
    snackbar.confirm('Are you sure you want to delete this referral?', async () => {
      try {
        setDeleting(referralId);
        await api.delete(`/api/v1/referral/delete/${referralId}`);
        snackbar.success('Referral deleted successfully');
        playDeleteSound();
        fetchAllReferrals(); // Refresh list
      } catch (error) {
        snackbar.error('Error deleting referral: ' + error.response?.data?.message);
      } finally {
        setDeleting(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="tab-content">
        <div className="form-component">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading referrals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="form-component">
        <h2>Track Referrals</h2>
        
        {/* Search and Filter Section */}
        <Toolbar>

          <div style={{ width: '90%' }}>
            <div className="grid-container">
              <div className="form-group">
                <input 
                  type="text"
                  placeholder="Enter patient name or referral number 🔍"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                /> 
              </div>
              <div className="form-group">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status </option>
                  <option value="submitted">Submitted</option>
                  <option value="under-review">Under Review</option>
                  <option value="accepted">Accepted</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
                  <option value="">All Urgency</option>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="form-group">
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid-container" style={{ marginTop: '10px' }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
<button 
              onClick={fetchAllReferrals}
              className="icon-btn"
            >
              <FaSync />
            </button>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Found: {filteredReferrals.length} referral{filteredReferrals.length !== 1 ? 's' : ''} (Total: {allReferrals.length})
            </p>
          </div>
        </Toolbar>

        {/* Referrals List */}
        <div className="doctors banner">
          {!filteredReferrals || filteredReferrals.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
              No referrals found
            </div>
          ) : (
            filteredReferrals.map(referral => {
              const statusSteps = ['submitted', 'under-review', 'accepted', 'scheduled'];
              const currentStatus = referral.status || 'submitted';
              const isEditing = editingId === referral._id;
              
              return (
                <div key={referral._id} className="card" style={{ position: 'relative' }}>
                  <div className="doc-card-header">
                    <div>
                      <h4>{referral.patientName || 'Anonymous Patient'}</h4>
                      <p>ID: {referral.referralNumber || (referral._id ? String(referral._id).substring(0, 8) : 'N/A')}</p>
                    </div>
                    <span className={`urgency-badge urgency-${referral.urgency}`}>
                      {(isEditing && editData.urgency) ? editData.urgency.toUpperCase() : (referral.urgency || 'routine').toUpperCase()}
                    </span>
                  </div>
                  
                  {isEditing ? (
                    // Edit Mode
                    <div className="doc-card-details">
                      <div className="form-group">
                        <label>Status:</label>
                        <select 
                          value={editData.status}
                          onChange={(e) => setEditData({...editData, status: e.target.value})}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="under-review">Under Review</option>
                          <option value="accepted">Accepted</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Urgency:</label>
                        <select 
                          value={editData.urgency}
                          onChange={(e) => setEditData({...editData, urgency: e.target.value})}
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Diagnosis:</label>
                        <input 
                          type="text"
                          value={editData.diagnosis}
                          onChange={(e) => setEditData({...editData, diagnosis: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Clinical Notes:</label>
                        <textarea 
                          value={editData.clinicalNotes}
                          onChange={(e) => setEditData({...editData, clinicalNotes: e.target.value})}
                          rows="3"
                        />
                      </div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="icon-btn" 
                          onClick={() => handleSaveEdit(referral._id)}
                          style={{ background: '#e2f3e2' ,color: 'green'}}
                        >
                          <BsSave/>
                        </button>
                        <button 
                          className="icon-btn" 
                          onClick={() => setEditingId(null)}
                          style={{ background:'#fbf7f7', color: 'red'}}
                        >
                          <MdCancel/>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="doc-card-details">
                        <div className="detail-row">
                          <span>Hospital:</span>
                          <span>
                            {referral.hospitals && referral.hospitals.length > 0
                              ? referral.hospitals[0].hospitalName
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Date Submitted:</span>
                          <span>
                            {referral.createdAt
                              ? new Date(referral.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Status:</span>
                          <span className={`status-badge status-${currentStatus}`}>
                            {currentStatus.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Diagnosis:</span>
                          <span>{referral.diagnosis}</span>
                        </div>
                      </div>

                      <div className="status-timeline">
                        {statusSteps.map((step) => {
                          const stepIndex = statusSteps.indexOf(step);
                          const currentIndex = statusSteps.indexOf(currentStatus);
                          const isActive = step === currentStatus;
                          const isCompleted = stepIndex < currentIndex;
                          
                          return (
                            <div 
                              key={step} 
                              className={`timeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                            >
                              <div className="timeline-dot"></div>
                              <span className="timeline-label">{step.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="doc-card-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => {}}>
                          <BsEye />
                        </button>
                        <button className="icon-btn" onClick={() => handleEdit(referral)}>
                          <FiEdit />
                        </button>
                        <button className="icon-btn" onClick={() => handleDelete(referral._id)} disabled={deleting === referral._id}>
                          {deleting === referral._id ? <span className="loader"></span> : <BsTrash2 />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {onSubmit && (
          <div className="button-group" style={{ marginTop: '20px' }}>
            <button className="btn" onClick={handleSubmit}>
              Complete Referral
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackReferralsTab;
