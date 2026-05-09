import React, { useState, useEffect } from "react";
import "./Calendar.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [events, setEvents] = useState({});
  const [editIndex, setEditIndex] = useState(null);

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    category: ""
  });

  const today = new Date();

  // ✅ FIXED: Timezone-safe date key extractor
  const toLocalDateKey = (rawDate) => {
    if (!rawDate) return "";

    if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return rawDate;
    }

    const d = new Date(rawDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ✅ 1. FETCH EVENTS FROM DATABASE
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/calendar/events`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      const eventMap = {};
      data.forEach((event) => {
        const dateKey = toLocalDateKey(event.date_key);

        if (dateKey) {
          if (!eventMap[dateKey]) {
            eventMap[dateKey] = [];
          }
          eventMap[dateKey].push({
            id: event.id,
            title: event.title,
            description: event.description,
            category: event.category
          });
        }
      });

      setEvents(eventMap);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // ✅ 2. SAVE OR UPDATE EVENT
  const handleSaveEvent = async () => {
    if (!form.title || !selectedDate) return;

    const payload = {
      id: form.id,
      date: selectedDate,
      title: form.title,
      description: form.description,
      category: form.category,
      startTime: null,
      endTime: null
    };

    try {
      const response = await fetch(`${API_URL}/api/calendar/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchEvents();
        resetForm();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Server failed to save the event. ${err.error || ""}`);
      }
    } catch (error) {
      console.error("Error saving to database:", error);
      alert("Network error: Could not connect to the server.");
    }
  };

  // ✅ 3. DELETE EVENT
  const handleDeleteEvent = async (date, index) => {
    const eventToDelete = events[date][index];

    if (!eventToDelete.id) {
      alert("Error: Missing event ID.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(`${API_URL}/api/calendar/event/${eventToDelete.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await fetchEvents();
      } else {
        alert("Failed to delete event from server.");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleEditEvent = (event, index) => {
    setForm({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category
    });
    setEditIndex(index);
  };

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      description: "",
      category: ""
    });
    setEditIndex(null);
    setSelectedDate(null);
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const shift = firstDay === 0 ? 6 : firstDay - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    let daysList = [];
    for (let i = 0; i < shift; i++) daysList.push(null);
    for (let i = 1; i <= totalDays; i++) daysList.push(i);
    return daysList;
  };

  const changeMonth = (type) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (type === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const days = getDays();

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </h2>

        <div className="nav-btns">
          <button onClick={() => changeMonth("prev")}>◀</button>
          <button onClick={() => setCurrentDate(new Date())}>Today</button>
          <button onClick={() => changeMonth("next")}>▶</button>
        </div>
      </div>

      <div className="calendar-days">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const dateKey = `${currentDate.getFullYear()}-${(
            currentDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

          const dayOfWeek = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
          ).getDay();

          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          return (
            <div
              key={index}
              className={`calendar-cell 
                ${isToday(day) ? "today" : ""} 
                ${isWeekend ? "weekend" : ""}`}
              onClick={() => setSelectedDate(dateKey)}
            >
              <div className="date">{day}</div>
              <div className="event-dots">
                {events[dateKey]?.map((e, i) => (
                  <div key={i} className="event-dot">
                    {e.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{editIndex !== null ? "Edit Event" : "Add Event"}</h3>
            <p className="modal-date">{selectedDate}</p>

            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <input
              placeholder="Category (e.g. Holiday, Meeting)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />

            <div className="modal-actions">
              <button className="cancel" onClick={resetForm}>
                Cancel
              </button>
              <button className="save" onClick={handleSaveEvent}>
                {editIndex !== null ? "Update" : "Save"}
              </button>
            </div>

            <div className="modal-event-list">
              {events[selectedDate]?.map((e, i) => (
                <div key={i} className="event-item">
                  <div className="event-info">
                    <strong>{e.title}</strong>
                    <p>{e.description}</p>
                  </div>
                  <div className="event-btns">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditEvent(e, i)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteEvent(selectedDate, i)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;