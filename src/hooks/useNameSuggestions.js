import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

/**
 * Hook: fetches medicine suggestions by name with debounce.
 * @param {string} query - name query
 * @param {object} opts - options: { limit, delay }
 * @returns {object} { suggestions, loading, error, clear }
 */
export default function useNameSuggestions(query, opts = {}) {
  const { limit = 10, delay = 300 } = opts;
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const deb = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    if (!query || String(query).trim() === '') {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fullQuery = String(query).trim();
    if (!fullQuery) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    deb.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { name: fullQuery, limit };
        const { data } = await api.get('/api/v1/medicine/search/name', { params });
        const raw = (data.medicines || []);
        const meds = raw.map(med => {
          const comps = Array.isArray(med.composition) ? med.composition : (med.composition ? [med.composition] : []);
          const score = Number(med.matches || med._score || 0);
          return {
            ...med,
            _matchedName: score > 0,
            _score: score,
            label: `${med.name} — ${comps.join(', ')}`,
          };
        });
        meds.sort((a, b) => {
          if ((b._matchedName === true) - (a._matchedName === true)) return (b._matchedName === true) ? 1 : -1;
          if ((b._score || 0) !== (a._score || 0)) return (b._score || 0) - (a._score || 0);
          return String(a.name || '').localeCompare(String(b.name || ''));
        });
        if (mounted.current) setSuggestions(meds);
      } catch (err) {
        if (mounted.current) {
          setError(err?.message || 'Failed to fetch name suggestions');
          setSuggestions([]);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }, delay);

    return () => {
      if (deb.current) clearTimeout(deb.current);
    };
  }, [query, limit, delay]);

  const clear = () => { setSuggestions([]); setLoading(false); setError(null); };

  return { suggestions, loading, error, clear };
}
