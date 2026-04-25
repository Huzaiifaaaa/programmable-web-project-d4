import React, { useEffect, useState, useRef, useCallback } from "react";
import { Container, Form, Button, Spinner, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { FiSend, FiArrowLeft, FiCpu, FiUser } from "react-icons/fi";
import { getMessages, sendMessage } from "../api/probot";
import AppNavbar from "../components/NavBar";

const MODEL_OPTIONS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
];

function ChatPage() {
  const { chatKey } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gemini-3-flash-preview");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMessages(chatKey);
      setMessages(res.data?.messages || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [chatKey]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { role: "user", content: text, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await sendMessage(chatKey, text, model);
      const reply = res.data;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: reply.response || reply.content || reply.message || "",
        id: Date.now() + 1,
      }]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      const status = err.response?.status;
      setError(
        status === 401 ? "Session expired. Please log in again." :
        status === 429 ? "Rate limit reached. Please wait a moment." :
        err.response?.data?.message || "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <AppNavbar />
      <div className="chat-page">
        <div className="chat-page-header">
          <button className="back-btn" onClick={() => navigate("/chats")}><FiArrowLeft /></button>
          <div className="chat-page-title"><FiCpu className="me-2" />Chat {chatKey?.slice(0, 8)}</div>
          <Form.Select className="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
            {MODEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Form.Select>
        </div>
        <Container className="messages-container">
          {loading ? (
            <div className="loading-state"><Spinner animation="border" /><p>Loading messages...</p></div>
          ) : messages.length === 0 ? (
            <div className="empty-chat-state"><FiCpu size={48} /><h4>Start the conversation</h4><p>Send a message to begin chatting with ProBot</p></div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`message-row ${msg.role === "user" ? "user-row" : "ai-row"}`}>
                <div className="message-avatar">{msg.role === "user" ? <FiUser /> : <FiCpu />}</div>
                <div className={`message-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>{msg.content}</div>
              </div>
            ))
          )}
          {sending && (
            <div className="message-row ai-row">
              <div className="message-avatar"><FiCpu /></div>
              <div className="message-bubble ai-bubble typing-indicator"><span /><span /><span /></div>
            </div>
          )}
          {error && <Alert variant="danger" className="mt-3" dismissible onClose={() => setError(null)}>{error}</Alert>}
          <div ref={bottomRef} />
        </Container>
        <div className="input-bar">
          <Container>
            <Form onSubmit={handleSend} className="input-form">
              <Form.Control className="message-input" type="text" placeholder="Type a message..."
                value={input} onChange={(e) => setInput(e.target.value)} disabled={sending || loading} autoFocus />
              <Button type="submit" className="send-btn" disabled={sending || !input.trim()}>
                {sending ? <Spinner animation="border" size="sm" /> : <FiSend />}
              </Button>
            </Form>
          </Container>
        </div>
      </div>
    </>
  );
}

export default ChatPage;