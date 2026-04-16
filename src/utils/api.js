import axios from "axios";
import { useUser } from "../contexts/UserContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const backendApi = axios.create({
  baseURL: BACKEND_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Generic requests ---
export const getRequest = async (url, params = {}) => {
  const response = await backendApi.get(url, { params });
  return response.data;
};

export const postRequest = async (url, data = {}, params = {}) => {
  const response = await backendApi.post(url, data, { params });
  return response.data;
};

// 🧩 Session Management
let currentSessionId = localStorage.getItem("session_id") || null;
let currentSubject = localStorage.getItem("subject") || null;

// --- Send message to FastAPI backend using username ---
export const sendToGemini = async (input, username, subject = null) => {
  try {
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem("session_id", currentSessionId);
    }

    // Store subject for subsequent messages
    if (subject) {
      currentSubject = subject;
      localStorage.setItem("subject", subject);
    }

    const payload = {
      text: input.text || "",
      image: input.image?.data || null,
      time_taken: input.time_taken || 0, // ⏱️ time tracking
      sender: "user",
      session_id: currentSessionId,
      subject: currentSubject || subject,  // Include subject
    };
console.log(payload)
    if (!username) throw new Error("Username is required");

    const response = await postRequest(`/chat/send/instant/${username}`, payload);
    const botMessage = response.bot_message?.text || "No reply.";

    return {
      candidates: [{ content: { parts: [{ text: botMessage }] } }],
    };
  } catch (error) {
    console.error("❌ Backend call failed:", error);
    throw error;
  }
};


export const resetSession = () => {
  currentSessionId = null;
  currentSubject = null;

  // 🧹 Clean all storage
  localStorage.removeItem("session_id");
  localStorage.removeItem("subject");
  localStorage.removeItem("chatMessages");
  sessionStorage.clear();

  console.log("🔄 Chat session reset successfully");
};

// Allow other modules to explicitly set the current session id
export const setSessionId = (id) => {
  if (!id) return;
  currentSessionId = id;
  try {
    localStorage.setItem("session_id", id);
  } catch (e) {
    // ignore storage errors
  }
};

// Set the current subject
export const setSubject = (subject) => {
  if (!subject) return;
  currentSubject = subject;
  try {
    localStorage.setItem("subject", subject);
  } catch (e) {
    // ignore storage errors
  }
};

export const getSessionId = () => currentSessionId;
export const getSubject = () => currentSubject;

export const sendCheckRequest = async (input, username, subject = null) => {
  try {
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem("session_id", currentSessionId);
    }

    // Store subject for subsequent messages
    if (subject) {
      currentSubject = subject;
      localStorage.setItem("subject", subject);
    }

    const payload = {
      text: input.text || "",
      image: input.image?.data || null,
      time_taken: input.time_taken || 0,
      sender: "user",
      session_id: currentSessionId,
      subject: currentSubject || subject,  // Include subject
    };

    const response = await postRequest(`/chat/send/check/${username}`, payload);
    return response; // expect { bot_message: "...text..." }
  } catch (error) {
    console.error("❌ Check Request failed:", error);
    throw error;
  }
};
