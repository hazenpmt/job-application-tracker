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
const readableDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN").format(parsed);
};
const dateInputValue = (date) => (date ? String(date).slice(0, 10) : "");

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
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="application-modal" role="dialog" aria-modal="true" aria-labelledby="application-form-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><p className="eyebrow">ĐƠN ỨNG TUYỂN</p><h2 id="application-form-title">{application?.id ? "Cập nhật đơn ứng tuyển" : "Thêm đơn ứng tuyển"}</h2><p className="muted">Lưu lại thông tin để không bỏ lỡ bước tiếp theo.</p></div>
          <button className="close-button" type="button" aria-label="Đóng" onClick={onCancel}>×</button>
        </div>
        <form className="application-form" onSubmit={submit}>
        <label>Công ty *<input required name="companyName" value={form.companyName} onChange={update} /></label>
        <label>Website công ty<input name="companyWebsite" value={form.companyWebsite || ""} onChange={update} /></label>
        <label>Vị trí ứng tuyển *<input required name="position" value={form.position} onChange={update} /></label>
        <label>Link tin tuyển dụng<input name="jobUrl" value={form.jobUrl || ""} onChange={update} /></label>
        <label>Trạng thái *<select name="status" value={form.status} onChange={update}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Ngày nộp *<input required type="date" name="appliedDate" value={form.appliedDate} onChange={update} /></label>
        <label>Ngày phỏng vấn<input type="date" name="interviewDate" value={form.interviewDate || ""} onChange={update} /></label>
        <label className="full-width">Ghi chú<textarea name="notes" value={form.notes || ""} onChange={update} rows="4" /></label>
        {error && <p className="alert error full-width">{error}</p>}
        <div className="form-actions full-width"><button type="button" className="secondary" onClick={onCancel}>Hủy</button><button className="primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu đơn ứng tuyển"}</button></div>
        </form>
      </section>
    </div>
  );
}

function DeleteDialog({ application, onCancel, onConfirm, deleting }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={deleting ? undefined : onCancel}>
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="warning-icon">!</span>
        <div>
          <h2 id="delete-dialog-title">Xóa đơn ứng tuyển?</h2>
          <p>Đơn tại <strong>{application.companyName}</strong> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</p>
        </div>
        <div className="dialog-actions"><button type="button" className="secondary" disabled={deleting} onClick={onCancel}>Hủy</button><button type="button" className="delete-primary" disabled={deleting} onClick={onConfirm}>{deleting ? "Đang xóa..." : "Xóa đơn"}</button></div>
      </section>
    </div>
  );
}

function ProfileModal({ user, token, onCancel, onSaved }) {
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try { onSaved((await api.updateProfile(token, form)).user); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={saving ? undefined : onCancel}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h2 id="profile-title">Thông tin cá nhân</h2><p className="muted">Cập nhật thông tin hiển thị trong ứng dụng.</p></div><button className="close-button" type="button" aria-label="Đóng" onClick={onCancel}>×</button></div>
        <form className="profile-form" onSubmit={submit}>
          <span className="profile-avatar-large">{form.fullName.charAt(0).toUpperCase() || "?"}</span>
          <label>Họ và tên<input required name="fullName" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label>Email<input required type="email" name="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          {error && <p className="alert error">{error}</p>}
          <div className="form-actions"><button type="button" className="secondary" disabled={saving} onClick={onCancel}>Hủy</button><button className="primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
        </form>
      </section>
    </div>
  );
}

function Dashboard({ user, onLogout, onProfileUpdated }) {
  const token = getToken();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, Wishlist: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 });
  const [filters, setFilters] = useState({ search: "", status: "ALL" });
  const [formTarget, setFormTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, statsData] = await Promise.all([api.getApplications(token, filters), api.getStats(token)]);
      setApplications(applicationData.applications.map((application) => ({
        ...application,
        appliedDate: dateInputValue(application.appliedDate),
        interviewDate: dateInputValue(application.interviewDate),
      })));
      setStats(statsData.stats);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message.toLowerCase().includes("xác thực")) onLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filters.search, filters.status]);

  async function removeApplication() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteApplication(token, deleteTarget.id); setDeleteTarget(null); await loadData(); } catch (requestError) { setError(requestError.message); } finally { setDeleting(false); }
  }

  function openCreate() { setFormTarget(null); setShowForm(true); }
  function openEdit(application) { setFormTarget(application); setShowForm(true); }
  function saved() { setShowForm(false); setFormTarget(null); loadData(); }
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = applications.filter((application) => application.interviewDate && application.interviewDate >= today).sort((a, b) => a.interviewDate.localeCompare(b.interviewDate));
  const activeCount = (stats.Applied || 0) + (stats.Interview || 0) + (stats.Offer || 0);
  const progress = stats.total ? Math.round((activeCount / stats.total) * 100) : 0;
  const greeting = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">J</span><span>Jobflow</span></div>
        <nav className="navigation" aria-label="Điều hướng chính">
          <span className="nav-item active"><b>▦</b>Tổng quan</span>
          <span className="nav-item"><b>▤</b>Đơn ứng tuyển <em>{stats.total}</em></span>
          <span className="nav-item"><b>◷</b>Lịch phỏng vấn <em>{stats.Interview || 0}</em></span>
        </nav>
        <div className="sidebar-footer"><button type="button" className="profile-trigger" onClick={() => setShowProfile(true)} aria-label="Sửa thông tin cá nhân"><span className="avatar">{user.fullName.charAt(0).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{user.email}</small></span></button><button type="button" className="signout-icon" aria-label="Đăng xuất" title="Đăng xuất" onClick={onLogout}>↪</button></div>
      </aside>

      <main className="dashboard-main">
        <header className="page-header">
          <div><p className="date-line">{greeting}</p><h1>Tổng quan</h1><p className="muted">Theo dõi hành trình tìm thực tập của bạn.</p></div>
          <button className="primary add-button" onClick={openCreate}><span>+</span> Thêm đơn ứng tuyển</button>
        </header>

        <section className="overview-grid">
          <article className="overview-card"><div className="overview-title"><span>Tổng đơn</span><i className="square-icon blue">▤</i></div><strong>{stats.total}</strong><small>{stats.Wishlist || 0} đơn đang chờ nộp</small></article>
          <article className="overview-card"><div className="overview-title"><span>Đang xử lý</span><i className="square-icon violet">↗</i></div><strong>{(stats.Applied || 0) + (stats.Interview || 0)}</strong><small>Applied và Interview</small></article>
          <article className="overview-card"><div className="overview-title"><span>Phỏng vấn</span><i className="square-icon orange">◷</i></div><strong>{stats.Interview || 0}</strong><small>{upcoming.length} lịch sắp tới</small></article>
          <article className="overview-card"><div className="overview-title"><span>Đã nhận offer</span><i className="square-icon green">✓</i></div><strong>{stats.Offer || 0}</strong><small>Đơn thành công</small></article>
        </section>

        <section className="content-grid">
          <section className="applications-section">
            <div className="section-heading"><div><h2>Đơn ứng tuyển gần đây</h2><p className="muted">Quản lý và cập nhật tiến độ từng vị trí.</p></div><button className="link-button" onClick={openCreate}>Thêm mới</button></div>
            <div className="filters"><label className="search-field"><span>⌕</span><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Tìm công ty hoặc vị trí" /></label><select aria-label="Lọc theo trạng thái" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="ALL">Tất cả trạng thái</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
            {error && <p className="alert error">{error}</p>}
            {loading ? <p className="empty-state">Đang tải dữ liệu...</p> : applications.length === 0 ? <div className="empty-state"><h3>Chưa có đơn ứng tuyển nào</h3><p>Bấm “Thêm đơn ứng tuyển” để bắt đầu.</p><button className="primary" onClick={openCreate}>Thêm đơn đầu tiên</button></div> : <div className="table-wrap"><table><thead><tr><th>Công ty</th><th>Vị trí</th><th>Trạng thái</th><th>Ngày nộp</th><th></th></tr></thead><tbody>{applications.map((application) => <tr key={application.id}><td><strong>{application.companyName}</strong>{application.companyWebsite && <a href={application.companyWebsite} target="_blank" rel="noreferrer">Trang công ty ↗</a>}</td><td>{application.position}</td><td><span className={statusClass(application.status)}>{application.status}</span></td><td>{readableDate(application.appliedDate)}</td><td className="row-actions"><button className="text-button" onClick={() => openEdit(application)}>Sửa</button><button className="danger-button" onClick={() => setDeleteTarget(application)}>Xóa</button></td></tr>)}</tbody></table></div>}
          </section>

          <aside className="right-column">
            <section className="side-panel pipeline-panel"><p className="eyebrow">TIẾN ĐỘ</p><h3>{progress}% cơ hội đang có tiến triển</h3><p className="muted">{activeCount} trong số {stats.total} đơn đang được xử lý hoặc đã có offer.</p><div className="progress-track" aria-label={`${progress}% progressing`}><span style={{ width: `${progress}%` }} /></div><div className="pipeline-rows">{STATUSES.slice(0, 4).map((status) => <div key={status}><span className={`mini-status ${status.toLowerCase()}`} />{status}<b>{stats[status] || 0}</b></div>)}</div></section>
            <section className="side-panel interview-panel"><div className="section-heading compact"><div><p className="eyebrow">LỊCH SẮP TỚI</p><h3>Phỏng vấn</h3></div><span className="calendar-chip">{upcoming.length}</span></div>{upcoming.length ? <div className="upcoming-list">{upcoming.slice(0, 3).map((application) => <div key={application.id} className="upcoming-item"><strong>{application.companyName}</strong><span>{application.position}</span><time>{readableDate(application.interviewDate)}</time></div>)}</div> : <div className="soft-empty"><span>◷</span><p>Chưa có lịch phỏng vấn.</p></div>}</section>
          </aside>
        </section>
      </main>

      {showForm && <ApplicationForm application={formTarget} token={token} onCancel={() => setShowForm(false)} onSaved={saved} />}
      {deleteTarget && <DeleteDialog application={deleteTarget} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={removeApplication} />}
      {showProfile && <ProfileModal user={user} token={token} onCancel={() => setShowProfile(false)} onSaved={(updatedUser) => { setShowProfile(false); onProfileUpdated(updatedUser); }} />}
    </div>
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
  return user ? <Dashboard user={user} onLogout={logout} onProfileUpdated={setUser} /> : <AuthScreen onAuthenticated={setUser} />;
}
