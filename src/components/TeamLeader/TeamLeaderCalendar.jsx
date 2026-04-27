import React, { useState, useEffect } from "react";

const TeamLeaderCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔔 NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  const today = new Date();

  // ✅ LOAD EVENTS FROM DATABASE (With Array Safety Check)
  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://192.168.0.165:5000/api/teamleader/calendar-events");
      
      // Safety check for non-200 responses (like 404 or 500)
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      // Convert the array from database to the { "YYYY-MM-DD": [...] } format
      const eventMap = {};

      // ✅ CRITICAL FIX: Ensure 'data' is actually an array before calling forEach
      if (Array.isArray(data)) {
        data.forEach((event) => {
          // Normalizing date format (handling ISO strings if necessary)
          const dateKey = event.date_key ? event.date_key.split('T')[0] : null;
          
          if (dateKey) {
            if (!eventMap[dateKey]) {
              eventMap[dateKey] = [];
            }
            eventMap[dateKey].push({
              title: event.title,
              description: event.description,
              startTime: event.start_time,
              endTime: event.end_time,
              category: event.category || "General",
            });
          }
        });
      } else {
        console.warn("Expected an array of events but received:", data);
      }

      setEvents(eventMap);
    } catch (error) {
      console.error("Error fetching events from DB:", error);
      // Fallback to empty object to prevent crash
      setEvents({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  // 🔔 TODAY EVENTS
  useEffect(() => {
    const todayKey = new Date().toISOString().split("T")[0];
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
    // Adjusting for Monday start
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
        <div className="header-title">
          <h2>
            {currentDate.toLocaleString("default", { month: "long" })}{" "}
            {currentDate.getFullYear()}
          </h2>
        </div>

        {/* 🔔 NOTIFICATION ICON */}
        <div className="notif-container">
          <button
            className="notif-btn"
            onClick={() => setShowNotif(!showNotif)}
          >
            🔔
            {notifications.length > 0 && (
              <span className="notif-badge">{notifications.length}</span>
            )}
          </button>

          {/* 🔽 DROPDOWN */}
          {showNotif && (
            <div className="notif-dropdown">
              <h4>Today’s Events</h4>
              {notifications.length > 0 ? (
                notifications.map((n, i) => (
                  <div key={i} className="notif-item">
                    <strong>{n.title}</strong>
                    <p>{n.startTime} - {n.endTime}</p>
                  </div>
                ))
              ) : (
                <p>No events today</p>
              )}
            </div>
          )}
        </div>

        {/* NAV BUTTONS */}
        <div className="nav-btns">
          <button onClick={() => changeMonth("prev")}>◀</button>
          <button onClick={() => setCurrentDate(new Date())}>Today</button>
          <button onClick={() => changeMonth("next")}>▶</button>
        </div>
      </div>

      {/* DAYS */}
      <div className="calendar-days">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="day-name">{d}</div>
        ))}
      </div>

      {/* GRID */}
      <div className="calendar-grid">
        {loading ? (
          <div className="loading-spinner">Loading DB Events...</div>
        ) : (
          days.map((day, index) => {
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
                  {events[dateKey]?.slice(0, 3).map((e, i) => (
                    <div key={i} className={`event-dot ${e.category?.toLowerCase()}`} title={e.title}>
                      {e.title}
                    </div>
                  ))}
                  {events[dateKey]?.length > 3 && (
                    <div className="more-events">+{events[dateKey].length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Events Overview</h3>
              <p className="selected-date-text">{selectedDate}</p>
            </div>

            <div className="modal-body">
              {events[selectedDate]?.length > 0 ? (
                events[selectedDate].map((e, i) => (
                  <div key={i} className={`event-item border-${e.category?.toLowerCase()}`}>
                    <div className="event-info">
                      <span className={`category-badge ${e.category?.toLowerCase()}`}>
                        {e.category}
                      </span>
                      <strong>{e.title}</strong>
                      <p className="desc">{e.description || "No description provided."}</p>
                    </div>
                    <div className="event-time">
                      🕒 {e.startTime?.slice(0, 5)} - {e.endTime?.slice(0, 5)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-events">
                  <p>No events scheduled for this day.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="close-btn" onClick={() => setSelectedDate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderCalendar;