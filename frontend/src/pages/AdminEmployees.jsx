import { useState } from "react";
import api from "../api/client";

const initialForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "EMPLOYEE"
};

export default function AdminEmployees() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const createEmployee = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setCreatedEmployee(null);
    setLoading(true);

    try {
      const response = await api.post("/admin/employees", form);
      setCreatedEmployee(response.data.data.employee);
      setMessage(response.data.message || "Employee created successfully.");
      setForm(initialForm);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.join(" ") || err.response?.data?.message || "Unable to create employee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Employee management</h1>
          <p>Create employee accounts and assign workspace roles.</p>
        </div>
      </div>

      <div className="content-card operation-card admin-form-card">
        <div className="content-card-header">
          <span className="eyebrow">ACCOUNT PROVISIONING</span>
          <h3>Create employee account</h3>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={createEmployee}>
          <div className="operation-grid">
            <label>Employee code<input className="form-control" name="employeeCode" value={form.employeeCode} onChange={update} required minLength="3" maxLength="30" /></label>
            <label>First name<input className="form-control" name="firstName" value={form.firstName} onChange={update} required minLength="2" maxLength="80" /></label>
            <label>Last name<input className="form-control" name="lastName" value={form.lastName} onChange={update} required minLength="2" maxLength="80" /></label>
            <label>Email address<input className="form-control" type="email" name="email" value={form.email} onChange={update} required /></label>
            <label>Password<input className="form-control" type="password" name="password" value={form.password} onChange={update} required minLength="12" maxLength="72" /></label>
            <label>Role
              <select className="form-select" name="role" value={form.role} onChange={update}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ASSET_MANAGER">Asset Manager</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </label>
          </div>

          <p className="field-hint">Password must contain uppercase, lowercase, number and special character.</p>

          <div className="operation-actions">
            <button className="primary-button" disabled={loading}>
              {loading ? "Creating account..." : "Create employee"}
            </button>
          </div>
        </form>

        {createdEmployee && (
          <div className="created-record">
            <h4>Created employee</h4>
            <div className="profile-grid">
              <div><span>Employee code</span><strong>{createdEmployee.employeeCode}</strong></div>
              <div><span>Name</span><strong>{createdEmployee.firstName} {createdEmployee.lastName}</strong></div>
              <div><span>Email</span><strong>{createdEmployee.email}</strong></div>
              <div><span>Role</span><strong>{createdEmployee.role}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}