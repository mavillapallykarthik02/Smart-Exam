import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";
import { useAuth } from "../context/useAuth";
import { listAvailableBranches } from "../services/branchService";

const institutionName = "Government Polytechnic, Masab Tank";

function BranchAdminRegister() {
    const { register } = useAuth();
    const [branches, setBranches] = useState([]);
    const [isLoadingBranches, setIsLoadingBranches] = useState(true);
    const [branchLoadError, setBranchLoadError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        username: "",
        password: "",
        confirmPassword: "",
        institution: institutionName,
        branchId: "",
        branchName: "",
        branchCode: "",
        administratorId: ""
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    const loadBranches = useCallback(async () => {
        setIsLoadingBranches(true);
        setBranchLoadError("");
        try {
            setBranches(await listAvailableBranches(institutionName));
        } catch (requestError) {
            setBranchLoadError(requestError.message);
        } finally {
            setIsLoadingBranches(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadBranches);
    }, [loadBranches]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setError("");
        if (name === "branchId") {
            const branch = branches.find((item) => item.id === value);
            setFormData((current) => ({
                ...current,
                branchId: value,
                branchName: branch?.name || "",
                branchCode: branch?.code || ""
            }));
            return;
        }
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        if (!formData.name.trim() || !formData.email.trim() || !formData.username.trim() ||
            !formData.password || !formData.confirmPassword || !formData.branchId ||
            !formData.administratorId.trim()) {
            setError("Please fill in all required fields.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Password and Confirm Password do not match.");
            return;
        }
        const administratorId = formData.administratorId.trim().toUpperCase();
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/u.test(administratorId)) {
            setError("Administrator ID must be 3–40 characters using letters, numbers, hyphens or underscores.");
            return;
        }

        setIsSubmitting(true);
        try {
            await register("branch_admin", {
                ...formData,
                name: formData.name.trim(),
                administratorId
            });
            setIsRegistered(true);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isRegistered) {
        return (
            <main className="auth-page auth-page--login">
                <section className="auth-card auth-card--login registration-success">
                    <Link to="/" className="auth-login-brand" aria-label="SmartExam home">
                        <BrandLogoImage /><span>SMARTEXAM</span>
                    </Link>
                    <h2>Branch Administrator Registration Submitted Successfully!</h2>
                    <p>Your account is awaiting College Administrator approval.</p>
                    <Link to="/branch-admin/login" className="auth-button">Go to Login</Link>
                </section>
            </main>
        );
    }

    return (
        <main className="auth-page auth-page--register">
            <section className="auth-card" aria-labelledby="branch-admin-register-title">
                <Link to="/" className="auth-login-brand" aria-label="SmartExam home">
                    <BrandLogoImage /><span>SMARTEXAM</span>
                </Link>
                <h1 id="branch-admin-register-title">Branch Administrator Registration</h1>
                {error && <div className="error-message" role="alert">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="branch-admin-name">Full Name *</label>
                            <input id="branch-admin-name" name="name" required maxLength={100} value={formData.name} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-email">Email *</label>
                            <input id="branch-admin-email" name="email" type="email" required value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-mobile">Mobile Number</label>
                            <input id="branch-admin-mobile" name="mobile" value={formData.mobile} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-username">Username *</label>
                            <input id="branch-admin-username" name="username" required minLength={3} maxLength={32} value={formData.username} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-institution">Institution Name *</label>
                            <input id="branch-admin-institution" name="institution" required value={formData.institution} readOnly />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-branch">Branch Name *</label>
                            <select id="branch-admin-branch" name="branchId" required value={formData.branchId} onChange={handleChange} disabled={isLoadingBranches}>
                                <option value="">{isLoadingBranches ? "Loading branches..." : "Select branch"}</option>
                                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}
                            </select>
                            {branchLoadError && <small role="alert">Unable to load branches: {branchLoadError}</small>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-id">Enter Your ID *</label>
                            <input id="branch-admin-id" name="administratorId" required minLength={3} maxLength={40} value={formData.administratorId} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-password">Password *</label>
                            <input id="branch-admin-password" name="password" type="password" required minLength={8} autoComplete="new-password" value={formData.password} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="branch-admin-confirm-password">Confirm Password *</label>
                            <input id="branch-admin-confirm-password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} />
                        </div>
                    </div>
                    <button type="submit" className="auth-button" disabled={isSubmitting || isLoadingBranches}>
                        {isSubmitting ? "Submitting..." : "Submit Registration"}
                    </button>
                </form>
                <p className="register-text">Already registered? <Link to="/branch-admin/login">Go to Login</Link></p>
            </section>
        </main>
    );
}

export default BranchAdminRegister;
