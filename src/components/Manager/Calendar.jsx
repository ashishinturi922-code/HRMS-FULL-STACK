import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; // Using axios for consistency with your other components
import "./Calendar.css";

const ManagerCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);

  const today = new Date();

  // ✅ LOAD EVENTS FROM BACKEND DATABASE
  const fetchCalendarEvents = useCallback(async () => {
    try {
      const response = await axios.get('http://192.168.0.165:5000/api/manager/calendar');
      const data = response.data;

      // Transform the database array into a date-keyed object for the grid
      const eventMap = {};
      data.forEach(event => {
        const rawDate = event.date_key || event.event_date;
        if (!rawDate) return;
        
        const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate; 
        
        if (!eventMap[dateKey]) {
          eventMap[dateKey] = [];
        }
        
        eventMap[dateKey].push({
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.start_time,
          endTime: event.end_time,
          category: event.category
        });
      });

      setEvents(eventMap);
    } catch (error) {
      console.error("Error loading calendar events:", error);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchCalendarEvents, 120000);
    return () => clearInterval(interval);
  }, [fetchCalendarEvents]);

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
    // Adjusting shift for Monday start
    const shift = firstDay === 0 ? 6 : firstDay - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();

    let daysArr = [];
    for (let i = 0; i < shift; i++) daysArr.push(null);
    for (let i = 1; i <= totalDays; i++) daysArr.push(i);

    return daysArr;
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

        <div className="nav-btns">
          <button onClick={() => changeMonth("prev")}>◀</button>
          <button onClick={() => setCurrentDate(new Date())}>Today</button>
          <button onClick={() => changeMonth("next")}>▶</button>
        </div>
      </div>

      {/* DAYS OF THE WEEK */}
      <div className="calendar-days">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="calendar-grid">
        {days.map((day, index) => {
          if (!day) return <div key={index} className="empty"></div>;

          const dateKey = `${currentDate.getFullYear()}-${(
            currentDate.getMonth() + 1
          ).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

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

              <div className="event-list-wrapper">
                {events[dateKey]?.slice(0, 2).map((e, i) => (
                  <div key={i} className={`event-badge ${e.category?.toLowerCase() || 'default'}`}>
                    {e.title}
                  </div>
                ))}
                {events[dateKey]?.length > 2 && (
                  <div className="more-events">+{events[dateKey].length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW-ONLY MODAL */}
      {selectedDate && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Events for {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
              <button className="close-x" onClick={() => setSelectedDate(null)}>&times;</button>
            </div>

            <div className="modal-body">
              {events[selectedDate]?.length > 0 ? (
                events[selectedDate].map((e, i) => (
                  <div key={i} className="event-detail-item">
                    <div className={`category-tag ${e.category?.toLowerCase() || 'event'}`}>{e.category || 'General'}</div>
                    <strong>{e.title}</strong>
                    <p className="desc">{e.description || 'No description provided.'}</p>
                    <p className="time">🕒 {e.startTime} - {e.endTime}</p>
                  </div>
                ))
              ) : (
                <p className="no-events">No events scheduled for this date.</p>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setSelectedDate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerCalendar;