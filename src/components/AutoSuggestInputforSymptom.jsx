import React, { useState, useRef, useEffect } from 'react';
import AutoSuggestInput from './AutoSuggestInput';
import api from '../utils/api';
import './AutoSuggestInputforSymptom.css';
import { useDispatch, useSelector } from 'react-redux';
import {add,remove} from "../store/diagnosisSlice";
import { changeSdisease } from '../store/diseaseSlice';

const AutoSuggestInputforSymptom = ({ value, onChange, onSelect, placeholder }) => {
  const [symptomSuggestions, setSymptomSuggestions] = useState([]);
  const [diseaseSuggestions, setDiseaseSuggestions] = useState([]);
  const suggestedDisease = useSelector((state) => state.disease.value);
  const debounceRef = useRef(null);
  const rDiagnosis = useSelector((state) => state.diagnosis.value);
  const dispatch = useDispatch();

  useEffect(() => {
    if (value) {
      getSuggestions(value);
    }
  }, [value]);

  const getSuggestions = (query) => {
    return new Promise((resolve) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
  
      debounceRef.current = setTimeout(async () => {
        const lastToken = (query.split(',').pop() || '').trim();
        if (!lastToken) {
          setSymptomSuggestions([]);
          return resolve([]);
        }
        try {
          const { data } = await api.get(`/api/v1/medical/suggestions/symptoms`, {
            params: { q: lastToken }
          });
          const suggestions = data.symptoms || [];
          setSymptomSuggestions(suggestions);
          resolve(suggestions);
        } catch (error) {
          console.error("Error fetching symptom suggestions:", error);
          setSymptomSuggestions([]);
          resolve([]);
        }
      }, 300); // 300ms debounce delay
    });
  };

  const handleSelect = async (item, newValue) => {
    if (onSelect) {
      onSelect(item, newValue);
    }
    const query = newValue.split(',').map(s => s.trim()).filter(Boolean).join(',');
    if (query) {
      try {
        const { data } = await api.get(`/api/v1/medical/advance-search-symptoms`, {
          params: { query }
        });
        dispatch(changeSdisease(data.results || []));
        // setDiseaseSuggestions(data.results || []);
        console.log("Suggested Diseases:", data.results || []);
      } catch (error) {
        console.error("Error fetching disease suggestions:", error);
        dispatch(changeSdisease([]));
        // setDiseaseSuggestions([]);
      }
    }
  };

  return (
    <div>
      <AutoSuggestInput
        value={value}
        onChange={onChange}
        onSelect={handleSelect}
        suggestions={symptomSuggestions}
        getSuggestions={getSuggestions}
        placeholder={placeholder || "Enter presenting complaints..."}
      />
      {suggestedDisease.length > 0 && (
      // {diseaseSuggestions.length > 0 && (
        <div className="disease-suggestions-dropdown">
          <p className="disease-suggestions-title">Suggested Diseases:</p>
          <ul className="disease-suggestions-list">
            {suggestedDisease.map((disease, index) => (
              <li
                key={index}
                className={`disease-suggestion-item ${rDiagnosis.includes(disease)?'selected':''}`}
                onClick={() =>{ 
                  rDiagnosis.includes(disease) ? dispatch(remove(disease)) : dispatch(add(disease));
                }}
              >
                {disease}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AutoSuggestInputforSymptom;