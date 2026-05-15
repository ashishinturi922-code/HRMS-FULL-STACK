// ============================================
// pages/Signup.tsx
// ============================================

import React, { useState } from "react";

import { useNavigate } from "react-router-dom";

import "../styles/Signup.css";

import {
  registerUser,
} from "../services/authService";

const Signup = () => {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    client: "",
    password: "",
    role: "user",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >
  ) => {

    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });

  };

  const handleSignup = () => {

    registerUser(form);

    alert("Signup Successful");

    navigate("/");

  };

  return (

    <div className="signup-page">

      <div className="glass-card">

        <h1>Create Account</h1>

        <p className="subtitle">
          Register Employee
        </p>

        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
        />

        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          onChange={handleChange}
        />

        <select
          name="client"
          onChange={handleChange}
        >

          <option>
            Select Client
          </option>

          <option>
            Infosys
          </option>

          <option>
            TCS
          </option>

          <option>
            IBM
          </option>

          <option>
            Accenture
          </option>

          <option>
            Wipro
          </option>

        </select>

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
        />

        <button onClick={handleSignup}>
          Signup
        </button>

        <p className="bottom-text">
          Already have account?
          <span
            onClick={() =>
              navigate("/")
            }
          >
            Login
          </span>
        </p>

      </div>

    </div>

  );

};

export default Signup;