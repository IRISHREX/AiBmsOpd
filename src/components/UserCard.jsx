import RequirePermission from "./RequirePermission";
import { FaTrashAlt, FaEdit, FaEye } from "./DoctorIcons";
import { MdEmail } from "react-icons/md";
import { PiPhone } from "react-icons/pi";
import { FaCalendarXmark } from "react-icons/fa6";
import useClickSound from "../hooks/useClickSound";

const UserCard = ({
  user,
  extraLines = [],
  onView,
  onEdit,
  onDelete,
  allowAdminActions = true,
}) => {
  const setupClickSound = useClickSound();
  if (!user) return null;
  const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
  // Use the image URL directly from the database (or fallback to default)
  const avatarUrl = user.docAvatar
    ? `${baseUrl}${user.docAvatar}`
    : "./doc1.jpg";

  return (
    <div
      className="doc-card pro-card"
      style={{
        boxShadow: "0 4px 24px rgba(39,23,118,0.12)",
        borderRadius: "18px",
        background: "#fff",
        // margin: "1rem",
        padding: "1.5rem",
        // maxWidth: "340px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "box-shadow 0.2s",
        border: "1px solid #ececec",
        position: "relative",
        lineHeight: "130%"
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 2px 8px #eee",
          marginBottom: "1rem",
          background: "#f7f7fa",
        }}
      >
        <img
          src={avatarUrl}
          alt="avatar"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.target.src = "./doc1.jpg";
          }}
        />
      </div>
      <h3
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          margin: "0.5rem 0",
          color: "#271776",
        }}
      >{`${user.firstName} ${user.lastName}`}</h3>
      <div
        style={{ fontSize: "0.95rem", color: "#555", marginBottom: "0.5rem" }}
      >
        NIC: <span style={{ fontWeight: 500 }}>{user.nic}</span>
      </div>
      {user.doctorDepartment && (
        <div
          style={{ fontSize: "0.95rem", color: "#555", marginBottom: "0.5rem" }}
        >
          Department:{" "}
          <span style={{ fontWeight: 500 }}>{user.doctorDepartment}</span>
        </div>
      )}
      <div
        style={{ fontSize: "0.95rem", color: "#555", marginBottom: "0.5rem" }}
      >
        Gender: <span style={{ fontWeight: 500 }}>{user.gender}</span>
      </div>
      <div
        style={{
          width: "100%",
          margin: "0.5rem 0",
          borderTop: "1px solid #ececec",
        }}
      ></div>
      <div
        style={{
          width: "100%",
          textAlign: "left",
          fontSize: "0.92rem",
          color: "#444",
          marginBottom: "0.5rem",
        }}
      >
        <div>
          <span style={{ fontWeight: 600 }}><MdEmail /></span> {user.email}
        </div>
        <div>
          <span style={{ fontWeight: 600 }}><PiPhone /></span> {user.phone}
        </div>
        <div>
          <span style={{ fontWeight: 600 }}><FaCalendarXmark/></span>{" "}
          <span style={{ fontWeight: 100 }}>DOB:</span>{" "}
          {user.dob
            ? String(user.dob).substring(0, 10)
            : "N/A"}
        </div>
        {extraLines.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
      {allowAdminActions ? (
        <RequirePermission allowedRoles={["Admin"]}>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              ref={setupClickSound}
              title="View"
              className="btn-icon icon-btn"
              onClick={() => onView && onView(user)}
        
            >
              <FaEye />
            </button>
            <button
              ref={setupClickSound}
              title="Edit"
              onClick={() => onEdit && onEdit(user)}
              className="btn-icon icon-btn"
            >
              <FaEdit />
            </button>
            <button
              ref={setupClickSound}
              title="Delete"
              onClick={() => onDelete && onDelete(user)}
              className="btn-icon icon-btn"
            >
              <FaTrashAlt />
            </button>
          </div>
        </RequirePermission>
      ) : null}
    </div>
  );
};

export default UserCard;
