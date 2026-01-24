import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
    MdDashboard,
    MdShoppingCart,
    MdInventory,
    MdAccountBalance,
    MdHistory,
    MdSettings,
    MdLogout,
    MdRestaurant,
    MdAdd
} from 'react-icons/md';
import logo from '../assets/images/yesill.png';
import './Sidebar.css';

export default function Sidebar({ activePage, setActivePage, userData }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, path: '/' },
        { id: 'orders', label: 'Orders', icon: MdShoppingCart, path: '/orders' },
        { id: 'products', label: 'Products', icon: MdInventory, path: '/products' },
        { id: 'add-product', label: 'Add Product', icon: MdAdd, path: '/products/add' },
        { id: 'bank-details', label: 'Bank Details', icon: MdAccountBalance, path: '/bank-details' },
        { id: 'payout-history', label: 'Payout History', icon: MdHistory, path: '/payout-history' },
        { id: 'settings', label: 'Settings', icon: MdSettings, path: '/settings' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <img src={logo} alt="Yesil" className="logo-image" />
                    <div>
                        <h1>Yesil Restaurant</h1>
                        <p>Management Panel</p>
                    </div>
                </div>
            </div>

            <div className="sidebar-user">
                <div className="user-avatar">
                    {userData?.profileImage ? (
                        <img src={userData.profileImage} alt={userData.name} />
                    ) : (
                        <MdRestaurant />
                    )}
                </div>
                <div className="user-info">
                    <span className="user-name">{userData?.name || 'Restaurant'}</span>
                    <span className="user-role">Restaurant Owner</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        onClick={() => setActivePage(item.id)}
                    >
                        <item.icon className="nav-icon" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <button className="logout-btn" onClick={handleLogout}>
                <MdLogout />
                <span>Logout</span>
            </button>
        </aside>
    );
}
