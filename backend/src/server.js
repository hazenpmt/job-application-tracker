import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import { createStore } from "./store.js";

const app = express();
const store = createStore();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-me";
const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173" }));
app.use(express.json());
app.use(morgan("dev"));

function publicUser(user) { return { id: user.id, fullName: user.fullName, email: user.email, createdAt: user.createdAt }; }
function tokenFor(user) { return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" }); }
function isValidEmail(email) { return /^\S+@\S+\.\S+$/.test(String(email || "")); }
function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(String(date || "")); }
function applicationError(body) {
  if (!String(body.companyName || "").trim()) return "Tên công ty là bắt buộc.";
  if (!String(body.position || "").trim()) return "Vị trí ứng tuyển là bắt buộc.";
  if (!STATUSES.includes(body.status)) return "Trạng thái không hợp lệ.";
  if (!validDate(body.appliedDate)) return "Ngày nộp không hợp lệ.";
  if (body.interviewDate && !validDate(body.interviewDate)) return "Ngày phỏng vấn không hợp lệ.";
  return null;
}

async function authenticate(request, response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return response.status(401).json({ error: "Bạn cần đăng nhập để tiếp tục." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await store.getUserById(payload.sub);
    if (!user) return response.status(401).json({ error: "Phiên đăng nhập không còn hợp lệ." });
    request.user = user; return next();
  } catch { return response.status(401).json({ error: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." }); }
}

app.get("/api/health", (_request, response) => response.json({ ok: true, storage: process.env.DATABASE_URL ? "postgresql" : "json-demo" }));

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const { fullName, email, password } = request.body;
    if (!String(fullName || "").trim()) return response.status(400).json({ error: "Họ và tên là bắt buộc." });
    if (!isValidEmail(email)) return response.status(400).json({ error: "Email không hợp lệ." });
    if (String(password || "").length < 6) return response.status(400).json({ error: "Mật khẩu cần ít nhất 6 ký tự." });
    if (await store.findUserByEmail(email)) return response.status(409).json({ error: "Email này đã được dùng." });
    const user = await store.createUser({ fullName, email, passwordHash: await bcrypt.hash(password, 12) });
    return response.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const user = await store.findUserByEmail(request.body.email);
    if (!user || !(await bcrypt.compare(String(request.body.password || ""), user.passwordHash))) return response.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    return response.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.get("/api/auth/me", authenticate, (request, response) => response.json({ user: publicUser(request.user) }));
app.get("/api/applications", authenticate, async (request, response, next) => { try { response.json({ applications: await store.getApplications(request.user.id, request.query) }); } catch (error) { next(error); } });
app.get("/api/applications/:id", authenticate, async (request, response, next) => { try { const application = await store.findApplicationForUser(request.user.id, request.params.id); if (!application) return response.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." }); return response.json({ application }); } catch (error) { return next(error); } });
app.post("/api/applications", authenticate, async (request, response, next) => { try { const error = applicationError(request.body); if (error) return response.status(400).json({ error }); const application = await store.createApplication(request.user.id, request.body); return response.status(201).json({ application }); } catch (error) { return next(error); } });
app.patch("/api/applications/:id", authenticate, async (request, response, next) => { try { const error = applicationError(request.body); if (error) return response.status(400).json({ error }); const application = await store.updateApplication(request.user.id, request.params.id, request.body); if (!application) return response.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." }); return response.json({ application }); } catch (error) { return next(error); } });
app.delete("/api/applications/:id", authenticate, async (request, response, next) => { try { const deleted = await store.deleteApplication(request.user.id, request.params.id); if (!deleted) return response.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." }); return response.status(204).end(); } catch (error) { return next(error); } });
app.get("/api/dashboard/stats", authenticate, async (request, response, next) => { try { response.json({ stats: await store.getStats(request.user.id) }); } catch (error) { next(error); } });

app.use((error, _request, response, _next) => { console.error(error); response.status(500).json({ error: "Server gặp lỗi. Vui lòng thử lại sau." }); });
app.listen(PORT, () => console.log(`API is running at http://127.0.0.1:${PORT}`));
