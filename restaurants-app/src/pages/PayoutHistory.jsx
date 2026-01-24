import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    MdHistory,
    MdAttachMoney,
    MdCheckCircle,
    MdPending,
    MdCancel
} from 'react-icons/md';
import './PayoutHistory.css';

export default function PayoutHistory() {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPaid: 0,
        pending: 0,
        count: 0
    });

    useEffect(() => {
        const fetchPayouts = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            try {
                const payoutsQuery = query(
                    collection(db, 'payouts'),
                    where('restaurantId', '==', currentUser.uid)
                );

                const snapshot = await getDocs(payoutsQuery);
                const fetchedPayouts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate() || new Date()
                }));

                // Sort by date descending
                fetchedPayouts.sort((a, b) => b.date - a.date);
                setPayouts(fetchedPayouts);

                // Calculate stats
                const totalPaid = fetchedPayouts
                    .filter(p => p.status === 'completed')
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                const pending = fetchedPayouts
                    .filter(p => p.status === 'pending')
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                setStats({
                    totalPaid,
                    pending,
                    count: fetchedPayouts.length
                });
            } catch (error) {
                console.error('Error fetching payouts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPayouts();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(parseFloat(amount) || 0);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <MdCheckCircle style={{ color: '#10B981' }} />;
            case 'pending':
                return <MdPending style={{ color: '#F59E0B' }} />;
            case 'failed':
                return <MdCancel style={{ color: '#EF4444' }} />;
            default:
                return <MdPending style={{ color: '#94A3B8' }} />;
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
        <div className="payout-history-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <MdHistory />
                        Payout History
                    </h1>
                    <p className="page-subtitle">View your payment history</p>
                </div>
            </div>

            <div className="stats-row">
                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: '#D1FAE5' }}>
                        <MdAttachMoney style={{ color: '#059669' }} />
                    </div>
                    <div>
                        <p className="stat-label">Total Paid</p>
                        <h3 className="stat-value">{formatCurrency(stats.totalPaid)}</h3>
                    </div>
                </div>

                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: '#FEF3C7' }}>
                        <MdPending style={{ color: '#D97706' }} />
                    </div>
                    <div>
                        <p className="stat-label">Pending</p>
                        <h3 className="stat-value">{formatCurrency(stats.pending)}</h3>
                    </div>
                </div>

                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: '#E0E7FF' }}>
                        <MdHistory style={{ color: '#4F46E5' }} />
                    </div>
                    <div>
                        <p className="stat-label">Total Payouts</p>
                        <h3 className="stat-value">{stats.count}</h3>
                    </div>
                </div>
            </div>

            <div className="payouts-table card">
                {payouts.length === 0 ? (
                    <div className="empty-state">
                        <MdHistory style={{ fontSize: 48, color: '#CBD5E1' }} />
                        <p>No payout history yet</p>
                        <span>Your payout records will appear here</span>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Period</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map(payout => (
                                <tr key={payout.id}>
                                    <td>{payout.date.toLocaleDateString()}</td>
                                    <td>#{payout.id.substring(0, 8)}</td>
                                    <td>{payout.period || 'N/A'}</td>
                                    <td className="amount">{formatCurrency(payout.amount)}</td>
                                    <td>
                                        <span className={`status-badge ${payout.status}`}>
                                            {getStatusIcon(payout.status)}
                                            {payout.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
