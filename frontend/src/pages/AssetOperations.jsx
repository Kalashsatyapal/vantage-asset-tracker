import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const emptyAsset = {
  assetTag: "",
  serialNumber: "",
  name: "",
  description: "",
  manufacturer: "",
  modelNumber: "",
  categoryId: "",
  departmentId: "",
  vendorId: "",
  purchasePrice: "",
  purchaseDate: "",
  warrantyExpiry: "",
  location: "",
  condition: "NEW"
};

export default function AssetOperations() {
  const { user } = useAuth();
  const manager = ["ASSET_MANAGER", "ADMIN"].includes(user?.role);

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(emptyAsset);
  const [editingId, setEditingId] = useState(null);
  const [allocation, setAllocation] = useState({ assetId: "", employeeId: "" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAssets = async () => {
    const endpoint = manager ? "/asset-management/assets" : "/assets/available";
    const response = await api.get(endpoint, {
      params: { search, page: 1, limit: 100 }
    });
    setAssets(response.data.assets || []);
  };

  const loadMasterData = async () => {
    if (!manager) return;

    const [categoryResponse, departmentResponse, vendorResponse] =
      await Promise.all([
        api.get("/asset-management/master/categories"),
        api.get("/asset-management/master/departments"),
        api.get("/asset-management/master/vendors")
      ]);

    setCategories(categoryResponse.data.records || []);
    setDepartments(departmentResponse.data.records || []);
    setVendors(vendorResponse.data.records || []);
  };

  const refresh = async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadAssets(), loadMasterData()]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load asset information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const changeField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const saveAsset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      ...form,
      purchasePrice: Number(form.purchasePrice),
      departmentId: form.departmentId || null,
      vendorId: form.vendorId || null,
      warrantyExpiry: form.warrantyExpiry || null
    };

    try {
      if (editingId) {
        const { assetTag, serialNumber, ...updatePayload } = payload;
        await api.patch(`/asset-management/assets/${editingId}`, updatePayload);
        setMessage("Asset updated successfully.");
      } else {
        await api.post("/asset-management/assets", payload);
        setMessage("Asset created successfully.");
      }

      setForm(emptyAsset);
      setEditingId(null);
      await loadAssets();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save asset.");
    }
  };

  const editAsset = (asset) => {
    setEditingId(asset.id);
    setForm({
      ...emptyAsset,
      ...asset,
      categoryId: asset.categoryId || "",
      departmentId: asset.departmentId || "",
      vendorId: asset.vendorId || "",
      purchasePrice: asset.purchasePrice ?? "",
      purchaseDate: asset.purchaseDate?.slice(0, 10) || "",
      warrantyExpiry: asset.warrantyExpiry?.slice(0, 10) || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retireAsset = async (assetId) => {
    if (!window.confirm("Retire this asset? This action cannot be undone.")) return;

    try {
      await api.patch(`/asset-management/assets/${assetId}/retire`);
      setMessage("Asset retired successfully.");
      await loadAssets();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to retire asset.");
    }
  };

  const allocateAsset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/assets/allocations", allocation);
      setAllocation({ assetId: "", employeeId: "" });
      setMessage("Asset allocated successfully.");
      await loadAssets();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to allocate asset.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyAsset);
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ASSET OPERATIONS</span>
          <h1>Asset inventory</h1>
          <p>Manage enterprise equipment and asset assignments.</p>
        </div>
        <button className="secondary-button" onClick={refresh}>Refresh</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {manager && (
        <div className="content-card operation-card">
          <div className="content-card-header">
            <span className="eyebrow">{editingId ? "UPDATE RECORD" : "NEW RECORD"}</span>
            <h3>{editingId ? "Edit asset" : "Register asset"}</h3>
          </div>

          <form onSubmit={saveAsset}>
            <div className="operation-grid">
              <label>Asset tag<input className="form-control" name="assetTag" value={form.assetTag} onChange={changeField} required disabled={!!editingId} /></label>
              <label>Asset name<input className="form-control" name="name" value={form.name} onChange={changeField} required /></label>
              <label>Serial number<input className="form-control" name="serialNumber" value={form.serialNumber} onChange={changeField} /></label>
              <label>Manufacturer<input className="form-control" name="manufacturer" value={form.manufacturer} onChange={changeField} /></label>
              <label>Model number<input className="form-control" name="modelNumber" value={form.modelNumber} onChange={changeField} /></label>
              <label>Category
                <select className="form-select" name="categoryId" value={form.categoryId} onChange={changeField} required>
                  <option value="">Select category</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>Department
                <select className="form-select" name="departmentId" value={form.departmentId} onChange={changeField}>
                  <option value="">Unassigned</option>
                  {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>Vendor
                <select className="form-select" name="vendorId" value={form.vendorId} onChange={changeField}>
                  <option value="">No vendor</option>
                  {vendors.map((item) => <option key={item.id} value={item.id}>{item.companyName}</option>)}
                </select>
              </label>
              <label>Purchase price<input className="form-control" type="number" min="0" step="0.01" name="purchasePrice" value={form.purchasePrice} onChange={changeField} required /></label>
              <label>Purchase date<input className="form-control" type="date" name="purchaseDate" value={form.purchaseDate} onChange={changeField} required /></label>
              <label>Warranty expiry<input className="form-control" type="date" name="warrantyExpiry" value={form.warrantyExpiry} onChange={changeField} /></label>
              <label>Condition
                <select className="form-select" name="condition" value={form.condition} onChange={changeField}>
                  {["NEW", "GOOD", "FAIR", "DAMAGED"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="operation-full">Location<input className="form-control" name="location" value={form.location || ""} onChange={changeField} /></label>
              <label className="operation-full">Description<textarea className="form-control" name="description" value={form.description || ""} onChange={changeField} rows="2" /></label>
            </div>

            <div className="operation-actions">
              <button className="primary-button">{editingId ? "Save changes" : "Create asset"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={cancelEdit}>Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {manager && (
        <div className="content-card operation-card">
          <div className="content-card-header">
            <span className="eyebrow">ALLOCATION</span>
            <h3>Assign an asset to an employee</h3>
          </div>

          <form className="operation-grid" onSubmit={allocateAsset}>
            <label>Available asset
              <select className="form-select" value={allocation.assetId} onChange={(event) => setAllocation({ ...allocation, assetId: event.target.value })} required>
                <option value="">Select asset</option>
                {assets.filter((item) => item.status === "AVAILABLE").map((item) => (
                  <option key={item.id} value={item.id}>{item.assetTag} — {item.name}</option>
                ))}
              </select>
            </label>
            <label>Employee ID
              <input className="form-control" value={allocation.employeeId} onChange={(event) => setAllocation({ ...allocation, employeeId: event.target.value })} placeholder="Employee UUID" required />
            </label>
            <div className="operation-actions">
              <button className="primary-button">Allocate asset</button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card operation-card">
        <div className="toolbar">
          <input className="form-control search-input" placeholder="Search by asset tag, name or serial number" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && loadAssets()} />
          <button className="primary-button" onClick={loadAssets}>Search</button>
        </div>

        {loading ? (
          <div className="empty-state">Loading assets...</div>
        ) : (
          <div className="table-responsive">
            <table className="table asset-table">
              <thead>
                <tr>
                  <th>Asset tag</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Condition</th>
                  {manager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td><strong>{asset.assetTag}</strong></td>
                    <td>{asset.name}</td>
                    <td>{asset.category?.name || "—"}</td>
                    <td>{asset.department?.name || "—"}</td>
                    <td><span className="status-chip">{asset.status}</span></td>
                    <td>{asset.condition}</td>
                    {manager && (
                      <td>
                        <div className="table-actions">
                          <button className="table-action" onClick={() => editAsset(asset)}>Edit</button>
                          {asset.status !== "RETIRED" && (
                            <button className="table-action danger-action" onClick={() => retireAsset(asset.id)}>Retire</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!assets.length && <div className="empty-state">No assets found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}