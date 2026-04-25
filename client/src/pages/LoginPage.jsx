import React, { useState } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FiLogIn, FiCpu } from "react-icons/fi";
import { login } from "../api/probot";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      const { token, user } = res.data;
      loginUser(token, user);
      navigate("/chats");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <FiCpu size={36} />
          <h1>ProBot</h1>
          <p>AI-powered conversation assistant</p>
        </div>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        <Form onSubmit={handleSubmit} className="auth-form">
          <Form.Group className="mb-3">
            <Form.Label>Email address</Form.Label>
            <Form.Control type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required className="auth-input" />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" placeholder="Your password" value={password}
              onChange={(e) => setPassword(e.target.value)} required className="auth-input" />
          </Form.Group>
          <Button type="submit" className="auth-btn w-100" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FiLogIn className="me-2" />}
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Form>
        <p className="auth-switch">Don't have an account? <Link to="/signup">Create one</Link></p>
      </div>
    </div>
  );
}

export default LoginPage;