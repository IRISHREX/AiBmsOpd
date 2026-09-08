import React from 'react';
import MedicineSearch from './MedicineSearch';
import { FaTrash } from 'react-icons/fa6';

const MedicineDrawer = ({
  form,
  handleChange,
  handleSubmit,
  saving,
  editingId,
  error,
  addMedicineRow,
  updateMedicineRow,
  removeMedicineRow,
  addTestRow,
  updateTestRow,
  removeTestRow,
  clearForm,
  onClose,
  medicineRowRefs,
  focusedMedicineIndex,
  addSelectedMedicine,
}) => {
  return (
    <div className="edit-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 'fit-content' }}>
        <h3 style={{ margin: 0 }}>{editingId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
        <div>
          <button className="clear-btn" onClick={onClose}>Close</button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <form onSubmit={handleSubmit} className="medicine-form">
          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} required />

          <label>Symptoms (comma separated)</label>
          <input name="symptoms" value={form.symptoms} onChange={handleChange} placeholder="fever, cough" />

          <label>Type</label>
          <input name="type" value={form.type} onChange={handleChange} placeholder="Antibiotic, Analgesic..." />

          <label>Effected Area</label>
          <input name="route" value={form.route} onChange={handleChange} placeholder="oral, iv, topical..." />

          <label>Description</label>
          <textarea name="desese_description" value={form.desese_description} onChange={handleChange} rows={4} />

          <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <div style={{ flex: 1 }}>
              <label> 🔎 Add Medicine by Name</label>
              <MedicineSearch
                searchBy="name"
                onSelect={(medicine) => {
                  if (typeof addSelectedMedicine === 'function') addSelectedMedicine(medicine);
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>🔍 Add Medicine by Composition</label>
              <MedicineSearch
                onSelect={(medicine) => {
                  if (typeof addSelectedMedicine === 'function') addSelectedMedicine(medicine);
                }}
              />
            </div>
          </div>

          <h4>Structured Medicines (optional)</h4>
          {(form.medicines || []).map((m, idx) => (
            <div
              key={idx}
              ref={el => { if (medicineRowRefs && medicineRowRefs.current) medicineRowRefs.current[idx] = el; }}
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 6,
                alignItems: 'center',
                padding: focusedMedicineIndex === idx ? 8 : 0,
                borderRadius: focusedMedicineIndex === idx ? 6 : 0,
                background: focusedMedicineIndex === idx ? '#fff7ed' : 'transparent',
                flexWrap: 'wrap'
              }}
            >
              <div id={`medicine-search-${idx}`} style={{ minWidth: 260, flex: '0 0 260px' }}>
                <div style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600 }}>🔍 Search by composition & Suggest</div>
                <MedicineSearch
                  onSelect={(medicine) => {
                    updateMedicineRow(idx, 'name', medicine.name || '');
                    updateMedicineRow(idx, 'type', medicine.type || '');
                    updateMedicineRow(idx, 'dose', medicine.dose || '');
                    updateMedicineRow(idx, 'frequency', medicine.frequency || '');
                    updateMedicineRow(idx, 'route', medicine.route || '');
                    updateMedicineRow(idx, 'duration', medicine.duration || '');
                    updateMedicineRow(idx, 'notes', medicine.notes || '');
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input placeholder="Name" name="Medicine Name" value={m.name} onChange={e => updateMedicineRow(idx, 'name', e.target.value)} />
              </div>

              <input placeholder="Type" name="type" value={m.type} onChange={e => updateMedicineRow(idx, 'type', e.target.value)} />
              <input placeholder="Dose" name="dose" value={m.dose} onChange={e => updateMedicineRow(idx, 'dose', e.target.value)} />
              <input placeholder="Freq" name="frequency" value={m.frequency} onChange={e => updateMedicineRow(idx, 'frequency', e.target.value)} />
              <input placeholder="Route" name="route" value={m.route} onChange={e => updateMedicineRow(idx, 'route', e.target.value)} />
              <input placeholder="Duration" name="duration" value={m.duration} onChange={e => updateMedicineRow(idx, 'duration', e.target.value)} />
              <input placeholder="Notes" name="notes" value={m.notes} onChange={e => updateMedicineRow(idx, 'notes', e.target.value)} />

              <button type="button" className="remove-btn" onClick={() => removeMedicineRow(idx)}><FaTrash/></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="add-btn" onClick={addMedicineRow}>Add Medicine Row</button>
          </div>

          <h4>Structured Test Advice (optional)</h4>
          {(form.testAdvice || []).map((t, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <input placeholder="Test Name" value={t.testName} onChange={e => updateTestRow(idx, 'testName', e.target.value)} />
              <input placeholder="Type" value={t.testType} onChange={e => updateTestRow(idx, 'testType', e.target.value)} />
              <input placeholder="Precautions" value={t.precautions} onChange={e => updateTestRow(idx, 'precautions', e.target.value)} />
              <input placeholder="Date" type="date" value={t.testDate} onChange={e => updateTestRow(idx, 'testDate', e.target.value)} />
              <button type="button" className="remove-btn" onClick={() => removeTestRow(idx)}><FaTrash/></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="add-btn" onClick={addTestRow}>Add Test Row</button>
          </div>

          <label>Medication (text)</label>
          <textarea name="medication" value={form.medication} onChange={handleChange} rows={2} />

          <label>Diet (text)</label>
          <textarea name="diet" value={form.diet} onChange={handleChange} rows={2} />

          {/* <label>Aliases (comma separated)</label>
          <input name="aliases" value={form.aliases} onChange={handleChange} /> */}

          <label>Tags (comma separated)</label>
          <input name="tags" value={form.tags} onChange={handleChange} />

          {/* <label>Follow-up days</label>
          <input name="followupDays" value={form.followupDays} onChange={handleChange} type="number" />

          <label>Follow-up note</label>
          <input name="followupNote" value={form.followupNote} onChange={handleChange} /> */}

          {/* <label>Default Dose</label>
          <input name="dose" value={form.dose} onChange={handleChange} />

          <label>Default Frequency</label>
          <input name="frequency" value={form.frequency} onChange={handleChange} />

          <label>Default Duration</label>
          <input name="duration" value={form.duration} onChange={handleChange} /> */}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="add-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button>
            <button type="button" className="clear-btn" onClick={clearForm}>Clear</button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default MedicineDrawer;
