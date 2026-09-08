import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import api from "../utils/api";
import "react-calendar/dist/Calendar.css";
import "./CapacityCalendar.css";

/**
 * CapacityCalendar Component
 * 
 * Displays a calendar with color-coded capacity status for a doctor
 * - Green: < 50% capacity (available)
 * - Yellow: 50-75% capacity (almost full)
 * - Red: > 75% capacity (full, not selectable)
 * 
 * Props:
 * - doctorId: The doctor's ID
 * - selectedDate: Currently selected date
 * - onDateSelect: Callback when a date is selected
 * - disableFullDates: If true, red (full) dates cannot be selected
 * - showLegend: If true, shows capacity legend
 */
const CapacityCalendar = ({
  doctorId,
  selectedDate,
  onDateSelect,
  disableFullDates = true,
  showLegend = true,
  minDate = new Date(),
  maxDate = null,
}) => {
  const [capacities, setCapacities] = useState({});
  const [loading, setLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Default to 90 days in the future if no max date specified
  if (!maxDate) {
    maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
  }

  // Fetch capacities for the visible month
  useEffect(() => {
    if (!doctorId) return;

    const fetchCapacities = async () => {
      setLoading(true);
      try {
        const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
        const monthEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);

        const { data } = await api.get(`/api/v1/capacity`, {
          params: {
            doctorId,
            startDate: monthStart.toISOString().split("T")[0],
            endDate: monthEnd.toISOString().split("T")[0],
          },
        });

        if (data.success && data.capacities) {
          const capacityMap = {};
          data.capacities.forEach((capacity) => {
            const dateKey = new Date(capacity.date).toDateString();
            capacityMap[dateKey] = {
              maxCapacity: capacity.maxCapacity,
              currentAppointments: capacity.currentAppointments,
              percentage: (capacity.currentAppointments / capacity.maxCapacity) * 100,
              status: getCapacityStatus((capacity.currentAppointments / capacity.maxCapacity) * 100),
            };
          });
          setCapacities(capacityMap);
        }
      } catch (error) {
        console.error("Failed to fetch capacities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCapacities();
  }, [doctorId, calendarDate]);

  // Determine capacity status based on percentage
  const getCapacityStatus = (percentage) => {
    if (percentage < 50) return "green";
    if (percentage < 75) return "yellow";
    return "red";
  };

  // Get capacity info for a specific date
  const getCapacityForDate = (date) => {
    const dateKey = date.toDateString();
    return capacities[dateKey] || null;
  };

  // Check if date should be disabled
  const isDateDisabled = (date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable dates beyond max date
    if (date > maxDate) return true;

    // Disable full capacity dates if requested
    if (disableFullDates) {
      const capacity = getCapacityForDate(date);
      if (capacity && capacity.status === "red") return true;
    }

    return false;
  };

  // Tile className for coloring
  const getTileClassName = ({ date }) => {
    const capacity = getCapacityForDate(date);
    if (!capacity) return "no-capacity";

    const classes = ["has-capacity"];
    classes.push(`capacity-${capacity.status}`);

    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      classes.push("selected-date");
    }

    return classes.join(" ");
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (!isDateDisabled(date)) {
      onDateSelect(date);
    }
  };

  return (
    <div className="capacity-calendar-wrapper">
      {showLegend && (
        <div className="capacity-legend">
          <div className="legend-item">
            <span className="legend-box green"></span>
            <span>Available (&lt;50%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-box yellow"></span>
            <span>Almost Full (50-75%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-box red"></span>
            <span>Full (&gt;75%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-box gray"></span>
            <span>No Capacity Set</span>
          </div>
        </div>
      )}

      {loading && <div className="capacity-loading">Loading capacities...</div>}

      <div className="capacity-calendar-container">
        <Calendar
          value={selectedDate || new Date()}
          onChange={handleDateClick}
          onActiveStartDateChange={({ activeStartDate }) => {
            setCalendarDate(activeStartDate);
          }}
          tileClassName={getTileClassName}
          tileDisabled={({ date }) => isDateDisabled(date)}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>

      {selectedDate && (
        <div className="capacity-info">
          <h4>Capacity for {selectedDate.toLocaleDateString()}</h4>
          {getCapacityForDate(selectedDate) ? (
            <div className="info-details">
              <p>
                <strong>Appointments:</strong>{" "}
                {getCapacityForDate(selectedDate).currentAppointments} /{" "}
                {getCapacityForDate(selectedDate).maxCapacity}
              </p>
              <p>
                <strong>Availability:</strong>{" "}
                <span
                  className={`status-badge status-${getCapacityForDate(selectedDate).status}`}
                >
                  {getCapacityForDate(selectedDate).status.toUpperCase()}{" "}
                  ({Math.round(getCapacityForDate(selectedDate).percentage)}%)
                </span>
              </p>
            </div>
          ) : (
            <p className="no-capacity-info">No capacity set for this date</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CapacityCalendar;
