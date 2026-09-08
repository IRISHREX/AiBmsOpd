import React, { useContext, useEffect, useState } from "react";
import { useSnackbar } from "../context/SnackbarContext";
import api from "../utils/api";
import { Context } from "../main";
import "./CapacitySchedulerForm.css";
import { AiOutlineSchedule } from "react-icons/ai";

const CapacitySchedulerForm = ({
  doctorId,
  allowAdminSelfManagement = true,
}) => {
  const snackbar = useSnackbar();
  const { admin } = useContext(Context);
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [notes, setNotes] = useState("");
  const [isWorkingDay, setIsWorkingDay] = useState(true);

  // Determine effective doctorId: use admin's ID if they're an admin and allowAdminSelfManagement is true
  const effectiveDoctorId =
    allowAdminSelfManagement && admin?.role === "Admin" && admin?._id
      ? admin._id
      : doctorId;

  // Fetch capacities
  useEffect(() => {
    if (effectiveDoctorId) {
      fetchCapacities();
    }
  }, [effectiveDoctorId]);

  const fetchCapacities = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const ninetyDaysLater = new Date();
      ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);

      // Use local date without timezone conversion
      const getDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const startDate = getDateString(today);
      const endDate = getDateString(ninetyDaysLater);

      const { data } = await api.get(`/api/v1/capacity-scheduler`, {
        params: {
          doctorId: effectiveDoctorId,
          startDate,
          endDate,
        },
      });

      if (data.success) {
        setCapacities(data.data || []);
      }
    } catch (error) {
      snackbar.error("Failed to load capacity schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleSetCapacity = async (e) => {
    e.preventDefault();

    if (!selectedDate || !capacity) {
      snackbar.error("Please select a date and enter capacity!");
      return;
    }

    if (capacity < 1 || capacity > 100) {
      snackbar.error("Capacity must be between 1 and 100!");
      return;
    }

    setFormLoading(true);
    try {
      const response = await api.post(`/api/v1/capacity-scheduler/set`, {
        doctorId: effectiveDoctorId,
        serviceDate: selectedDate,
        capacity: parseInt(capacity),
        isWorkingDay,
        notes,
      });

      if (response.data.success) {
        snackbar.success("Capacity schedule updated successfully!");
        setSelectedDate("");
        setCapacity("20");
        setNotes("");
        setIsWorkingDay(true);
        fetchCapacities();
      }
    } catch (error) {
      snackbar.error(
        error?.response?.data?.message || "Failed to set capacity"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleWorkingDay = async (capacityId, currentStatus) => {
    try {
      const response = await api.patch(
        `/api/v1/capacity-scheduler/${capacityId}/toggle-working-day`
      );

      if (response.data.success) {
        snackbar.success(
          `Marked as ${!currentStatus ? "working" : "non-working"} day`
        );
        fetchCapacities();
      }
    } catch (error) {
      snackbar.error("Failed to update working day status");
    }
  };

  const getCapacityPercentage = (booked, max) => {
    return max === 0 ? 0 : Math.round((booked / max) * 100);
  };

  const getCapacityStatus = (percentage) => {
    if (percentage < 50) return { status: "green", label: "Available" };
    if (percentage < 75) return { status: "yellow", label: "Almost Full" };
    return { status: "red", label: "Full" };
  };

  const getCapacityColor = (percentage) => {
    if (percentage < 50) return "#4caf50";
    if (percentage < 75) return "#ff9800";
    return "#f44336";
  };

  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, "0");
    const day = String(maxDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="capacity-scheduler-form">
      <div className="form-header">
        <h3>
          <AiOutlineSchedule />
          Capacity Schedule Manager
        </h3>
        <p>Set your daily patient capacity and working days</p>
      </div>

      {/* Set Capacity Form */}
      <div className="capacity-form-section">
        <h4>🕐 Set New Capacity</h4>
        <form onSubmit={handleSetCapacity} className="capacity-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="capacityDate">Date</label>
              <input
                id="capacityDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="capacityValue">Max Patients</label>
              <div className="capacity-input-wrapper">
                <input
                  id="capacityValue"
                  type="number"
                  min="1"
                  max="100"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
                <span className="capacity-badge">{capacity} slots</span>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                placeholder="e.g., Walk-ins after 3 PM, Emergency only..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength="200"
                rows="2"
              />
              <small>{notes.length}/200</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isWorkingDay}
                  onChange={(e) => setIsWorkingDay(e.target.checked)}
                />
                <span>Working Day</span>
              </label>
              {!isWorkingDay && (
                <span className="holiday-badge">Holiday/Off</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="capacity-form-submit"
          >
            {formLoading ? "Setting..." : "Set Capacity"}
          </button>
        </form>
      </div>

      {/* Capacity Schedule List */}
      <div className="capacity-list-section">
        <h4>📊 Your Schedule</h4>
        {loading ? (
          <p className="loading-text">Loading schedule...</p>
        ) : capacities.length > 0 ? (
          <div className="capacity-list">
            {capacities.map((cap) => {
              const percentage = getCapacityPercentage(
                cap.bookedCount,
                cap.capacity
              );
              const { status, label } = getCapacityStatus(percentage);
              const dateStr = formatDate(cap.serviceDate);

              return (
                <div key={cap._id} className="capacity-card">
                  <div className="capacity-card-header">
                    <div className="date-info">
                      <strong>{dateStr}</strong>
                      {!cap.isWorkingDay && (
                        <span className="badge-holiday">Holiday</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleWorkingDay(cap._id, cap.isWorkingDay)
                      }
                      className={`toggle-btn ${
                        cap.isWorkingDay ? "working" : "non-working"
                      }`}
                    >
                      {cap.isWorkingDay ? "✓ Working" : "✗ Off"}
                    </button>
                  </div>

                  <div className="capacity-card-body">
                    <div className="capacity-stats">
                      <div className="stat-item">
                        <span className="stat-label">Slots</span>
                        <span className="stat-value">
                          {cap.bookedCount} / {cap.capacity}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Filled</span>
                        <span className="stat-value">{percentage}%</span>
                      </div>
                    </div>

                    <div className="capacity-bar-wrapper">
                      <div className="capacity-bar-bg">
                        <div
                          className="capacity-bar-fill"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: getCapacityColor(percentage),
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="capacity-status-bar">
                      <span
                        className={`status-badge status-${status}`}
                        style={{
                          backgroundColor:
                            status === "green"
                              ? "#c8e6c9"
                              : status === "yellow"
                              ? "#ffe0b2"
                              : "#ffcdd2",
                          color:
                            status === "green"
                              ? "#1b5e20"
                              : status === "yellow"
                              ? "#e65100"
                              : "#b71c1c",
                        }}
                      >
                        {label}
                      </span>
                      {cap.bookedCount >= cap.capacity && !cap.isWorkingDay && (
                        <span className="warning-badge">No Availability</span>
                      )}
                    </div>

                    {cap.notes && (
                      <div className="capacity-notes">
                        <strong>📝 Notes:</strong> {cap.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-text">
            No schedule set yet. Create your first capacity schedule above!
          </p>
        )}
      </div>

      <div className="info-box">
        <p>
          <strong>💡 Tip:</strong> Set your capacity in advance to help patients
          see your availability. Your schedule will update automatically as
          appointments are booked.
        </p>
      </div>
    </div>
  );
};

export default CapacitySchedulerForm;
