import { useState } from "react";
import TeacherNavbar from "../components/TeacherNavbar";
import { useAuth } from "../context/AuthContext";

function TeacherAccount() {
    const { user, updateProfile } = useAuth();
    const [profile, setProfile] = useState(user);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isCopied, setIsCopied] = useState(false);

    const handleChange = (event) => {
        setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));
        setError("");
        setMessage("");
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setIsSaving(true);
        try {
            const updated = await updateProfile({
                name: profile.name.trim(),
                username: profile.username.trim(),
                email: profile.email.trim(),
                mobile: profile.mobile.trim(),
            });
            setProfile(updated);
            setIsEditing(false);
            setMessage("Account details updated successfully.");
        } catch (requestError) {
            const validationMessages = requestError.errors?.map((item) => item.message) || [];
            setError([requestError.message, ...validationMessages].join(" "));
        } finally {
            setIsSaving(false);
        }
    };

    const cancelEdit = () => {
        setProfile(user);
        setIsEditing(false);
        setError("");
        setMessage("");
    };

    const copyTeacherId = async () => {
        setError("");
        try {
            await navigator.clipboard.writeText(user.teacherId);
            setIsCopied(true);
            window.setTimeout(() => setIsCopied(false), 1800);
        } catch {
            setError("Unable to copy the Teacher ID. Please copy it manually.");
        }
    };

    const initials = user.name.trim().split(/\s+/u)
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const fields = [
        ["name", "Full Name", "text", "name"],
        ["username", "Username", "text", "username"],
        ["email", "Email Address", "email", "email"],
        ["mobile", "Mobile Number", "tel", "tel"],
        ["teacherId", "Teacher ID", "text", "off"]
    ];

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Account" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <p className="teacher-label">TEACHER ACCOUNT</p>
                    <h1>My Account</h1>
                    <p>Manage your authenticated teacher profile.</p>
                </div>
                {error && <div className="error-message" role="alert">{error}</div>}
                {message && <div className="success-message" role="status">{message}</div>}
                <section className="teacher-welcome">
                    <div>
                        <p className="teacher-label">TEACHER PROFILE</p>
                        <h1>{user.name}</h1>
                        <p>{user.email}</p>
                        <div className="teacher-info-line">
                            <span>ID: {user.teacherId}</span>
                            <span>{user.institution}</span>
                        </div>
                    </div>
                    <div className="teacher-avatar">{initials}</div>
                </section>
                <section className="teacher-panel">
                    <div className="teacher-panel-heading">
                        <div><h2>Account Information</h2>
                            <p>Changes are saved to your authenticated account.</p></div>
                        {!isEditing && (
                            <button className="teacher-primary-button" type="button"
                                onClick={() => setIsEditing(true)}>
                                Edit Profile
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleSave}>
                        <div className="teacher-form-grid">
                            {fields.map(([name, label, type, autoComplete]) => (
                                <div className="teacher-form-group" key={name}>
                                    <label htmlFor={`profile-${name}`}>{label}</label>
                                    <input
                                        id={`profile-${name}`}
                                        name={name}
                                        type={type}
                                        autoComplete={autoComplete}
                                        value={profile[name] || ""}
                                        onChange={handleChange}
                                        disabled={!isEditing || isSaving || name === "teacherId"}
                                        required
                                        minLength={name === "username" ? 3 : undefined}
                                        maxLength={name === "username" ? 32 : undefined}
                                        pattern={name === "username" ? "[A-Za-z0-9._\\-]+" : undefined}
                                    />
                                    {name === "teacherId" && (
                                        <button
                                            className="teacher-secondary-button teacher-id-copy"
                                            type="button"
                                            onClick={copyTeacherId}
                                        >
                                            {isCopied ? "Copied" : "Copy Teacher ID"}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {isEditing && (
                            <div className="modal-actions">
                                <button type="button" onClick={cancelEdit} disabled={isSaving}>Cancel</button>
                                <button className="teacher-primary-button" type="submit" disabled={isSaving}>
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        )}
                    </form>
                </section>
            </main>
        </div>
    );
}

export default TeacherAccount;
