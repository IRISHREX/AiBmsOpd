import React, { useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import api from "../utils/api";
import {
  playSaveSound,
  playLoadSound,
  playDeleteSound,
} from "../utils/soundUtils";
import "./Settings.css";
import { MdOutlineEdit } from "react-icons/md";

import { RiDeleteBin6Line } from "react-icons/ri";
import { IoSearch } from "react-icons/io5";


const InvoiceSettings = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    patient: "",
    doctor: "",
    appointment: "",
    status: "",
    start: "",
    end: "",
  });
  const [form, setForm] = useState({
    invoiceNumber: "",
    patient: "",
    appointment: "",
    doctor: "",
    items: [],
    tax: 0,
    discount: 0,
    dueDate: "",
    status: "Unpaid",
    notes: "",
  });
  const [editing, setEditing] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [dashboardUser, setDashboardUser] = useState(null);
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const fetchInvoices = async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        page: opts.page || page,
        limit: opts.limit || limit,
        q: query,
        ...filters,
      };
      const { data } = await api.get("/api/v1/invoice", { params });
      setInvoices(data.invoices || []);
      setTotal(data.total || (data.invoices || []).length);
    } catch (e) {
      alert("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: userRes } = await api.get("/api/v1/user/dashboard/me");
        setDashboardUser(userRes.user);
      } catch (e) {
        setDashboardUser(null);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/v1/user/doctors");
        let allDoctors = data.doctors || [];
        if (dashboardUser) {
          if (dashboardUser.role === "Doctor") {
            allDoctors = allDoctors.filter(
              (doc) => doc._id === dashboardUser._id
            );
            setFilters((f) => ({ ...f, doctor: dashboardUser._id }));
          } else if (dashboardUser.role === "Compounder") {
            const assigned = (dashboardUser.assignedDoctors || []).map((d) =>
              String(d?._id || d?.id || d)
            );
            allDoctors = allDoctors.filter((doc) =>
              assigned.includes(String(doc._id))
            );
            if (allDoctors.length > 0)
              setFilters((f) => ({ ...f, doctor: allDoctors[0]._id }));
          }
        }
        setDoctors(allDoctors);
      } catch (e) {
        setDoctors([]);
      }
    })();
  }, [dashboardUser]);

  useEffect(() => {
    fetchInvoices({ page: 1 });
  }, [filters.doctor, filters.status, filters.start, filters.end]);

  const statusBadgeClass = (status) => {
    if (!status) return "badge-status badge-unpaid";
    if (status === "Paid") return "badge-status badge-paid";
    if (status === "Partial") return "badge-status badge-partial";
    if (status === "Cancelled") return "badge-status badge-cancelled";
    return "badge-status badge-unpaid";
  };

  const handleSearch = async () => {
    setPage(1);
    fetchInvoices({ page: 1 });
  };

  const handleOpenCreateInvoice = () => {
    setEditing(null);
    setForm({
      invoiceNumber: "",
      patient: "",
      appointment: "",
      doctor: "",
      items: [],
      tax: 0,
      discount: 0,
      dueDate: "",
      status: "Unpaid",
      notes: "",
    });
    setInvoiceModalOpen(true);
  };

  const handleCreateOrUpdate = async () => {
    try {
      const payload = {
        ...form,
        tax: Number(form.tax || 0),
        discount: Number(form.discount || 0),
      };
      const computedSubtotal = (payload.items || []).reduce(
        (s, it) =>
          s +
          (Number(it.total) ||
            Number(it.quantity || 0) * Number(it.unitPrice || 0)),
        0
      );
      payload.subtotal = computedSubtotal;
      payload.total = Math.max(
        0,
        computedSubtotal +
          Number(payload.tax || 0) -
          Number(payload.discount || 0)
      );
      if (editing) {
        const { data } = await api.put(`/api/v1/invoice/${editing}`, payload);
        playSaveSound();
        setInvoices((prev) =>
          prev.map((i) => (i._id === data.invoice._id ? data.invoice : i))
        );
        setEditing(null);
        alert("Invoice updated");
      } else {
        const { data } = await api.post("/api/v1/invoice", payload);
        playSaveSound();
        setInvoices((prev) => [data.invoice, ...prev]);
        alert("Invoice created");
      }
      setForm({
        invoiceNumber: "",
        patient: "",
        appointment: "",
        doctor: "",
        items: [],
        tax: 0,
        discount: 0,
        dueDate: "",
        status: "Unpaid",
        notes: "",
      });
      setInvoiceModalOpen(false);
    } catch (e) {
      alert("Failed to save invoice");
    }
  };

  const handleEdit = (inv) => {
    setEditing(inv._id || inv.id);
    const items = (inv.items || []).map((it) => ({
      description: it.description || "",
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || it.price || 0),
      total: Number(
        it.total != null
          ? it.total
          : Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0)
      ),
      _id: it._id || String(Math.random()).slice(2),
    }));
    setForm({
      invoiceNumber: inv.invoiceNumber || "",
      patient: inv.patient?._id || inv.patient || "",
      appointment: inv.appointment?._id || inv.appointment || "",
      doctor: inv.doctor?._id || inv.doctor || "",
      items,
      tax: inv.tax || 0,
      discount: inv.discount || 0,
      dueDate: inv.dueDate || "",
      status: inv.status || "Unpaid",
    });
    setInvoiceModalOpen(true);
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...(f.items || []),
        {
          description: "New Item",
          quantity: 1,
          unitPrice: 0,
          total: 0,
          _id: String(Date.now()),
        },
      ],
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((f) => {
      const items = (f.items || []).map((it, i) => {
        if (i !== index) return it;
        const updated = { ...it };
        if (field === "description") updated.description = value;
        else if (field === "quantity") updated.quantity = Number(value || 0);
        else if (field === "unitPrice") updated.unitPrice = Number(value || 0);
        if (field === "quantity" || field === "unitPrice") {
          updated.total =
            Number(updated.quantity || 0) * Number(updated.unitPrice || 0);
        }
        return updated;
      });
      return { ...f, items };
    });
  };

  const removeItem = (index) => {
    setForm((f) => ({
      ...f,
      items: (f.items || []).filter((_, i) => i !== index),
    }));
  };

  const computedSubtotal = useMemo(() => {
    return (form.items || []).reduce(
      (s, it) =>
        s +
        (Number(it.total) ||
          Number(it.quantity || 0) * Number(it.unitPrice || 0)),
      0
    );
  }, [form.items]);

  const computedTotal = useMemo(
    () =>
      Math.max(
        0,
        computedSubtotal + Number(form.tax || 0) - Number(form.discount || 0)
      ),
    [computedSubtotal, form.tax, form.discount]
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Delete invoice?")) return;
    try {
      await api.delete(`/api/v1/invoice/${id}`);
      playDeleteSound();
      setInvoices((prev) => prev.filter((i) => i._id !== id && i.id !== id));
      alert("Deleted");
    } catch (e) {
      alert("Delete failed");
    }
  };

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    background: "#fff",
    padding: 16,
    borderRadius: 8,
    width: "90%",
    maxWidth: 900,
    maxHeight: "90vh",
    overflowY: "auto",
  };

  return (
    <section className="page">
      <div className="medicine-page-header">
        <div className="header-title-group">
          <h2>Invoice Settings</h2>
          <p style={{ margin: 0 }}>
            Manage invoices: create, search, edit, delete and view stats.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenCreateInvoice}>
            <FaPlus style={{ marginRight: "8px" }} />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: "1rem" }}>
        <div className="filter-group">
          <label>Search by Keyword</label>
          <input
            className="invoice-input"
            placeholder="Invoice #, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Patient ID</label>
          <input
            className="invoice-input"
            placeholder="Patient ID..."
            value={filters.patient}
            onChange={(e) =>
              setFilters({ ...filters, patient: e.target.value })
            }
          />
        </div>
        <div className="filter-box">
          <select
            value={filters.doctor}
            onChange={(e) =>
              setFilters((f) => ({ ...f, doctor: e.target.value }))
            }
            disabled={dashboardUser && dashboardUser.role === "Doctor"}
          >
            {dashboardUser && dashboardUser.role === "Admin" && (
              <option value="">All</option>
            )}
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.firstName} {d.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <button className="btn-cls" onClick={handleSearch}>
            {/* Search */}
            <IoSearch/>
          </button>
        </div>
      </div>
      <div
        className="invoice-list-wrap"
        // style={{
        //   maxHeight: "60vh",
        //   overflowY: "auto",
        //   border: "1px solid #eee",
        //   padding: 8,
        // }}
      >
        {loading ? (
          <div>Loading...</div>
        ) : (
          invoices.map((inv) => {
            const paid = (inv.payments || []).reduce(
              (s, p) => s + (Number(p.amount || p) || 0),
              0
            );
            const due = (Number(inv.total) || 0) - paid;
            return (
              <div
                className="invoice-card-item"
                key={inv._id || inv.id}
                // style={{
                //   borderBottom: "1px solid #f0f0f0",
                //   padding: 8,
                //   display: "flex",
                //   justifyContent: "space-between",
                //   alignItems: "center",
                // }}
              >
                <div>
                  <div
                    className="invoice-title-div"
                    // style={{
                    //   fontWeight: 700,
                    //   display: "flex",
                    //   gap: 8,
                    //   alignItems: "center",
                    // }}
                  >
                    <span className="invoice-numb">{inv.invoiceNumber}</span>
                    <span className={statusBadgeClass(inv.status)}>
                      {inv.status || "Unpaid"}
                    </span>
                  </div>
                  <div className="invoice-info">
                    Patient: {inv.patient?._id || inv.patient}
                  </div>
                  <div className="invoice-info">
                    Amount: {inv.total} • Paid: {paid} • Due: {due}
                  </div>
                </div>
                <div
                  className="btn-icn-container"
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <button
                    className="icn-btn"
                    onClick={() => handleEdit(inv)}
                    title="Edit"
                    aria-label={`Edit invoice ${
                      inv.invoiceNumber || inv._id || ""
                    }`}
                  >
                    <MdOutlineEdit />
                  </button>
                  <button
                    className="icn-btn"
                    onClick={() => handleDelete(inv._id || inv.id)}
                    title="Delete"
                    aria-label={`Delete invoice ${
                      inv.invoiceNumber || inv._id || ""
                    }`}
                  >
                    {/* <FaTrash /> */}
                    <RiDeleteBin6Line />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {invoiceModalOpen && (
        <div
          style={modalOverlayStyle}
          onClick={() => setInvoiceModalOpen(false)}
        >
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Edit Invoice" : "Create Invoice"}</h3>
            <div style={{ display: "grid" }}>
              <input
                className="invoice-input"
                placeholder="Invoice Number"
                value={form.invoiceNumber}
                onChange={(e) =>
                  setForm({ ...form, invoiceNumber: e.target.value })
                }
              />
              <input
                className="invoice-input"
                placeholder="Patient ID"
                value={form.patient}
                onChange={(e) => setForm({ ...form, patient: e.target.value })}
              />
              <input
                className="invoice-input"
                placeholder="Appointment ID (optional)"
                value={form.appointment}
                onChange={(e) =>
                  setForm({ ...form, appointment: e.target.value })
                }
              />
              <input
                className="invoice-input"
                placeholder="Doctor ID (optional)"
                value={form.doctor}
                onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              />
              <div className="invoice-form-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>Items</div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      onClick={() => setItemsModalOpen(true)}
                      className="btn btn-ghost btn-small"
                    >
                      Open Items
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 8, color: "#666" }}>
                  {(form.items || []).length} item(s) • Click "Open Items" to
                  edit details
                </div>
              </div>
              <input
                className="invoice-input"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 100px 100px",
                  gap: 8,
                  width: "100%",
                }}
              >
                <input
                  className="invoice-input"
                  placeholder="Due Date"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
                <input
                  className="invoice-input"
                  placeholder="Tax"
                  value={form.tax}
                  onChange={(e) =>
                    setForm({ ...form, tax: Number(e.target.value) })
                  }
                />
                <input
                  className="invoice-input"
                  placeholder="Discount"
                  value={form.discount}
                  onChange={(e) =>
                    setForm({ ...form, discount: Number(e.target.value) })
                  }
                />
              </div>
              <label style={{ marginTop: 6 }}>
                Status:
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <div className="invoice-summary">
                  <div>
                    Subtotal: <strong>{computedSubtotal.toFixed(2)}</strong>
                  </div>
                  <div className="muted">
                    Tax: <strong>{Number(form.tax || 0).toFixed(2)}</strong> •
                    Discount:{" "}
                    <strong>{Number(form.discount || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 16 }}>
                    Total: <strong>{computedTotal.toFixed(2)}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateOrUpdate}
                  >
                    {editing ? "Update" : "Create"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setInvoiceModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {itemsModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setItemsModalOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Invoice Items</h3>
              <div>
                <button
                  className="btn btn-ghost"
                  onClick={() => setItemsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-primary btn-small" onClick={addItem}>
                + Add Item
              </button>
            </div>
            <table
              className="invoice-items-table"
              style={{ width: "100%", marginBottom: 8 }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <th style={{ padding: "1rem" }}>Description</th>
                  <th style={{ padding: "1rem", width: 80 }}>Qty</th>
                  <th style={{ padding: "1rem", width: 120 }}>Unit Price</th>
                  <th style={{ padding: "1rem", width: 120 }}>Total</th>
                  <th style={{ padding: "1rem", width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {(form.items || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: 8, textAlign: "center", color: "#666" }}
                    >
                      No items added
                    </td>
                  </tr>
                )}
                {(form.items || []).map((it, idx) => (
                  <tr key={it._id || idx}>
                    <td style={{ padding: 6 }}>
                      <input
                        className="invoice-input"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(idx, "description", e.target.value)
                        }
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        className="invoice-input small-number"
                        type="number"
                        min={0}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", e.target.value)
                        }
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        className="invoice-input small-number"
                        type="number"
                        min={0}
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", e.target.value)
                        }
                      />
                    </td>
                    <td style={{ padding: 6, textAlign: "right" }}>
                      {(Number(it.total) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 6 }}>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => removeItem(idx)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setItemsModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default InvoiceSettings;
