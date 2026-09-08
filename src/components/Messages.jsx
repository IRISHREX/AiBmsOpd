import React, {
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useSnackbar } from "../context/SnackbarContext";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import useSound from "use-sound";

import { Context } from "../main";
import api from "../utils/api";
import { playSaveSound, playLoadSound } from "../utils/soundUtils";
import { fetchMessagesRequest } from "../store/messagesSlice";
import "./Messages.css";

import Toolbar from "./Toolbar";
import MessageList from "./MessageList";
import MessageFilter from "./MessageFilter";
import BulkActions from "./BulkActions";
import Pagination from "./Pagination";
import ComposeModal from "./ComposeModal";
import { HEIGHT_MAX } from "../utils/constants";
import { FiEdit } from "react-icons/fi";
import useClickSound from "../hooks/useClickSound";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Messages = () => {
  const snackbar = useSnackbar();
  // Context provider uses `admin` as the dashboard user object in main.jsx
  // Normalize it here as `user` for existing component code.
  const { isAuthenticated, admin: user } = useContext(Context);
  const dispatch = useDispatch();
  const setupClickSound = useClickSound();

  const {
    messages = [],
    totalPages = 1,
    counts = { total: 0, read: 0, unread: 0 },
    loading,
  } = useSelector((s) => s.messages);

  const [filters, setFilters] = useState({
    q: "",
    email: "",
    page: 1,
    doctorId: "",
    filterOption: "All",
    customStart: "",
    customEnd: "",
  });

  const [selected, setSelected] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [showComposeModal, setShowComposeModal] = useState(false);

  const [playDeleteSound] = useSound("/delete.mp3");

  const debouncedQ = useDebounce(filters.q, 500);
  const debouncedEmail = useDebounce(filters.email, 500);

  const messageIdsOnPage = useMemo(
    () => messages.map((m) => m._id),
    [messages]
  );

  useEffect(() => {
    const fetchAndSetDoctors = async () => {
      if (!user) return;
      try {
        const { data } = await api.get(`/api/v1/user/doctors`);
        const doctors = data.doctors || [];
        setAllDoctors(doctors);

        // If logged in user is a Doctor, pre-set doctorId filter to their id
        if (user?.role === "Doctor") {
          setFilters((prev) => ({ ...prev, doctorId: user._id }));
        }
      } catch (error) {
        snackbar.error("Failed to fetch doctors");
      }
    };

    fetchAndSetDoctors();
  }, [user]);

  const fetchMessages = useCallback(() => {
    const { page, doctorId, filterOption, customStart, customEnd } = filters;
    dispatch(
      fetchMessagesRequest({
        q: debouncedQ,
        email: debouncedEmail,
        page,
        doctorId,
        filterOption,
        customStart,
        customEnd,
      })
    );
  }, [filters, debouncedQ, debouncedEmail, dispatch]);

  useEffect(() => {
    // Debug: log current filters before fetching
    try {
      // eslint-disable-next-line no-console
      console.log("[Messages] fetching messages with filters", filters);
    } catch (e) {}
    fetchMessages();
  }, [fetchMessages]);

  // Debug: whenever messages change, log summary and first item to inspect structure
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log("[Messages] messages updated", {
        length: messages.length,
        first: messages[0],
      });
    } catch (e) {}
  }, [messages]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const clearSearch = () => {
    setFilters({
      q: "",
      email: "",
      page: 1,
      doctorId: user?.role === "Doctor" ? user._id : "",
      filterOption: "All",
      customStart: "",
      customEnd: "",
    });
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setFilters((prev) => ({ ...prev, page: p }));
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelected(
      selected.length === messageIdsOnPage.length ? [] : messageIdsOnPage
    );
  };

  const updateMessageStatus = async (ids, read) => {
    const action = read ? "read" : "unread";
    if (ids.length === 0) return toast.info("No messages selected");

    try {
      await api.post(`/api/v1/message/bulk-update`, { ids, read });
      playSaveSound();
      snackbar.success(`Marked as ${action}`);
      setSelected([]);
      fetchMessages();
    } catch (err) {
      snackbar.error(`Failed to mark as ${action}`);
    }
  };

  const deleteMessages = async (ids) => {
    if (ids.length === 0) {
      snackbar.info("No messages selected");
      return;
    }

    snackbar.confirm(`Delete ${ids.length} message(s)?`, async () => {
      try {
        await api.post(`/api/v1/message/bulk-delete`, { ids });
        snackbar.success("Delete complete");
        playDeleteSound?.();
        setSelected([]);
        fetchMessages();
      } catch (err) {
        snackbar.error("Delete failed");
      }
    });
  };

  const handleReply = async (originalMessage, replyText) => {
    try {
      await api.post("/api/v1/message/send", {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        message: `Re: ${originalMessage.message}\n\n${replyText}`,
        recipient: originalMessage.recipient?._id || allDoctors[0]?._id,
      });
      snackbar.success("Reply sent!");
      fetchMessages();
    } catch (error) {
      snackbar.error("Failed to send reply.");
    }
  };

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }

  // Build doctor list according to the logged-in dashboard user's role
  const filteredDoctors = (() => {
    if (!user) return [];
    if (user.role === "Admin") return allDoctors;
    if (user.role === "Compounder") {
      // assignedDoctors may contain object ids or populated objects; compare as strings
      const assigned = (user.assignedDoctors || []).map((ad) =>
        String(ad?._id || ad?.id || ad)
      );
      return allDoctors.filter((doc) => assigned.includes(String(doc._id)));
    }
    // Doctor (or other single-user roles) should only see themselves
    return allDoctors.filter((doc) => String(doc._id) === String(user?._id));
  })();

  return (
    <section className="messages-container page">
      <div className="messages-body">
        <div className="messages-header">
          <h1>Messages</h1>
          <button
            ref={setupClickSound}
            onClick={() => setShowComposeModal(true)}
            className="btn"
          >
            <FiEdit  title="Compose"/>
            Compose
          </button>
        </div>

        {showComposeModal && (
          <ComposeModal
            onClose={() => setShowComposeModal(false)}
            doctors={allDoctors}
            user={user}
          />
        )}

        <Toolbar>
          <MessageFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearSearch}
            user={user}
            filteredDoctors={filteredDoctors}
          />
          <div className="messages-summary">
            <div className="summary-text">
              Total: {counts.total} | Read: {counts.read} | Unread:{" "}
              {counts.unread}
            </div>
            <BulkActions
              selected={selected}
              onSelectAll={toggleSelectAll}
              onUpdateStatus={updateMessageStatus}
              onDelete={deleteMessages}
              isAllSelected={
                selected.length > 0 && selected.length === messageIdsOnPage.length
              }
            />
          </div>
        </Toolbar>

        {loading ? (
          <div className="loading-state centered">
            <span className="loader" style={{ height: "3rem" }}></span>
            <p>Loading Messages...</p>
          </div>
        ) : messages.length > 0 ? (
          <>
            <MessageList
              messages={messages}
              selected={selected}
              onToggleSelect={toggleSelect}
              onUpdateStatus={updateMessageStatus}
              onDelete={deleteMessages}
              onReply={handleReply}
            />
            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </>
        ) : (
          <div className="empty-state">
            <h3>No Messages Found!</h3>
            <p>Try adjusting your filters or clearing the search.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Messages;
