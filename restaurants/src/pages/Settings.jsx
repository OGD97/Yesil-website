import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
    MdSettings,
    MdLogout,
    MdPerson,
    MdEmail,
    MdPhone,
    MdStore
} from 'react-icons/md';
import './Settings.css';

export default function Settings({ userData }) {
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to log out?')) return;

        setLoggingOut(true);
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to log out. Please try again.');
            setLoggingOut(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <MdSettings />
                        Settings
                    </h1>
                    <p className="page-subtitle">Manage your account</p>
                </div>
            </div>

            <div className="settings-section card">
                <h2 className="section-title">
                    <MdPerson />
                    Restaurant Profile
                </h2>

                <div className="profile-info">
                    <div className="profile-avatar">
                        {userData?.profileImage ? (
                            <img src={userData.profileImage} alt={userData.name} />
                        ) : (
                            <MdStore />
                        )}
                    </div>

                    <div className="profile-details">
                        <div className="detail-item">
                            <MdStore className="detail-icon" />
                            <div>
                                <span className="detail-label">Restaurant Name</span>
                                <span className="detail-value">{userData?.name || 'Not set'}</span>
                            </div>
                        </div>

                        <div className="detail-item">
                            <MdEmail className="detail-icon" />
                            <div>
                                <span className="detail-label">Email</span>
                                <span className="detail-value">{userData?.email || auth.currentUser?.email || 'Not set'}</span>
                            </div>
                        </div>

                        <div className="detail-item">
                            <MdPhone className="detail-icon" />
                            <div>
                                <span className="detail-label">Phone</span>
                                <span className="detail-value">{userData?.phone || 'Not set'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="edit-notice">
                    To edit your profile, please use the mobile app.
                </p>
            </div>

            <div className="settings-section card danger">
                <h2 className="section-title">
                    <MdLogout />
                    Session
                </h2>

                <p className="section-description">
                    Sign out of your restaurant account on this device.
                </p>

                <button
                    className="btn btn-danger"
                    onClick={handleLogout}
                    disabled={loggingOut}
                >
                    <MdLogout /> {loggingOut ? 'Logging out...' : 'Log Out'}
                </button>
            </div>
        </div>
    );
}
