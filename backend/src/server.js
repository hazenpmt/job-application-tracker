import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore, initializeStore, usingPostgres } from "./store.js";

const app = express();
const store = createStore();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-me";
const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, "..", "..", "frontend", "dist");

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

async function seedDemoApplications(userId) {
  const existing = await store.getApplications(userId);
  if (existing.length) return;
  const samples = [
    { companyName: "FPT Software", companyWebsite: "https://fptsoftware.com", position: "Backend Intern", jobUrl: "https://fptsoftware.com/careers", status: "Interview", appliedDate: "2026-09-16", interviewDate: "2026-09-28", notes: "Ôn REST API, JWT và SQL JOIN trước vòng technical." },
    { companyName: "VNG", companyWebsite: "https://vng.com.vn", position: "Full-stack Intern", jobUrl: "https://vng.com.vn/career", status: "Applied", appliedDate: "2026-09-20", interviewDate: "", notes: "Đã nhận email xác nhận nộp đơn." },
    { companyName: "KMS Technology", companyWebsite: "https://kms-technology.com", position: "Software Engineering Intern", jobUrl: "https://kms-technology.com/careers", status: "Wishlist", appliedDate: "2026-09-24", interviewDate: "", notes: "Hoàn thiện CV và portfolio trước khi nộp." },
    { companyName: "MoMo", companyWebsite: "https://momo.vn", position: "Node.js Intern", jobUrl: "https://momo.vn/career", status: "Offer", appliedDate: "2026-09-04", interviewDate: "2026-09-15", notes: "Ví dụ dữ liệu offer để dashboard có đủ trạng thái." },
    { companyName: "Tiki", companyWebsite: "https://tiki.vn", position: "Web Developer Intern", jobUrl: "https://tiki.vn/careers", status: "Rejected", appliedDate: "2026-08-30", interviewDate: "2026-09-08", notes: "Ví dụ dữ liệu lịch sử." },
  ];
  for (const sample of samples) await store.createApplication(userId, sample);
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

app.get("/api/health", (_request, response) => response.json({ ok: true, storage: usingPostgres() ? "postgresql" : "json-demo" }));

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

app.post("/api/auth/demo", async (_request, response, next) => {
  try {
    const user = await store.createUser({
      fullName: "Demo Candidate",
      email: `demo-${randomUUID()}@jobtracker.local`,
      passwordHash: await bcrypt.hash(randomUUID(), 12),
    });
    await seedDemoApplications(user.id);
    return response.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.get("/api/auth/me", authenticate, (request, response) => response.json({ user: publicUser(request.user) }));
app.patch("/api/auth/me", authenticate, async (request, response, next) => {
  try {
    const fullName = String(request.body.fullName || "").trim();
    const email = String(request.body.email || "").trim();
    if (!fullName) return response.status(400).json({ error: "Họ và tên là bắt buộc." });
    if (!isValidEmail(email)) return response.status(400).json({ error: "Email không hợp lệ." });
    const existing = await store.findUserByEmail(email);
    if (existing && existing.id !== request.user.id) return response.status(409).json({ error: "Email này đã được dùng." });
    const user = await store.updateUser(request.user.id, { fullName, email });
    return response.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});
app.get("/api/applications", authenticate, async (request, response, next) => { try { response.json({ applications: await store.getApplications(request.user.id, request.query) }); } catch (error) { next(error); } });
app.get("/api/applications/:id", authenticate, async (request, response, next) => { try { const application = await store.findApplicationForUser(request.user.id, request.params.id); if (!application) return response.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." }); return response.json({ application }); } catch (error) { return next(error); } });
app.post("/api/applications", authenticate, async (request, response, next) => { try { const error = applicationError(request.body); if (error) return response.status(400).json({ error }); const application = await store.createApplication(request.user.id, request.body); return response.status(201).json({ application }); } catch (error) { return next(error); } });
app.patch("/api/applications/:id", authenticate, async (request, response, next) => { try { const error = applicationError(request.body); if (error) return response.status(400).json({ error }); const application = await store.updateApplication(request.user.id, request.params.id, request.body); if (!application) return response.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." }); return response.json({ application }); } catch (error) { return next(error); } });
app.delete("/api/applications/:id", authenticate, async (request, response, next) => { try { const deleted = await store.deleteApplication(request.user.id, request.params.id); if (!deleted) return response.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." }); return response.status(204).end(); } catch (error) { return next(error); } });
app.get("/api/dashboard/stats", authenticate, async (request, response, next) => { try { response.json({ stats: await store.getStats(request.user.id) }); } catch (error) { next(error); } });

app.use(express.static(FRONTEND_DIST));
app.use((request, response, next) => {
  if (request.method === "GET" && !request.path.startsWith("/api/")) return response.sendFile(path.join(FRONTEND_DIST, "index.html"));
  return next();
});

app.use((error, _request, response, _next) => { console.error(error); response.status(500).json({ error: "Server gặp lỗi. Vui lòng thử lại sau." }); });

async function start() {
  try {
    await initializeStore(store);
    app.listen(PORT, () => console.log(`API is running at http://127.0.0.1:${PORT}`));
  } catch (error) {
    console.error("Không thể kết nối hoặc khởi tạo PostgreSQL.", error);
    process.exit(1);
  }
}

start();
