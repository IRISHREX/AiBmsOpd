import React from 'react';
import { MdOutlineContentPasteSearch } from 'react-icons/md';

const MessageFilter = ({
  filters,
  onFilterChange,
  onClearFilters,
  user,
  filteredDoctors,
}) => {
  return (
    <div className="filter-controls">
      <select
        name="filterOption"
        value={filters.filterOption}
        onChange={onFilterChange}
      >
        <option value="All">Filter by Date</option>
        <option value="Today">Today</option>
        <option value="Old">Older</option>
        <option value="Custom">Custom Range</option>
      </select>

      {user?.role !== 'Doctor' && (
        <select
          name="doctorId"
          value={filters.doctorId}
          onChange={onFilterChange}
        >
          <option value="">Filter by Doctor</option>
          {filteredDoctors.map((doc) => (
            <option key={doc._id} value={doc._id}>
              {doc.firstName} {doc.lastName}
            </option>
          ))}
        </select>
      )}

      {filters.filterOption === 'Custom' && (
        <div className="custom-date-inputs">
          <input
            type="date"
            name="customStart"
            value={filters.customStart}
            onChange={onFilterChange}
          />
          <span>-</span>
          <input
            type="date"
            name="customEnd"
            value={filters.customEnd}
            onChange={onFilterChange}
          />
        </div>
      )}

      <div className="search-input">
        <MdOutlineContentPasteSearch size="1.5rem" color="#718096" />
        <input
          type="text"
          name="q"
          placeholder="Search by name or phone..."
          value={filters.q}
          onChange={onFilterChange}
        />
      </div>

      <div className="action-buttons">
        <button onClick={onClearFilters} className="btn btn-secondary">
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default MessageFilter;
