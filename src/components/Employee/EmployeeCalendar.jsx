import React, { useState, useEffect } from "react";
import API_URL from "../../apiConfig"; // ✅ FIX: Imported the working API config

const EmployeeCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({}); // Structured as { "YYYY-MM-DD": [events] }
  const [selectedDate, setSelectedDate] = useState(null);

  // 🔔 NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  const today = new Date();

  // ✅ FETCH EVENTS FROM DATABASE
  const fetchEvents = async () => {
    try {
      // ✅ FIX: Replaced broken process.env with API_URL
      const response = await fetch(`${API_URL}/api/employee/calendar`);
      const data = await response.json();

      if (response.ok) {
        // Transform flat array from database into the { "dateKey": [] } format
        const formattedEvents = data.reduce((acc, event) => {
          // ✅ FIX: Parse the date into a real Date object to prevent timezone shifting (the 1-day bug)
          const d = new Date(event.date_key || event.date);
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          
          if (!acc[dateKey]) acc[dateKey] = [];
          
          acc[dateKey].push({
            title: event.title,
            description: event.description,
            category: event.category || "General"
            // ✅ Time fields have been omitted here
          });
          
          return acc;
        }, {});

        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 🔔 TODAY'S NOTIFICATIONS
  useEffect(() => {
    // ✅ FIX: Use local time for 'today' to prevent timezone shift bugs
    const todayObj = new Date();
    const todayKey = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
    
    setNotifications(events[todayKey] || []);
  }, [events]);

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

    let days = [];
    for (let i = 0; i < shift; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };

  const changeMonth = (type) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (type === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const days = getDays();

  return (
    <div className="calendar-container">
      {/* HEADER */}
      <div className="calendar-header">
        <h2>
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </h2>

        {/* 🔔 NOTIFICATION ICON */}
        <div className="notif-container">
          <button className="notif-btn" onClick={() => setShowNotif(!showNotif)}>
            🔔
            {notifications.length > 0 && (
              <span className="notif-badge">{notifications.length}</span>
            )}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <h4>Today’s Events</h4>
              {notifications.length > 0 ? (
                notifications.map((n, i) => (
                  <div key={i} className="notif-item">
                    <strong>{n.title}</strong>
                    {/* ✅ Time removed from dropdown */}
                  </div>
                ))
              ) : (
                <p>No events today</p>
              )}
            </div>
          )}
        </div>

        <div className="nav-btns">
          <button onClick={() => changeMonth("prev")}>◀</button>
          <button onClick={() => setCurrentDate(new Date())}>Today</button>
          <button onClick={() => changeMonth("next")}>▶</button>
        </div>
      </div>

      {/* DAYS */}
      <div className="calendar-days">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* GRID */}
      <div className="calendar-grid">
        {days.map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
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
              {events[dateKey]?.map((e, i) => (
                <div key={i} className="event">
                  {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Events</h3>
            <p>
              {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            {events[selectedDate]?.length > 0 ? (
              events[selectedDate].map((e, i) => (
                <div key={i} className="event-item">
                  <strong>{e.title}</strong>
                  <p>{e.description}</p>
                  {/* ✅ Time removed from modal */}
                  <small>{e.category}</small>
                </div>
              ))
            ) : (
              <p>No events for this date</p>
            )}

            <div className="modal-actions">
              <button onClick={() => setSelectedDate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendar;