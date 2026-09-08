import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import api from "../utils/api";
import "./CapacityCalendar.css";

const CapacityCalendar = ({
  doctorId,
  selectedDate,
  onDateSelect,
  disableFullDates = true,
  showLegend = true,
  minDate,
  maxDate,
}) => {
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  useEffect(() => {
    if (doctorId) {
      fetchCapacities();
    }
  }, [doctorId, visibleMonth]);

  const fetchCapacities = async () => {
    setLoading(true);
    try {
      const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
      const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);

      const startDate = monthStart.toISOString().split("T")[0];
      const endDate = monthEnd.toISOString().split("T")[0];

      const { data } = await api.get(`/api/v1/capacity-scheduler`, {
        params: {
          doctorId,
          startDate,
          endDate,
        },
      });

      if (data.success) {
        setCapacities(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch capacities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return capacities.find((c) => c.serviceDate === dateStr);
  };

  const getCapacityStatus = (bookedCount, capacity) => {
    if (capacity === 0) return "gray";
    const percentage = (bookedCount / capacity) * 100;
    if (percentage < 50) return "green";
    if (percentage < 75) return "yellow";
    return "red";
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== "month") return null;

    const capacity = getCapacityForDate(date);
    if (!capacity) return null;

    const status = getCapacityStatus(capacity.bookedCount, capacity.capacity);
    return `capacity-${status}`;
  };

  const isDateDisabled = ({ date, view }) => {
    if (view !== "month") return false;

    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable dates beyond maxDate
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }

    // Disable full dates if requested
    if (disableFullDates) {
      const capacity = getCapacityForDate(date);
      if (capacity && !capacity.isAvailable() && capacity.isWorkingDay) {
        return true;
      }
    }

    return false;
  };

  const handleDateChange = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    onDateSelect?.(dateStr);
  };

  const capacityInfo = selectedDate ? getCapacityForDate(new Date(selectedDate + "T00:00:00")) : null;
  const selectedStatus = capacityInfo ? getCapacityStatus(capacityInfo.bookedCount, capacityInfo.capacity) : null;
  const selectedPercentage = capacityInfo ? Math.round((capacityInfo.bookedCount / capacityInfo.capacity) * 100) : 0;

  return (
    <div className="capacity-calendar-wrapper">
      {showLegend && (
        <div className="capacity-legend">
          <h4>Availability Legend</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color green"></div>
              <span>Available (&lt; 50%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color yellow"></div>
              <span>Almost Full (50-75%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color red"></div>
              <span>Full (&gt; 75%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color gray"></div>
              <span>Not Set</span>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-container">
        <Calendar
          value={selectedDate ? new Date(selectedDate + "T00:00:00") : new Date()}
          onChange={handleDateChange}
          tileClassName={getTileClassName}
          tileDisabled={isDateDisabled}
          minDate={minDate ? new Date(minDate) : new Date()}
          maxDate={maxDate ? new Date(maxDate) : new Date(new Date().setDate(new Date().getDate() + 90))}
          onActiveStartDateChange={({ activeStartDate }) => setVisibleMonth(activeStartDate)}
        />
      </div>

      {selectedDate && capacityInfo && (
        <div className="capacity-info-box">
          <h4>Selected Date Information</h4>
          <div className="info-content">
            <div className="info-row">
              <span className="info-label">Date:</span>
              <span className="info-value">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Slots:</span>
              <span className="info-value">
                {capacityInfo.bookedCount} / {capacityInfo.capacity} booked
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Filled:</span>
              <span className="info-value">{selectedPercentage}%</span>
            </div>

            <div className="info-row">
              <span className="info-label">Status:</span>
              <span
                className={`status-badge status-${selectedStatus}`}
                style={{
                  backgroundColor:
                    selectedStatus === "green"
                      ? "#c8e6c9"
                      : selectedStatus === "yellow"
                      ? "#ffe0b2"
                      : "#ffcdd2",
                  color:
                    selectedStatus === "green"
                      ? "#1b5e20"
                      : selectedStatus === "yellow"
                      ? "#e65100"
                      : "#b71c1c",
                }}
              >
                {selectedStatus === "green"
                  ? "Available"
                  : selectedStatus === "yellow"
                  ? "Almost Full"
                  : "Full"}
              </span>
            </div>

            {capacityInfo.notes && (
              <div className="info-row">
                <span className="info-label">Notes:</span>
                <span className="info-value notes">{capacityInfo.notes}</span>
              </div>
            )}

            {!capacityInfo.isWorkingDay && (
              <div className="holiday-notice">
                <span>🚫 Doctor is not working on this day</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityCalendar;
