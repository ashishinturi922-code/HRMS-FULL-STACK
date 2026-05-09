// src/apiConfig.js

// This will automatically use your .env file, or default to localhost if the .env fails.
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default API_URL;