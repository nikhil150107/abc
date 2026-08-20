import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-nav">
        <h2>Dashboard</h2>
        <div className="dashboard-actions">
          <span className="user-info">
            {user ? `${user.username} (${user.role})` : "User"}
          </span>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      <div className="dashboard-content">
        <h1>Welcome {user ? user.username : "User"}! 🎉</h1>
        <p>This is your dashboard. Your hackathon starts here!</p>
        <div className="info-cards">
          <div className="info-card">
            <h3>👤 Profile</h3>
            <p>Username: {user ? user.username : "-"}</p>
            <p>Email: {user ? user.email : "-"}</p>
            <p>Role: {user ? user.role : "-"}</p>
          </div>
          <div className="info-card">
            <h3>✅ Ready</h3>
            <p>Auth setup is complete.</p>
            <p>You can now build your hackathon features.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;