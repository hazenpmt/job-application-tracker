const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "job-tracker-token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  }
  return data;
}

export const api = {
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  demoLogin: () => request("/auth/demo", { method: "POST" }),
  getMe: (token) => request("/auth/me", { token }),
  updateProfile: (token, body) => request("/auth/me", { method: "PATCH", body, token }),
  getApplications: (token, { search, status }) => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status && status !== "ALL") query.set("status", status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/applications${suffix}`, { token });
  },
  createApplication: (token, body) => request("/applications", { method: "POST", body, token }),
  updateApplication: (token, id, body) => request(`/applications/${id}`, { method: "PATCH", body, token }),
  deleteApplication: (token, id) => request(`/applications/${id}`, { method: "DELETE", token }),
  getStats: (token) => request("/dashboard/stats", { token }),
};
