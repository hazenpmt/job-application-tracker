import { useEffect, useState } from "react";
import { api, getToken, removeToken, saveToken } from "./api.js";

const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];
const EMPTY_APPLICATION = {
  companyName: "",
  companyWebsite: "",
  position: "",
  jobUrl: "",
  status: "Wishlist",
  appliedDate: new Date().toISOString().slice(0, 10),
  interviewDate: "",
  notes: "",
};

const statusClass = (status) => `badge badge-${status.toLowerCase()}`;
const readableDate = (date) => (date ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${date}T00:00:00`)) : "—");

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = mode === "login" ? await api.login(form) : await api.register(form);
      saveToken(result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDemo() {
    setError("");
    setLoading(true);
    try {
      const result = await api.demoLogin();
      saveToken(result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <p className="eyebrow">JOB APPLICATION TRACKER</p>
        <h1>Theo dõi từng cơ hội, tập trung vào lần ứng tuyển tiếp theo.</h1>
        <p>Quản lý công ty, vị trí, trạng thái và lịch phỏng vấn trong một dashboard gọn gàng.</p>
        <div className="intro-points">
          <span>✓ Quản lý riêng tư theo tài khoản</span>
          <span>✓ Tìm kiếm và lọc nhanh</span>
          <span>✓ Theo dõi tiến độ ứng tuyển</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Đăng nhập</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Tạo tài khoản</button>
        </div>
        <h2>{mode === "login" ? "Chào mừng trở lại" : "Bắt đầu quản lý đơn ứng tuyển"}</h2>
        <p className="muted">{mode === "login" ? "Đăng nhập để xem dashboard của bạn." : "Tạo tài khoản miễn phí trong vài giây."}</p>

        <form onSubmit={submit} className="stack-form">
          {mode === "register" && (
            <label>Họ và tên<input required name="fullName" value={form.fullName} onChange={update} placeholder="Nguyễn Văn A" /></label>
          )}
          <label>Email<input required type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" /></label>
          <label>Mật khẩu<input required minLength="6" type="password" name="password" value={form.password} onChange={update} placeholder="Tối thiểu 6 ký tự" /></label>
          {error && <p className="alert error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
          <div className="divider"><span>hoặc</span></div>
          <button type="button" className="demo-button" disabled={loading} onClick={openDemo}>✨ Xem bản demo với dữ liệu mẫu</button>
        </form>
      </section>
    </main>
  );
}

function ApplicationForm({ application, onCancel, onSaved, token }) {
  const [form, setForm] = useState(application || EMPTY_APPLICATION);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (application?.id) await api.updateApplication(token, application.id, form);
      else await api.createApplication(token, form);
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel form-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">APPLICATION</p><h2>{application?.id ? "Cập nhật đơn ứng tuyển" : "Thêm đơn ứng tuyển"}</h2></div>
        <button className="text-button" onClick={onCancel}>Đóng</button>
      </div>
      <form className="application-form" onSubmit={submit}>
        <label>Công ty *<input required name="companyName" value={form.companyName} onChange={update} placeholder="Ví dụ: FPT Software" /></label>
        <label>Website công ty<input name="companyWebsite" value={form.companyWebsite || ""} onChange={update} placeholder="https://company.com" /></label>
        <label>Vị trí ứng tuyển *<input required name="position" value={form.position} onChange={update} placeholder="Backend Intern" /></label>
        <label>Link tin tuyển dụng<input name="jobUrl" value={form.jobUrl || ""} onChange={update} placeholder="https://..." /></label>
        <label>Trạng thái *<select name="status" value={form.status} onChange={update}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Ngày nộp *<input required type="date" name="appliedDate" value={form.appliedDate} onChange={update} /></label>
        <label>Ngày phỏng vấn<input type="date" name="interviewDate" value={form.interviewDate || ""} onChange={update} /></label>
        <label className="full-width">Ghi chú<textarea name="notes" value={form.notes || ""} onChange={update} placeholder="Ví dụ: Chuẩn bị ôn REST API và SQL JOIN." rows="4" /></label>
        {error && <p className="alert error full-width">{error}</p>}
        <div className="form-actions full-width"><button type="button" className="secondary" onClick={onCancel}>Hủy</button><button className="primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu đơn ứng tuyển"}</button></div>
      </form>
    </section>
  );
}

function Dashboard({ user, onLogout }) {
  const token = getToken();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, Wishlist: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 });
  const [filters, setFilters] = useState({ search: "", status: "ALL" });
  const [formTarget, setFormTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, statsData] = await Promise.all([api.getApplications(token, filters), api.getStats(token)]);
      setApplications(applicationData.applications);
      setStats(statsData.stats);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message.toLowerCase().includes("xác thực")) onLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filters.search, filters.status]);

  async function removeApplication(id) {
    if (!window.confirm("Xóa đơn ứng tuyển này? Hành động này không thể hoàn tác.")) return;
    try { await api.deleteApplication(token, id); await loadData(); } catch (requestError) { setError(requestError.message); }
  }

  function openCreate() { setFormTarget(null); setShowForm(true); }
  function openEdit(application) { setFormTarget(application); setShowForm(true); }
  function saved() { setShowForm(false); setFormTarget(null); loadData(); }
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = applications.filter((application) => application.interviewDate && application.interviewDate >= today).sort((a, b) => a.interviewDate.localeCompare(b.interviewDate));
  const activeCount = (stats.Applied || 0) + (stats.Interview || 0) + (stats.Offer || 0);
  const progress = stats.total ? Math.round((activeCount / stats.total) * 100) : 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">JOB APPLICATION TRACKER</p><h1>Chào, {user.fullName.split(" ")[0]}.</h1></div>
        <div className="topbar-actions"><span className="muted">{user.email}</span><button className="secondary" onClick={onLogout}>Đăng xuất</button></div>
      </header>

      <section className="stats-grid">
        <article className="stat-card total"><span>Tổng đơn</span><strong>{stats.total}</strong><small>Tất cả cơ hội của bạn</small></article>
        {STATUSES.map((status) => <article key={status} className={`stat-card ${status.toLowerCase()}`}><span>{status}</span><strong>{stats[status] || 0}</strong><small>Đơn ở trạng thái này</small></article>)}
      </section>

      <section className="insight-grid">
        <article className="panel progress-card">
          <div><p className="eyebrow">PIPELINE HEALTH</p><h2>{progress}% đơn đang có tiến triển</h2><p className="muted">{activeCount} trên {stats.total} đơn đang ở trạng thái Applied, Interview hoặc Offer.</p></div>
          <div className="progress-track" aria-label={`${progress}% progressing`}><span style={{ width: `${progress}%` }} /></div>
          <div className="legend"><span><i className="dot blue" /> Đang xử lý</span><span><i className="dot green" /> Có offer</span></div>
        </article>
        <article className="panel interview-card">
          <p className="eyebrow">UPCOMING INTERVIEWS</p>
          <h2>{upcoming.length ? `${upcoming.length} lịch phỏng vấn sắp tới` : "Chưa có lịch phỏng vấn"}</h2>
          {upcoming.length ? <div className="upcoming-list">{upcoming.slice(0, 2).map((application) => <div key={application.id} className="upcoming-item"><strong>{application.companyName}</strong><span>{application.position} · {readableDate(application.interviewDate)}</span></div>)}</div> : <p className="muted">Khi có lịch, hãy thêm ngày phỏng vấn vào đơn ứng tuyển.</p>}
        </article>
      </section>

      {showForm && <ApplicationForm application={formTarget} token={token} onCancel={() => setShowForm(false)} onSaved={saved} />}

      <section className="panel list-panel">
        <div className="panel-heading responsive-heading"><div><p className="eyebrow">APPLICATIONS</p><h2>Danh sách đơn ứng tuyển</h2></div><button className="primary" onClick={openCreate}>+ Thêm đơn</button></div>
        <div className="filters"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Tìm công ty hoặc vị trí..." /><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="ALL">Tất cả trạng thái</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
        {error && <p className="alert error">{error}</p>}
        {loading ? <p className="empty-state">Đang tải dữ liệu...</p> : applications.length === 0 ? <div className="empty-state"><h3>Chưa có đơn ứng tuyển nào</h3><p>Thêm cơ hội đầu tiên để bắt đầu theo dõi.</p><button className="primary" onClick={openCreate}>Thêm đơn đầu tiên</button></div> : <div className="table-wrap"><table><thead><tr><th>Công ty</th><th>Vị trí</th><th>Trạng thái</th><th>Ngày nộp</th><th>Phỏng vấn</th><th></th></tr></thead><tbody>{applications.map((application) => <tr key={application.id}><td><strong>{application.companyName}</strong>{application.companyWebsite && <a href={application.companyWebsite} target="_blank" rel="noreferrer">Website ↗</a>}</td><td>{application.position}</td><td><span className={statusClass(application.status)}>{application.status}</span></td><td>{readableDate(application.appliedDate)}</td><td>{readableDate(application.interviewDate)}</td><td className="row-actions"><button className="text-button" onClick={() => openEdit(application)}>Sửa</button><button className="danger-button" onClick={() => removeApplication(application.id)}>Xóa</button></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getMe(token).then((result) => setUser(result.user)).catch(removeToken).finally(() => setCheckingSession(false));
  }, []);

  function logout() { removeToken(); setUser(null); }
  if (checkingSession) return <main className="center-screen">Đang kiểm tra phiên đăng nhập...</main>;
  return user ? <Dashboard user={user} onLogout={logout} /> : <AuthScreen onAuthenticated={setUser} />;
}
