import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "https://pwpapi.cloverta.top/api/v1";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const signup = (name, email, password) =>
  api.post("/signup/", { name, email, password });

export const login = (email, password) =>
  api.post("/login/", { email, password });

export const createChat = () => api.post("/chats/", {});

export const getUserChats = (userKey) =>
  api.get(`/users/${userKey}/chats/`);

export const deleteChat = (chatKey) =>
  api.delete(`/chats/${chatKey}/`);

export const getMessages = (chatKey) =>
  api.get(`/chats/${chatKey}/messages/`);

export const sendMessage = (chatKey, message, modelKey) =>
  api.post(`/chats/${chatKey}/messages/`, {
    message,
    ...(modelKey && { model_key: modelKey }),
  });

export default api;