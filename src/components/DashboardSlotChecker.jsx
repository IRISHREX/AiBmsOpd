import React, { useContext, useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import api from "../utils/api";
import { IoClose } from "react-icons/io5";
import { Context } from "../main";
import "./DashboardSlotChecker.css";

const DashboardSlotChecker = ({ isOpen, onClose }) => {
  const { admin } = useContext(Context);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [allowedDoctors, setAllowedDoctors] = useState([]);

  // Fetch doctors and determine allowed doctors based on role
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get("/api/v1/user/doctors");
        const allDoctors = data.doctors || [];
        setDoctors(allDoctors);

        // Determine which doctors to show based on role
        let allowed = [];
        if (admin?.role === 'Admin') {
          // Admin can see all doctors
          allowed = allDoctors;
        } else if (admin?.role === 'Doctor') {
          // Doctor can only see themselves
          allowed = allDoctors.filter(d => d._id === admin._id);
        } else if (admin?.role === 'Compounder') {
          // Compounder can see assigned doctors
          const assignedIds = (admin.assignedDoctors || []).map(d => d._id || d);
          allowed = allDoctors.filter(d => assignedIds.includes(d._id));
        }

        setAllowedDoctors(allowed);

        // Auto-select first allowed doctor
        if (allowed.length > 0) {
          setSelectedDoctorId(allowed[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
      }
    };
    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen, admin]);

  // Fetch capacities when doctor or month changes
  useEffect(() => {
    if (selectedDoctorId && isOpen) {
      fetchCapacities();
    }
  }, [selectedDoctorId, visibleMonth, isOpen]);

  const fetchCapacities = async () => {
    setLoading(true);
    try {
      const monthStart = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        1
      );
      const monthEnd = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + 1,
        0
      );

      // Use local date without timezone conversion
      const getDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDate = getDateString(monthStart);
      const endDate = getDateString(monthEnd);

      const { data } = await api.get("/api/v1/capacity-scheduler", {
        params: {
          doctorId: selectedDoctorId,
          startDate,
          endDate,
        },
      });

      if (data.success) {
        setCapacities(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch capacities:", error);
      setCapacities([]);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityForDate = (date) => {
    // Use local date without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
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
    if (view !== "month") return "";

    const capacity = getCapacityForDate(date);
    if (!capacity || !capacity.isWorkingDay) return "tile-disabled";

    const status = getCapacityStatus(capacity.bookedCount, capacity.capacity);
    return `tile-${status}`;
  };

  const getTileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const capacity = getCapacityForDate(date);
    if (!capacity || !capacity.isWorkingDay) return null;

    const available = Math.max(0, capacity.capacity - capacity.bookedCount);
    return (
      <div className="tile-content">
        <div className="slot-number">{available}</div>
      </div>
    );
  };

  const handleDateClick = (date) => {
    // Use local date without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const capacity = getCapacityForDate(date);

    setSelectedDateInfo({
      date: dateStr,
      capacity: capacity || { capacity: 0, bookedCount: 0, isWorkingDay: false },
    });
  };

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  if (!isOpen) return null;

  // Check if current user can view slots
  const isDoctor = admin?.role === 'Doctor';
  const isCompounder = admin?.role === 'Compounder';
  const isAdmin = admin?.role === 'Admin';

  return (
    <div className="slot-checker-popup-overlay" onClick={onClose}>
      <div className="slot-checker-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="slot-checker-popup-header">
          <h3>Doctor Availability</h3>
          <button
            className="popup-close-btn"
            onClick={onClose}
            title="Close"
          >
            <IoClose size={22} />
          </button>
        </div>

        {/* Doctor Selector - Only show for Admin and Compounder with multiple doctors */}
        {(isAdmin || isCompounder) && allowedDoctors.length > 1 ? (
          <div className="popup-doctor-selector">
            <select
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setSelectedDateInfo(null);
              }}
              className="popup-doctor-select"
            >
              {allowedDoctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.firstName} {doctor.lastName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="popup-doctor-selector popup-fixed-doctor">
            <div className="popup-fixed-doctor-name">
              {selectedDoctor &&
                `${selectedDoctor.firstName} ${selectedDoctor.lastName}`}
            </div>
          </div>
        )}

        {selectedDoctorId && (
          <div className="slot-checker-popup-content">
            {/* Calendar Section */}
            <div className="popup-calendar-wrapper">
              {loading ? (
                <div className="popup-loading">Loading...</div>
              ) : (
                <>
                  <Calendar
                    value={new Date()}
                    onClickMonth={() => {}}
                    tileClassName={getTileClassName}
                    tileContent={getTileContent}
                    onActiveStartDateChange={({ activeStartDate }) => {
                      setVisibleMonth(activeStartDate);
                      setSelectedDateInfo(null);
                    }}
                    minDetail="month"
                    next2Label={null}
                    prev2Label={null}
                    className="popup-calendar"
                    onClickDay={handleDateClick}
                  />

                  {/* Legend */}
                  <div className="popup-legend">
                    <div className="popup-legend-item">
                      <div className="popup-legend-dot green"></div>
                      <span>&lt;50%</span>
                    </div>
                    <div className="popup-legend-item">
                      <div className="popup-legend-dot yellow"></div>
                      <span>50-75%</span>
                    </div>
                    <div className="popup-legend-item">
                      <div className="popup-legend-dot red"></div>
                      <span>&gt;75%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Slot Details */}
            {selectedDateInfo && (
              <div className="popup-slot-details">
                <div className="popup-detail-header">
                  {selectedDateInfo.date}
                </div>

                {selectedDateInfo.capacity.isWorkingDay ? (
                  <div className="popup-details-list">
                    <div className="popup-detail-item">
                      <span>Capacity:</span>
                      <strong>{selectedDateInfo.capacity.capacity}</strong>
                    </div>
                    <div className="popup-detail-item">
                      <span>Booked:</span>
                      <strong>{selectedDateInfo.capacity.bookedCount}</strong>
                    </div>
                    <div className="popup-detail-item">
                      <span>Available:</span>
                      <strong
                        className={
                          Math.max(
                            0,
                            selectedDateInfo.capacity.capacity -
                              selectedDateInfo.capacity.bookedCount
                          ) === 0
                            ? "text-red"
                            : "text-green"
                        }
                      >
                        {Math.max(
                          0,
                          selectedDateInfo.capacity.capacity -
                            selectedDateInfo.capacity.bookedCount
                        )}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="popup-no-work">Holiday / Off Day</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardSlotChecker;
