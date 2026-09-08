import React, { useState } from "react";
import "./MedicineForm.css";

const BulkMedicineForm = ({ onSave, onCancel, submitLabel = "Save" }) => {
  const [composition, setComposition] = useState("");
  const [names, setNames] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const namesArray = names.split('\n').map(name => name.trim()).filter(name => name);
    onSave({ names: namesArray, composition });
  };

  return (
    <form onSubmit={handleSubmit} className="medicine-form">
      <div className="form-group">
        <label htmlFor="composition">Composition</label>
        <input
          id="composition"
          value={composition}
          onChange={(e) => setComposition(e.target.value)}
          placeholder="Enter composition"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="names">Medicine Names (one per line)</label>
        <textarea
          id="names"
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder="Enter medicine names, one per line"
          required
          rows={5}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
      </div>
    </form>
  );
};

export default BulkMedicineForm;
