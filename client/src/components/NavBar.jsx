import React from "react";
import { Navbar, Container, Button } from "react-bootstrap";
import { FiLogOut, FiCpu } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function AppNavbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <Navbar className="app-navbar" expand="lg">
      <Container>
        <Navbar.Brand className="navbar-brand-custom">
          <FiCpu className="me-2" />ProBot
        </Navbar.Brand>
        <div className="d-flex align-items-center gap-3">
          {user && <span className="navbar-user">{user.name || user.email}</span>}
          <Button variant="outline-light" size="sm" onClick={handleLogout} className="logout-btn">
            <FiLogOut className="me-1" />Logout
          </Button>
        </div>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;