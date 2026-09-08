import React from 'react';
import {
  MdDelete,
  MdMarkEmailRead,
  MdMarkEmailUnread,
} from 'react-icons/md';

const BulkActions = ({
  selected,
  onSelectAll,
  onUpdateStatus,
  onDelete,
  isAllSelected,
}) => {
  return (
    <div className="bulk-actions">
      <input
        type="checkbox"
        checked={isAllSelected}
        onChange={onSelectAll}
        title="Select all messages on this page"
      />
      <button
        onClick={() => onUpdateStatus(selected, true)}
        disabled={selected.length === 0}
        className="btn-icon"
        title="Mark selected as Read"
      >
        <MdMarkEmailRead size="1.5rem" />
      </button>
      <button
        onClick={() => onUpdateStatus(selected, false)}
        disabled={selected.length === 0}
        className="btn-icon"
        title="Mark selected as Unread"
      >
        <MdMarkEmailUnread size="1.5rem" />
      </button>
      <button
        onClick={() => onDelete(selected)}
        disabled={selected.length === 0}
        className="btn-icon btn-danger"
        title="Delete Selected"
      >
        <MdDelete size="1.5rem" />
      </button>
      <span className="summary-text">
        {selected.length > 0 ? `(${selected.length} selected)` : ''}
      </span>
    </div>
  );
};

export default BulkActions;
