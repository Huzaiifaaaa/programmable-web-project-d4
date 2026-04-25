import React, { useEffect, useState, useCallback } from "react";
import { Container, Button, Alert, Spinner, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiMessageSquare, FiTrash2, FiChevronRight, FiInbox } from "react-icons/fi";
import { getUserChats, createChat, deleteChat } from "../api/probot";
import { useAuth } from "../context/AuthContext";
import AppNavbar from "../components/NavBar";

function ChatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadChats = useCallback(async () => {
    if (!user?.user_key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getUserChats(user.user_key);
      setChats(res.data?.chats || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chats.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadChats(); }, [loadChats]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createChat();
      navigate(`/chats/${res.data.chat.chat_key}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create chat.");
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChat(deleteTarget.chat_key);
      setChats((prev) => prev.filter((c) => c.key !== deleteTarget.chat_key));
      setDeleteTarget(null);
      loadChats();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete chat.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AppNavbar />
      <Container className="chats-container">
        <div className="chats-header">
          <div>
            <h2 className="chats-title">Your Chats</h2>
            <p className="chats-subtitle">{chats.length} conversation{chats.length !== 1 ? "s" : ""}</p>
          </div>
          <Button className="new-chat-btn" onClick={handleCreate} disabled={creating}>
            {creating ? <Spinner animation="border" size="sm" /> : <><FiPlus className="me-2" />New Chat</>}
          </Button>
        </div>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {loading ? (
          <div className="loading-state"><Spinner animation="border" /><p>Loading chats...</p></div>
        ) : chats.length === 0 ? (
          <div className="empty-state">
            <FiInbox size={48} /><h4>No chats yet</h4><p>Start a new conversation with ProBot</p>
            <Button className="new-chat-btn" onClick={handleCreate}><FiPlus className="me-2" />New Chat</Button>
          </div>
        ) : (
          <div className="chat-list">
            {chats.map((chat) => (
              <div key={chat.key} className="chat-item" onClick={() => navigate(`/chats/${chat.key}`)}>
                <div className="chat-item-icon"><FiMessageSquare /></div>
                <div className="chat-item-body">
                  <span className="chat-item-title">Chat {chat.chat_key?.slice(0, 8)}</span>
                  <span className="chat-item-meta">{chat.created_at ? new Date(chat.created_at).toLocaleDateString() : "No date"}</span>
                </div>
                <div className="chat-item-actions">
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteTarget(chat); }} title="Delete chat">
                    <FiTrash2 />
                  </button>
                  <FiChevronRight className="chevron" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton><Modal.Title>Delete Chat</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete this chat? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner animation="border" size="sm" /> : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ChatsPage;