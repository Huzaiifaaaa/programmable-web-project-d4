import React, { useState } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FiUserPlus, FiCpu } from "react-icons/fi";
import { signup } from "../api/probot";

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/login?registered=1");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Registration failed.");
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
          <p>Create your account</p>
        </div>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        <Form onSubmit={handleSubmit} className="auth-form">
          <Form.Group className="mb-3">
            <Form.Label>Full name</Form.Label>
            <Form.Control type="text" placeholder="Alice Smith" value={name}
              onChange={(e) => setName(e.target.value)} required className="auth-input" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email address</Form.Label>
            <Form.Control type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required className="auth-input" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" placeholder="Min. 6 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required className="auth-input" />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Confirm password</Form.Label>
            <Form.Control type="password" placeholder="Repeat your password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required className="auth-input" />
          </Form.Group>
          <Button type="submit" className="auth-btn w-100" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FiUserPlus className="me-2" />}
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </Form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}

export default SignupPage;