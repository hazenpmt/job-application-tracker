import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_FILE = path.join(__dirname, "..", "data", "demo-db.json");
const emptyDatabase = () => ({ nextIds: { user: 1, company: 1, application: 1 }, users: [], companies: [], applications: [] });
const now = () => new Date().toISOString();
const lower = (value) => String(value || "").trim().toLowerCase();
const mapApplication = (application, company) => ({ ...application, companyName: company?.name || "Unknown company", companyWebsite: company?.website || "" });

class JsonStore {
  constructor(filePath = DEMO_FILE) { this.filePath = filePath; }
  async load() {
    try { return JSON.parse(await readFile(this.filePath, "utf8")); }
    catch { return emptyDatabase(); }
  }
  async save(database) { await mkdir(path.dirname(this.filePath), { recursive: true }); await writeFile(this.filePath, JSON.stringify(database, null, 2)); }
  async findUserByEmail(email) { return (await this.load()).users.find((user) => user.email === lower(email)) || null; }
  async getUserById(id) { return (await this.load()).users.find((user) => user.id === Number(id)) || null; }
  async createUser({ fullName, email, passwordHash }) {
    const database = await this.load();
    const user = { id: database.nextIds.user++, fullName: fullName.trim(), email: lower(email), passwordHash, createdAt: now() };
    database.users.push(user); await this.save(database); return user;
  }
  async upsertCompany(database, userId, { companyName, companyWebsite }) {
    const name = companyName.trim();
    let company = database.companies.find((item) => item.userId === Number(userId) && lower(item.name) === lower(name));
    if (company) { company.website = companyWebsite?.trim() || company.website || ""; return company; }
    company = { id: database.nextIds.company++, userId: Number(userId), name, website: companyWebsite?.trim() || "", createdAt: now() };
    database.companies.push(company); return company;
  }
  async getApplications(userId, { search = "", status = "" } = {}) {
    const database = await this.load(); const query = lower(search);
    return database.applications.filter((item) => {
      const company = database.companies.find((candidate) => candidate.id === item.companyId);
      const matchesSearch = !query || lower(item.position).includes(query) || lower(company?.name).includes(query);
      return item.userId === Number(userId) && matchesSearch && (!status || item.status === status);
    }).sort((a, b) => String(b.appliedDate).localeCompare(String(a.appliedDate))).map((item) => mapApplication(item, database.companies.find((company) => company.id === item.companyId)));
  }
  async findApplicationForUser(userId, id) {
    const database = await this.load(); const application = database.applications.find((item) => item.userId === Number(userId) && item.id === Number(id));
    if (!application) return null; return mapApplication(application, database.companies.find((company) => company.id === application.companyId));
  }
  async createApplication(userId, payload) {
    const database = await this.load(); const company = await this.upsertCompany(database, userId, payload);
    const application = { id: database.nextIds.application++, userId: Number(userId), companyId: company.id, position: payload.position.trim(), jobUrl: payload.jobUrl?.trim() || "", status: payload.status, appliedDate: payload.appliedDate, interviewDate: payload.interviewDate || "", notes: payload.notes?.trim() || "", createdAt: now(), updatedAt: now() };
    database.applications.push(application); await this.save(database); return mapApplication(application, company);
  }
  async updateApplication(userId, id, payload) {
    const database = await this.load(); const application = database.applications.find((item) => item.userId === Number(userId) && item.id === Number(id));
    if (!application) return null; const company = await this.upsertCompany(database, userId, payload);
    Object.assign(application, { companyId: company.id, position: payload.position.trim(), jobUrl: payload.jobUrl?.trim() || "", status: payload.status, appliedDate: payload.appliedDate, interviewDate: payload.interviewDate || "", notes: payload.notes?.trim() || "", updatedAt: now() });
    await this.save(database); return mapApplication(application, company);
  }
  async deleteApplication(userId, id) {
    const database = await this.load(); const index = database.applications.findIndex((item) => item.userId === Number(userId) && item.id === Number(id));
    if (index < 0) return false; database.applications.splice(index, 1); await this.save(database); return true;
  }
  async getStats(userId) { const applications = await this.getApplications(userId); return applications.reduce((stats, item) => ({ ...stats, total: stats.total + 1, [item.status]: stats[item.status] + 1 }), { total: 0, Wishlist: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 }); }
}

class PostgresStore {
  constructor(config) { this.pool = new pg.Pool(config); }
  async findUserByEmail(email) { const result = await this.pool.query("SELECT id, full_name AS \"fullName\", email, password_hash AS \"passwordHash\", created_at AS \"createdAt\" FROM users WHERE email = $1", [lower(email)]); return result.rows[0] || null; }
  async getUserById(id) { const result = await this.pool.query("SELECT id, full_name AS \"fullName\", email, password_hash AS \"passwordHash\", created_at AS \"createdAt\" FROM users WHERE id = $1", [id]); return result.rows[0] || null; }
  async createUser({ fullName, email, passwordHash }) { const result = await this.pool.query("INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name AS \"fullName\", email, password_hash AS \"passwordHash\", created_at AS \"createdAt\"", [fullName.trim(), lower(email), passwordHash]); return result.rows[0]; }
  async upsertCompany(userId, { companyName, companyWebsite }) { const result = await this.pool.query("INSERT INTO companies (user_id, name, website) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET website = COALESCE(NULLIF(EXCLUDED.website, ''), companies.website) RETURNING id, user_id AS \"userId\", name, website", [userId, companyName.trim(), companyWebsite?.trim() || ""]); return result.rows[0]; }
  async getApplications(userId, { search = "", status = "" } = {}) {
    const values = [userId]; const conditions = ["a.user_id = $1"];
    if (search) { values.push(`%${search}%`); conditions.push(`(a.position ILIKE $${values.length} OR c.name ILIKE $${values.length})`); }
    if (status) { values.push(status); conditions.push(`a.status = $${values.length}`); }
    const result = await this.pool.query(`SELECT a.id, a.user_id AS "userId", a.company_id AS "companyId", c.name AS "companyName", c.website AS "companyWebsite", a.position, a.job_url AS "jobUrl", a.status, a.applied_date AS "appliedDate", a.interview_date AS "interviewDate", a.notes, a.created_at AS "createdAt", a.updated_at AS "updatedAt" FROM applications a JOIN companies c ON c.id = a.company_id WHERE ${conditions.join(" AND ")} ORDER BY a.applied_date DESC`, values);
    return result.rows;
  }
  async findApplicationForUser(userId, id) { return (await this.getApplications(userId)).find((application) => application.id === Number(id)) || null; }
  async createApplication(userId, payload) { const company = await this.upsertCompany(userId, payload); const result = await this.pool.query("INSERT INTO applications (user_id, company_id, position, job_url, status, applied_date, interview_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id", [userId, company.id, payload.position.trim(), payload.jobUrl?.trim() || null, payload.status, payload.appliedDate, payload.interviewDate || null, payload.notes?.trim() || null]); return this.findApplicationForUser(userId, result.rows[0].id); }
  async updateApplication(userId, id, payload) { const company = await this.upsertCompany(userId, payload); const result = await this.pool.query("UPDATE applications SET company_id=$1, position=$2, job_url=$3, status=$4, applied_date=$5, interview_date=$6, notes=$7, updated_at=NOW() WHERE id=$8 AND user_id=$9 RETURNING id", [company.id, payload.position.trim(), payload.jobUrl?.trim() || null, payload.status, payload.appliedDate, payload.interviewDate || null, payload.notes?.trim() || null, id, userId]); return result.rows[0] ? this.findApplicationForUser(userId, id) : null; }
  async deleteApplication(userId, id) { const result = await this.pool.query("DELETE FROM applications WHERE id=$1 AND user_id=$2", [id, userId]); return result.rowCount > 0; }
  async getStats(userId) { const result = await this.pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'Wishlist')::int AS \"Wishlist\", COUNT(*) FILTER (WHERE status = 'Applied')::int AS \"Applied\", COUNT(*) FILTER (WHERE status = 'Interview')::int AS \"Interview\", COUNT(*) FILTER (WHERE status = 'Offer')::int AS \"Offer\", COUNT(*) FILTER (WHERE status = 'Rejected')::int AS \"Rejected\" FROM applications WHERE user_id=$1", [userId]); return result.rows[0]; }
}

export function usingPostgres() { return Boolean(process.env.DATABASE_URL || process.env.PGDATABASE); }

export function createStore() {
  if (process.env.DATABASE_URL) return new PostgresStore({ connectionString: process.env.DATABASE_URL });
  if (process.env.PGDATABASE) {
    return new PostgresStore({
      host: process.env.PGHOST || "127.0.0.1",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });
  }
  return new JsonStore();
}
