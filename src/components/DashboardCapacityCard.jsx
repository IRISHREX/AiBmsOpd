import React, { useEffect, useState } from "react";
import api from "../utils/api";
import "./DashboardCapacityCard.css";

const DashboardCapacityCard = ({ doctorId, doctorName }) => {
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchCapacities();
    }
  }, [doctorId]);

  const fetchCapacities = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const fourteenDaysLater = new Date();
      fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);

      // Use local date without timezone conversion
      const getDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDate = getDateString(today);
      const endDate = getDateString(fourteenDaysLater);

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
      console.error("Failed to load capacities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityStatus = (percentage) => {
    if (percentage < 50) return "green";
    if (percentage < 75) return "yellow";
    return "red";
  };

  const getCapacityPercentage = (booked, max) => {
    return max === 0 ? 0 : Math.round((booked / max) * 100);
  };

  const getCapacityColor = (percentage) => {
    if (percentage < 50) return "#4caf50";
    if (percentage < 75) return "#ff9800";
    return "#f44336";
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getTodayCapacity = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return capacities.find((c) => c.serviceDate === todayStr);
  };

  const todayCapacity = getTodayCapacity();

  return (
    <div className="dashboard-capacity-card">
      <div className="card-header">
        <h4>📅 {doctorName}</h4>
        <span className="card-refresh" onClick={fetchCapacities}>
          🔄
        </span>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading schedule...</p>
        </div>
      ) : (
        <>
          {todayCapacity && (
            <div className="today-capacity">
              <div className="today-info">
                <span className="label">Today</span>
                <span className="slots">
                  {todayCapacity.bookedCount} / {todayCapacity.capacity}
                </span>
              </div>
              <div className="today-bar">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(
                      getCapacityPercentage(todayCapacity.bookedCount, todayCapacity.capacity),
                      100
                    )}%`,
                    backgroundColor: getCapacityColor(
                      getCapacityPercentage(todayCapacity.bookedCount, todayCapacity.capacity)
                    ),
                  }}
                ></div>
              </div>
            </div>
          )}

          <div className="upcoming-schedule">
            <h5>Next 14 Days</h5>
            <div className="schedule-grid">
              {capacities.slice(0, 14).map((capacity) => {
                const percentage = getCapacityPercentage(capacity.bookedCount, capacity.capacity);
                const status = getCapacityStatus(percentage);

                return (
                  <div
                    key={capacity._id}
                    className={`schedule-tile capacity-${status} ${
                      !capacity.isWorkingDay ? "non-working" : ""
                    }`}
                    title={`${formatDate(capacity.serviceDate)}: ${capacity.bookedCount}/${capacity.capacity} (${percentage}%)`}
                  >
                    <div className="tile-date">{formatDate(capacity.serviceDate)}</div>
                    <div className="tile-capacity">{capacity.bookedCount}/{capacity.capacity}</div>
                    {!capacity.isWorkingDay && <div className="tile-off">Off</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {capacities.length === 0 && (
            <div className="no-schedule">
              <p>No schedule set</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardCapacityCard;
