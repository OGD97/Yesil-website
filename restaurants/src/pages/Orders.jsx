import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    MdShoppingCart,
    MdRefresh,
    MdFilterList,
    MdCheck,
    MdClose,
    MdLocalShipping,
    MdPrint,
    MdVisibility,
    MdPerson,
    MdPhone,
    MdLocationOn,
    MdAccessTime
} from 'react-icons/md';
import './Orders.css';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const ordersQuery = query(
            collection(db, 'orders_v2'),
            where('restaurantId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                acceptedAt: doc.data().acceptedAt?.toDate(),
                deliveredAt: doc.data().deliveredAt?.toDate(),
                reachedAt: doc.data().reachedAt?.toDate()
            }));

            // Sort by createdAt descending
            fetchedOrders.sort((a, b) => b.createdAt - a.createdAt);
            setOrders(fetchedOrders);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = [...orders];
        const now = new Date();

        // Apply status filter
        if (filter !== 'all') {
            filtered = filtered.filter(order => order.status === filter);
        }

        // Apply date filter
        if (dateFilter === 'today') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filtered = filtered.filter(order => order.createdAt >= startOfToday);
        } else if (dateFilter === 'yesterday') {
            const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filtered = filtered.filter(order => order.createdAt >= yesterday && order.createdAt < today);
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            filtered = filtered.filter(order => order.createdAt >= lastWeek);
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            filtered = filtered.filter(order => order.createdAt >= lastMonth);
        }

        setFilteredOrders(filtered);
    }, [orders, filter, dateFilter]);

    const updateOrderStatus = async (orderId, newStatus, orderData) => {
        try {
            const orderRef = doc(db, 'orders_v2', orderId);

            // If accepting, update product stock
            if (newStatus === 'accepted' && orderData.items) {
                const batch = writeBatch(db);
                for (const item of orderData.items) {
                    if (item.productId) {
                        const productRef = doc(db, 'products', item.productId);
                        const productSnap = await getDoc(productRef);
                        if (productSnap.exists()) {
                            const currentCount = productSnap.data().mealsCount || 0;
                            const orderedQuantity = item.quantity || 1;
                            if (currentCount >= orderedQuantity) {
                                batch.update(productRef, { mealsCount: currentCount - orderedQuantity });
                            }
                        }
                    }
                }
                await batch.commit();
            }

            await updateDoc(orderRef, {
                status: newStatus,
                [`${newStatus}At`]: new Date()
            });

            alert(`Order marked as ${newStatus} successfully!`);
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update order status.');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(parseFloat(amount) || 0);
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

    const printOrder = (order) => {
        const printWindow = window.open('', '_blank');
        const itemsHtml = order.items?.map(item => `
      <tr>
        <td>${item.quantity || 1}x ${item.name}</td>
        <td style="text-align: right">${formatCurrency(item.priceAfter || item.price)}</td>
      </tr>
    `).join('') || '';

        const total = parseFloat(order.priceafter) || parseFloat(order.total) || 0;

        printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.id.substring(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h1 { font-size: 18px; text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 4px; border-bottom: 1px solid #eee; }
            .total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; }
            .info { margin-bottom: 20px; font-size: 14px; }
            .info p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>Order #${order.id.substring(0, 8)}</h1>
          <div class="info">
            <p><strong>Customer:</strong> ${order.name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
            <p><strong>Time:</strong> ${order.createdAt.toLocaleString()}</p>
          </div>
          <table>
            ${itemsHtml}
            <tr class="total">
              <td>TOTAL</td>
              <td style="text-align: right">${formatCurrency(total)}</td>
            </tr>
          </table>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="orders-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <MdShoppingCart />
                        Orders
                    </h1>
                    <p className="page-subtitle">Manage incoming orders</p>
                </div>
                <button className="btn btn-secondary" onClick={() => setLoading(true)}>
                    <MdRefresh /> Refresh
                </button>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <MdFilterList />
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="placed">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="delivered">Delivered</option>
                        <option value="reached">Completed</option>
                        <option value="refused">Refused</option>
                    </select>
                </div>

                <div className="filter-group">
                    <MdAccessTime />
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last Month</option>
                    </select>
                </div>

                <div className="filter-count">
                    Showing {filteredOrders.length} of {orders.length} orders
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="empty-state card">
                    <MdShoppingCart style={{ fontSize: 48, color: '#CBD5E1' }} />
                    <p>No orders found</p>
                </div>
            ) : (
                <div className="orders-grid">
                    {filteredOrders.map(order => {
                        const statusInfo = getStatusBadge(order.status);
                        const total = parseFloat(order.priceafter) || parseFloat(order.total) || 0;

                        return (
                            <div key={order.id} className="order-card card">
                                <div className="order-header">
                                    <div>
                                        <span className="order-id">#{order.id.substring(0, 8)}</span>
                                        <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                                    </div>
                                    <span className="order-time">{order.createdAt.toLocaleString()}</span>
                                </div>

                                <div className="order-customer">
                                    <div className="customer-info">
                                        <MdPerson /> {order.name || 'Customer'}
                                    </div>
                                    <div className="customer-info">
                                        <MdPhone /> {order.phone || 'N/A'}
                                    </div>
                                    <div className="customer-info">
                                        <MdLocationOn /> {order.address?.substring(0, 40)}...
                                    </div>
                                </div>

                                <div className="order-items">
                                    <p className="items-label">{order.items?.length || 0} items</p>
                                    {order.items?.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="item-row">
                                            <span>{item.quantity || 1}x {item.name}</span>
                                            <span>{formatCurrency(item.priceAfter || item.price)}</span>
                                        </div>
                                    ))}
                                    {order.items?.length > 3 && (
                                        <p className="more-items">+{order.items.length - 3} more items</p>
                                    )}
                                </div>

                                <div className="order-total">
                                    <span>Total</span>
                                    <span className="total-amount">{formatCurrency(total)}</span>
                                </div>

                                <div className="order-actions">
                                    {(order.status === 'placed' || order.status === 'pending') && (
                                        <>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => updateOrderStatus(order.id, 'accepted', order)}
                                            >
                                                <MdCheck /> Accept
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => updateOrderStatus(order.id, 'refused', order)}
                                            >
                                                <MdClose /> Refuse
                                            </button>
                                        </>
                                    )}
                                    {(order.status === 'accepted' || order.status === 'preparing') && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => updateOrderStatus(order.id, 'delivered', order)}
                                        >
                                            <MdLocalShipping /> Mark Delivered
                                        </button>
                                    )}
                                    {order.status === 'delivered' && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => updateOrderStatus(order.id, 'reached', order)}
                                        >
                                            <MdCheck /> Confirm Received
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <MdVisibility /> View
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => printOrder(order)}
                                    >
                                        <MdPrint /> Print
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Order #{selectedOrder.id.substring(0, 8)}</h2>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                                <MdClose />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h3>Customer Information</h3>
                                <p><strong>Name:</strong> {selectedOrder.name || 'N/A'}</p>
                                <p><strong>Phone:</strong> {selectedOrder.phone || 'N/A'}</p>
                                <p><strong>Email:</strong> {selectedOrder.email || 'N/A'}</p>
                                <p><strong>Address:</strong> {selectedOrder.address || 'N/A'}</p>
                            </div>
                            <div className="detail-section">
                                <h3>Order Items</h3>
                                {selectedOrder.items?.map((item, idx) => (
                                    <div key={idx} className="detail-item">
                                        <span>{item.quantity || 1}x {item.name}</span>
                                        <span>{formatCurrency(item.priceAfter || item.price)}</span>
                                    </div>
                                ))}
                                <div className="detail-item total">
                                    <strong>Total</strong>
                                    <strong>{formatCurrency(parseFloat(selectedOrder.priceafter) || parseFloat(selectedOrder.total) || 0)}</strong>
                                </div>
                            </div>
                            <div className="detail-section">
                                <h3>Timeline</h3>
                                <p><strong>Placed:</strong> {selectedOrder.createdAt.toLocaleString()}</p>
                                {selectedOrder.acceptedAt && <p><strong>Accepted:</strong> {selectedOrder.acceptedAt.toLocaleString()}</p>}
                                {selectedOrder.deliveredAt && <p><strong>Delivered:</strong> {selectedOrder.deliveredAt.toLocaleString()}</p>}
                                {selectedOrder.reachedAt && <p><strong>Completed:</strong> {selectedOrder.reachedAt.toLocaleString()}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
