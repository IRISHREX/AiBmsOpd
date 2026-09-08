import React from 'react';
import { useToolbar } from '../hooks/useToolbar';
import './Toolbar.css';

const Toolbar = ({ children }) => {
  const { showToolbar } = useToolbar();

  return (
    <div className={`toolbar ${showToolbar ? 'show' : 'hide'}`}>
      {children}
    </div>
  );
};

export default Toolbar;