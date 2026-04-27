import React from 'react';

const Placeholder = () => {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      background: '#fff', 
      borderRadius: '12px',
      marginTop: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#6366f1' }}>Module Under Development</h2>
      <p style={{ color: '#64748b' }}>
        The frontend is ready. We are currently building the 
        <strong> Node.js & MySQL backend</strong> for this section.
      </p>
    </div>
  );
};

export default Placeholder;