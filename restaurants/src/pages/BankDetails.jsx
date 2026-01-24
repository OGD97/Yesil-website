import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    MdAccountBalance,
    MdSave,
    MdEdit
} from 'react-icons/md';
import './BankDetails.css';

export default function BankDetails() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        accountHolder: '',
        iban: '',
        swiftCode: '',
        accountNumber: ''
    });

    useEffect(() => {
        const fetchBankDetails = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            try {
                const docRef = doc(db, 'bankDetails', currentUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setBankDetails(docSnap.data());
                }
            } catch (error) {
                console.error('Error fetching bank details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBankDetails();
    }, []);

    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        if (!bankDetails.bankName || !bankDetails.iban) {
            alert('Please fill in required fields (Bank Name and IBAN).');
            return;
        }

        setSaving(true);
        try {
            const docRef = doc(db, 'bankDetails', currentUser.uid);
            await setDoc(docRef, {
                ...bankDetails,
                restaurantId: currentUser.uid,
                updatedAt: new Date()
            }, { merge: true });

            alert('Bank details saved successfully!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving bank details:', error);
            alert('Failed to save bank details.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="bank-details-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <MdAccountBalance />
                        Bank Details
                    </h1>
                    <p className="page-subtitle">Manage your payout information</p>
                </div>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        <MdEdit /> Edit Details
                    </button>
                )}
            </div>

            <div className="bank-form card">
                <div className="form-group">
                    <label className="form-label">Bank Name *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter bank name"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                        disabled={!isEditing}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Name on the account"
                        value={bankDetails.accountHolder}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                        disabled={!isEditing}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">IBAN *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="TR00 0000 0000 0000 0000 0000 00"
                        value={bankDetails.iban}
                        onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value.toUpperCase() })}
                        disabled={!isEditing}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">SWIFT/BIC Code</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="XXXXTRXX"
                            value={bankDetails.swiftCode}
                            onChange={(e) => setBankDetails({ ...bankDetails, swiftCode: e.target.value.toUpperCase() })}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Account number (optional)"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>
                </div>

                {isEditing && (
                    <div className="form-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsEditing(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <MdSave /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {!isEditing && !bankDetails.iban && (
                    <div className="empty-notice">
                        <p>No bank details configured yet. Click "Edit Details" to add your payout information.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
