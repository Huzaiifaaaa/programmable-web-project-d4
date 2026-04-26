import React, { useEffect, useState, useCallback } from "react";
import { Spinner, Modal, Button } from "react-bootstrap";
import { useNavigate, useParams, Routes, Route } from "react-router-dom";
import { FiPlus, FiMessageSquare, FiTrash2, FiCpu, FiLogOut, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { getUserChats, createChat, deleteChat } from "../api/probot";
import { useAuth } from "../context/AuthContext";
import ChatPage from "./ChatPage";

function ChatsPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { chatKey } = useParams();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadChats = useCallback(async () => {
    if (!user?.user_key) return;
    setLoading(true);
    try {
      const res = await getUserChats(user.user_key);
      setChats(res.data?.chats || res.data || []);
    } catch {
      toast.error("Failed to load chats.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadChats(); }, [loadChats]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await createChat();
      const key = res.data.chat.chat_key;
      setChats((prev) => [res.data.chat, ...prev]);
      toast.success("New chat created!");
      navigate(`/chats/${key}`);
    } catch {
      toast.error("Failed to create chat.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChat(deleteTarget.chat_key);
      setChats((prev) => prev.filter((c) => c.chat_key !== deleteTarget.chat_key));
      if (chatKey === deleteTarget.chat_key) navigate("/chats");
      setDeleteTarget(null);
      toast.success("Chat deleted.");
    } catch {
      toast.error("Failed to delete chat.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.chat_key?.toLowerCase().includes(search.toLowerCase()) ||
    new Date(c.created_at).toLocaleDateString().includes(search)
  );

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <FiCpu className="brand-icon" />
            {sidebarOpen && <span>ProBot</span>}
          </div>
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <button className="new-chat-btn" onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner animation="border" size="sm" /> : <><FiPlus className="me-2" />New Chat</>}
            </button>

            <div className="sidebar-search">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="chat-list">
              {loading ? (
                <div className="sidebar-loading"><Spinner animation="border" size="sm" /></div>
              ) : filteredChats.length === 0 ? (
                <p className="sidebar-empty">{search ? "No results" : "No chats yet"}</p>
              ) : (
                filteredChats.map((chat) => (
                  <div
                    key={chat.chat_key}
                    className={`chat-list-item ${chatKey === chat.chat_key ? "active" : ""}`}
                    onClick={() => navigate(`/chats/${chat.chat_key}`)}
                  >
                    <FiMessageSquare className="chat-list-icon" />
                    <div className="chat-list-body">
                      <span className="chat-list-title">Chat {chat.chat_key?.slice(0, 8)}</span>
                      <span className="chat-list-date">
                        {chat.created_at ? new Date(chat.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                      </span>
                    </div>
                    <button
                      className="chat-delete-btn"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(chat); }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <div className="sidebar-footer">
          {sidebarOpen && <span className="sidebar-user">{user?.name || user?.email}</span>}
          <button className="icon-btn logout-icon-btn" onClick={() => { logoutUser(); navigate("/login"); }} title="Logout">
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        <Routes>
          <Route index element={
            <div className="welcome-screen">
              <FiCpu size={56} className="welcome-icon" />
              <h2>Welcome to ProBot</h2>
              <p>Select a chat or start a new conversation</p>
              <button className="new-chat-btn welcome-btn" onClick={handleCreate} disabled={creating}>
                {creating ? <Spinner animation="border" size="sm" /> : <><FiPlus className="me-2" />New Chat</>}
              </button>
            </div>
          } />
          <Route path=":chatKey" element={<ChatPage chats={chats} />} />
        </Routes>
      </main>

      {/* ── Delete modal ── */}
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
    </div>
  );
}

export default ChatsPage;