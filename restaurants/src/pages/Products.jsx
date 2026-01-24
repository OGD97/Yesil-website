import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
    MdInventory,
    MdAdd,
    MdEdit,
    MdDelete,
    MdSearch,
    MdRestaurantMenu
} from 'react-icons/md';
import './Products.css';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const productsQuery = query(
            collection(db, 'products'),
            where('idrestaurant', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(fetchedProducts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredProducts(products);
        } else {
            setFilteredProducts(
                products.filter(p =>
                    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
    }, [products, searchTerm]);

    const handleDelete = async (productId, productName) => {
        if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted successfully!');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete product.');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(parseFloat(amount) || 0);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="products-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <MdInventory />
                        Products
                    </h1>
                    <p className="page-subtitle">Manage your menu items</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/products/add')}>
                    <MdAdd /> Add Product
                </button>
            </div>

            <div className="search-bar">
                <MdSearch className="search-icon" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredProducts.length === 0 ? (
                <div className="empty-state card">
                    <MdRestaurantMenu style={{ fontSize: 48, color: '#CBD5E1' }} />
                    <p>{searchTerm ? 'No products found' : 'No products yet'}</p>
                    {!searchTerm && (
                        <button className="btn btn-primary" onClick={() => navigate('/products/add')}>
                            <MdAdd /> Add Your First Product
                        </button>
                    )}
                </div>
            ) : (
                <div className="products-grid">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="product-card card">
                            <div className="product-image">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} />
                                ) : (
                                    <div className="no-image">
                                        <MdRestaurantMenu />
                                    </div>
                                )}
                                {product.mealsCount !== undefined && (
                                    <span className={`stock-badge ${product.mealsCount <= 5 ? 'low' : ''}`}>
                                        {product.mealsCount} left
                                    </span>
                                )}
                            </div>

                            <div className="product-content">
                                <h3 className="product-name">{product.name}</h3>
                                <p className="product-description">{product.description?.substring(0, 80)}...</p>

                                <div className="product-pricing">
                                    {product.price?.before && product.price.before !== product.price.after && (
                                        <span className="price-before">{formatCurrency(product.price.before)}</span>
                                    )}
                                    <span className="price-after">{formatCurrency(product.price?.after || 0)}</span>
                                    {product.discount && (
                                        <span className="discount-badge">-{product.discount}%</span>
                                    )}
                                </div>

                                <div className="product-meta">
                                    <span className="category">{product.category || 'Uncategorized'}</span>
                                    <span className="order-day">{product.orderDay === 'today' ? 'Today' : 'Tomorrow'}</span>
                                </div>
                            </div>

                            <div className="product-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => navigate(`/products/edit/${product.id}`)}
                                >
                                    <MdEdit /> Edit
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(product.id, product.name)}
                                >
                                    <MdDelete /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
