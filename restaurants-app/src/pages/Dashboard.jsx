import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    MdDashboard,
    MdShoppingCart,
    MdInventory,
    MdAttachMoney,
    MdTrendingUp,
    MdAccessTime
} from 'react-icons/md';
import './Dashboard.css';

export default function Dashboard({ userData }) {
    const [stats, setStats] = useState({
        todayOrders: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        totalProducts: 0,
        weeklyRevenue: 0,
        totalOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const restaurantId = currentUser.uid;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

        // Query orders for this restaurant
        const ordersQuery = query(
            collection(db, 'orders_v2'),
            where('restaurantId', '==', restaurantId)
        );

        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));

            // Calculate stats
            const todayOrders = orders.filter(o => o.createdAt >= startOfToday);
            const weeklyOrders = orders.filter(o => o.createdAt >= startOfWeek);
            const pendingOrders = orders.filter(o => o.status === 'placed' || o.status === 'pending');

            const calculateTotal = (order) => {
                return parseFloat(order.priceafter) ||
                    parseFloat(order.total) ||
                    (order.items?.reduce((sum, item) =>
                        sum + ((parseFloat(item.priceAfter) || 0) * (parseInt(item.quantity) || 1)), 0) || 0);
            };

            setStats({
                todayOrders: todayOrders.length,
                todayRevenue: todayOrders.reduce((sum, o) => sum + calculateTotal(o), 0),
                pendingOrders: pendingOrders.length,
                totalProducts: 0, // Will be updated by products query
                weeklyRevenue: weeklyOrders.reduce((sum, o) => sum + calculateTotal(o), 0),
                totalOrders: orders.length
            });

            // Set recent orders (last 5)
            setRecentOrders(
                orders
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 5)
            );

            setLoading(false);
        });

        // Query products count
        const productsQuery = query(
            collection(db, 'products'),
            where('idrestaurant', '==', restaurantId)
        );

        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, totalProducts: snapshot.size }));
        });

        return () => {
            unsubscribeOrders();
            unsubscribeProducts();
        };
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            placed: { class: 'badge-pending', label: 'Pending' },
            pending: { class: 'badge-pending', label: 'Pending' },
            accepted: { class: 'badge-accepted', label: 'Accepted' },
            preparing: { class: 'badge-info', label: 'Preparing' },
            delivered: { class: 'badge-delivered', label: 'Delivered' },
            reached: { class: 'badge-reached', label: 'Completed' },
            refused: { class: 'badge-refused', label: 'Refused' }
        };
        return statusMap[status] || { class: 'badge-pending', label: status };
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <MdDashboard />
                        Dashboard
                    </h1>
                    <p className="page-subtitle">Welcome back, {userData?.name || 'Restaurant Owner'}</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#E0F2FE' }}>
                        <MdShoppingCart style={{ color: '#0369A1' }} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Today's Orders</p>
                        <h2 className="stat-value">{stats.todayOrders}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#D1FAE5' }}>
                        <MdAttachMoney style={{ color: '#059669' }} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Today's Revenue</p>
                        <h2 className="stat-value">{formatCurrency(stats.todayRevenue)}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#FEF3C7' }}>
                        <MdAccessTime style={{ color: '#D97706' }} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Pending Orders</p>
                        <h2 className="stat-value">{stats.pendingOrders}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#E0E7FF' }}>
                        <MdInventory style={{ color: '#4F46E5' }} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Products</p>
                        <h2 className="stat-value">{stats.totalProducts}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#FCE7F3' }}>
                        <MdTrendingUp style={{ color: '#DB2777' }} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Weekly Revenue</p>
                        <h2 className="stat-value">{formatCurrency(stats.weeklyRevenue)}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#F3E8FF' }}>
                        <MdShoppingCart style={{ color: '#9333EA' }} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Orders</p>
                        <h2 className="stat-value">{stats.totalOrders}</h2>
                    </div>
                </div>
            </div>

            <div className="recent-orders-section">
                <h2 className="section-title">Recent Orders</h2>
                {recentOrders.length === 0 ? (
                    <div className="empty-state">
                        <MdShoppingCart style={{ fontSize: 48, color: '#CBD5E1' }} />
                        <p>No orders yet</p>
                    </div>
                ) : (
                    <div className="orders-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map(order => {
                                    const statusInfo = getStatusBadge(order.status);
                                    const total = parseFloat(order.priceafter) ||
                                        parseFloat(order.total) || 0;
                                    return (
                                        <tr key={order.id}>
                                            <td>#{order.id.substring(0, 8)}</td>
                                            <td>{order.name || 'Customer'}</td>
                                            <td>{order.items?.length || 0} items</td>
                                            <td>{formatCurrency(total)}</td>
                                            <td>
                                                <span className={`badge ${statusInfo.class}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td>{order.createdAt.toLocaleTimeString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
