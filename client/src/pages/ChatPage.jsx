import React, { useEffect, useState, useRef, useCallback } from "react";
import { Form, Button, Spinner, Alert } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { FiSend, FiCpu, FiUser, FiCopy, FiCheck } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";
import { getMessages, sendMessage } from "../api/probot";

const MODEL_OPTIONS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
];

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy."); }
  };
  return (
    <button className="copy-btn" onClick={handleCopy} title="Copy">
      {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
    </button>
  );
}

function ChatPage() {
  const { chatKey } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gemini-3-flash-preview");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setMessages([]);
    try {
      const res = await getMessages(chatKey);
      const conversations = res.data?.messages || [];
      const expanded = conversations.flatMap((conv) => [
        { role: "user", content: conv.request, id: `${conv.conversation_id}-req`, timestamp: conv.created_at },
        { role: "assistant", content: conv.response, id: `${conv.conversation_id}-res`, timestamp: conv.created_at },
      ]);
      setMessages(expanded);
    } catch {
      setError("Failed to load messages.");
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
    const now = new Date().toISOString();
    const userMsg = { role: "user", content: text, id: Date.now(), timestamp: now };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await sendMessage(chatKey, text, model);
      const conv = res.data.conversation;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: conv.response || "",
        id: Date.now() + 1,
        timestamp: conv.created_at,
      }]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      const status = err.response?.status;
      const msg =
        status === 401 ? "Session expired. Please log in again." :
        status === 429 ? "Rate limit reached. Please wait a moment." :
        err.response?.data?.message || "Failed to send message.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) handleSend(e);
  };

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-view-header">
        <div className="chat-view-title">
          <FiCpu className="me-2" />Chat {chatKey?.slice(0, 8)}
        </div>
        <Form.Select className="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
          {MODEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </Form.Select>
      </div>

      {/* Messages */}
      <div className="messages-area">
        {loading ? (
          <div className="loading-state"><Spinner animation="border" /><p>Loading...</p></div>
        ) : messages.length === 0 ? (
          <div className="empty-chat-state">
            <FiCpu size={48} /><h4>Start the conversation</h4>
            <p>Send a message to begin chatting with ProBot</p>
          </div>
        ) : (
          <div className="messages-inner">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`message-row ${msg.role === "user" ? "user-row" : "ai-row"}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? <FiUser /> : <FiCpu />}
                </div>
                <div className="message-col">
                  <div className={`message-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>
                    {msg.role === "assistant"
                      ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                      : msg.content}
                  </div>
                  <div className={`message-meta ${msg.role === "user" ? "meta-right" : "meta-left"}`}>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                    <CopyButton text={msg.content} />
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="message-row ai-row">
                <div className="message-avatar"><FiCpu /></div>
                <div className="message-bubble ai-bubble typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && (
              <Alert variant="danger" className="mx-3 mt-2" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-bar">
        <div className="input-inner">
          <Form onSubmit={handleSend} className="input-form">
            <Form.Control
              className="message-input"
              as="textarea"
              rows={1}
              placeholder="Message ProBot... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || loading}
              autoFocus
            />
            <Button type="submit" className="send-btn" disabled={sending || !input.trim()}>
              {sending ? <Spinner animation="border" size="sm" /> : <FiSend />}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;