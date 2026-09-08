import React, { useState } from 'react';
import AutoSuggestInput from './AutoSuggestInput';
import useCompositionSuggestions from '../hooks/useCompositionSuggestions';
import useNameSuggestions from '../hooks/useNameSuggestions';

const MedicineSearch = ({ onSelect, searchBy = 'composition' }) => {
  const [query, setQuery] = useState('');

  // Use separate hooks for name and composition. Hooks must be called unconditionally,
  // so call both and pick the active one based on `searchBy`.
  const compHook = useCompositionSuggestions(query, { limit: 10, delay: 300 });
  const nameHook = useNameSuggestions(query, { limit: 10, delay: 300 });

  const { suggestions, loading } = searchBy === 'name' ? nameHook : compHook;

  const handleSelect = (medicine, newValue) => {
    if (onSelect) onSelect(medicine, newValue);
    setQuery('');
  };

  const placeholderText = searchBy === 'name'
    ? 'Search medicine by name...'
    : 'Search medicine by composition...';

  return (
    <div style={{ position: 'relative', flexGrow: 1 }}>
      <AutoSuggestInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSelect={handleSelect}
        suggestions={suggestions}
        placeholder={loading ? 'Searching...' : placeholderText}
      />
    </div>
  );
};

export default MedicineSearch;