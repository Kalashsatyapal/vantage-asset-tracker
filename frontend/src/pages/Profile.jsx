import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    designation: ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/profile/me")
      .then((response) => {
        const employee = response.data.data.employee;
        setForm({
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          phone: employee.phone || "",
          designation: employee.designation || ""
        });
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Unable to load profile.");
      });
  }, []);

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.patch("/profile/me", form);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update profile.");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT SETTINGS</span>
          <h1>My profile</h1>
          <p>Manage your employee information.</p>
        </div>
      </div>

      <div className="content-card profile-card">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={saveProfile}>
          <div className="profile-grid">
            <div>
              <label>First name</label>
              <input className="form-control" name="firstName" value={form.firstName} onChange={updateField} required />
            </div>
            <div>
              <label>Last name</label>
              <input className="form-control" name="lastName" value={form.lastName} onChange={updateField} required />
            </div>
            <div>
              <label>Phone</label>
              <input className="form-control" name="phone" value={form.phone} onChange={updateField} />
            </div>
            <div>
              <label>Designation</label>
              <input className="form-control" name="designation" value={form.designation} onChange={updateField} />
            </div>
            <div>
              <label>Email</label>
              <input className="form-control" value={user?.email || ""} disabled />
            </div>
            <div>
              <label>Employee code</label>
              <input className="form-control" value={user?.employeeCode || ""} disabled />
            </div>
          </div>

          <button className="primary-button mt-4">Save changes</button>
        </form>
      </div>
    </div>
  );
}