const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Contest request failed");
  }

  return res.json();
}

export async function getContestQuestions(count = 5) {
  const res = await fetch(`${API_URL}/contest/questions?count=${count}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  return readResponse(res);
}

export async function submitContestAnswers(payload) {
  const res = await fetch(`${API_URL}/contest/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return readResponse(res);
}

export async function getContestResult(attemptId) {
  const res = await fetch(`${API_URL}/contest/result/${attemptId}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  return readResponse(res);
}

export async function getContestLeaderboard() {
  const res = await fetch(`${API_URL}/contest/leaderboard`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  return readResponse(res);
}