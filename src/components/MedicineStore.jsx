import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Modal from "react-modal";
import { useSnackbar } from "../context/SnackbarContext";
import {
  fetchMedicinesRequest,
  addMedicineRequest,
  addMedicinesRequest,
  updateMedicineRequest,
  deleteMedicineRequest,
} from '../store/medicineSlice';
import MedicineForm from './MedicineForm';
import BulkMedicineForm from './BulkMedicineForm';
import Toolbar from './Toolbar';
import { FaSearch } from "./DoctorIcons";
import { FaTrash } from 'react-icons/fa6';
import { FaPen } from 'react-icons/fa';
import { FaArrowLeft } from 'react-icons/fa';
import './MedicineStore.css';
import { MdOutlineAddShoppingCart } from "react-icons/md";
import { FiSearch } from "react-icons/fi";
import { HiOutlineViewGridAdd } from "react-icons/hi";

const MedicineStore = () => {
  const snackbar = useSnackbar();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState(null);
  const dispatch = useDispatch();
  const medicines = useSelector(state => state.medicines.medicines);
  const loading = useSelector(state => state.medicines.loading);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchMedicinesRequest({ name: searchTerm }));
  }, [dispatch, searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchMedicinesRequest({ name: searchTerm }));
  };

  const handleOpenModal = (medicine = null) => {
    if (medicine) {
      setIsEditing(true);
      setCurrentMedicine(medicine);
    } else {
      setIsEditing(false);
      setCurrentMedicine({ name: '', composition: '', type: '', dose: '', frequency: '', route: '', duration: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentMedicine(null);
    setIsEditing(false);
  };

  const handleOpenBulkModal = () => {
    setShowBulkModal(true);
  };

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      dispatch(deleteMedicineRequest(id));
      snackbar.success("Medicine deleted successfully!");
    }
  };

  return (
    <section className="medicine-store-page">
      <div className="medicine-store-content">
      <div className="medicine-store-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn clear-btn" onClick={() => navigate('/settings/medicine') } style={{ padding: '6px 10px' }}>
            <FaArrowLeft style={{ marginRight: 6, color: '#25780eff' }} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0 , color: '#c4e7eeff', position: 'relative'}}>Medicine Store</h1>
          </div>
        </div>
      </div>

      <Toolbar>
        <div className="search-bar-container">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by medicine name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="btn btn-search">
              <FiSearch title="Search" />
              {/* Search */}
            </button>
            <button type="button" onClick={() => handleOpenModal()} className="btn btn-add">
              <MdOutlineAddShoppingCart title="Add Medicines" />
              {/* + Add Medicine */}
            </button>
            <button type="button" onClick={handleOpenBulkModal} className="btn btn-add">
              <HiOutlineViewGridAdd title="Add Bulk Medicines" />
              {/* + Add Bulk Medicines */}
            </button>
          </form>
        </div>
      </Toolbar>

      <div className="medicines-container">
        {loading ? (
          <div className="loading-state">
            <span className="loader"></span>
            <p>Loading medicines...</p>
          </div>
        ) : medicines && medicines.length > 0 ? (
          <div className="medicines-grid">
            {medicines.map((medicine) => (
              <div key={medicine._id} className="medicine-card">
                <div className="medicine-card-header">
                  <h3 className="medicine-name">{medicine.name}</h3>
                  {medicine.price && (
                    <span className="medicine-price">₹{medicine.price}</span>
                  )}
                </div>
                
                <div className="medicine-card-body">
                  {medicine.composition && (
                    <div className="medicine-detail">
                      <span className="detail-label">Composition:</span>
                      <span className="detail-value">{medicine.composition}</span>
                    </div>
                  )}
                  
                  {medicine.description && (
                    <div className="medicine-detail">
                      <span className="detail-label">Description:</span>
                      <p className="detail-description">{medicine.description}</p>
                    </div>
                  )}
                </div>

                <div className="medicine-card-footer">
                  <button
                    title="Edit"
                    onClick={() => handleOpenModal(medicine)}
                    className="icon-btn secondary"
                    aria-label={`Edit ${medicine.name}`}
                  >
                    <FaPen />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => handleDelete(medicine._id)}
                    className="icon-btn remove-btn"
                    aria-label={`Delete ${medicine.name}`}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2>No Medicines Found</h2>
            <p>Try adjusting your search or add a new medicine to get started</p>
            <button onClick={() => handleOpenModal()} className="btn btn-add">
              + Add Your First Medicine
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onRequestClose={handleCloseModal}
        contentLabel={isEditing ? "Edit Medicine" : "Add Medicine"}
        className="medicine-modal"
        overlayClassName="medicine-modal-overlay"
      >
        <div className="modal-header">
          <h2>{isEditing ? "Edit Medicine" : "Add New Medicine"}</h2>
          <button className="close-btn" onClick={handleCloseModal}>&times;</button>
        </div>
        <div className="modal-body">
          {currentMedicine && (
            <MedicineForm
              initialData={currentMedicine}
              submitLabel={isEditing ? 'Update Medicine' : 'Add Medicine'}
              onCancel={handleCloseModal}
              onSave={(data) => {
                if (isEditing) {
                  dispatch(updateMedicineRequest({ id: currentMedicine._id || currentMedicine.id, ...data }));
                  snackbar.success('Medicine updated successfully!');
                } else {
                  dispatch(addMedicineRequest(data));
                  snackbar.success('Medicine added successfully!');
                }
                handleCloseModal();
              }}
            />
          )}
        </div>
        
      </Modal>

      <Modal
        isOpen={showBulkModal}
        onRequestClose={handleCloseBulkModal}
        contentLabel="Add Bulk Medicines"
        className="medicine-modal"
        overlayClassName="medicine-modal-overlay"
      >
        <div className="modal-header">
          <h2>Add Bulk Medicines</h2>
          <button className="close-btn" onClick={handleCloseBulkModal}>&times;</button>
        </div>
        <div className="modal-body">
          <BulkMedicineForm
            submitLabel="Add Medicines"
            onCancel={handleCloseBulkModal}
            onSave={(data) => {
              dispatch(addMedicinesRequest(data));
              snackbar.success('Medicines added successfully!');
              handleCloseBulkModal();
            }}
          />
        </div>
      </Modal>

      </div>
    </section>
  );
};

export default MedicineStore;