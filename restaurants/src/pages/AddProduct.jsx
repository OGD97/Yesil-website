import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import {
    MdAdd,
    MdEdit,
    MdCloudUpload,
    MdArrowBack,
    MdCategory
} from 'react-icons/md';
import './AddProduct.css';

export default function AddProduct() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        priceBefore: '',
        priceAfter: '',
        discount: '',
        mealsCount: '',
        orderDay: 'today',
        imageUrl: ''
    });

    useEffect(() => {
        // Fetch categories
        const fetchCategories = async () => {
            const snapshot = await getDocs(collection(db, 'categories'));
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchCategories();

        // If editing, fetch product data
        if (isEditing) {
            setLoading(true);
            const fetchProduct = async () => {
                const productDoc = await getDoc(doc(db, 'products', id));
                if (productDoc.exists()) {
                    const data = productDoc.data();
                    setFormData({
                        name: data.name || '',
                        description: data.description || '',
                        category: data.category || '',
                        priceBefore: data.price?.before?.toString() || '',
                        priceAfter: data.price?.after?.toString() || '',
                        discount: data.discount?.toString() || '',
                        mealsCount: data.mealsCount?.toString() || '',
                        orderDay: data.orderDay || 'today',
                        imageUrl: data.imageUrl || ''
                    });
                    if (data.imageUrl) {
                        setImagePreview(data.imageUrl);
                    }
                }
                setLoading(false);
            };
            fetchProduct();
        }
    }, [id, isEditing]);

    // Auto-calculate discount
    useEffect(() => {
        if (formData.priceBefore && formData.discount) {
            const before = parseFloat(formData.priceBefore);
            const discount = parseFloat(formData.discount);
            const after = before - (before * discount / 100);
            setFormData(prev => ({ ...prev, priceAfter: after.toFixed(2) }));
        }
    }, [formData.priceBefore, formData.discount]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async () => {
        if (!imageFile) return formData.imageUrl;

        const filename = `product_${Date.now()}_${formData.name.replace(/\s+/g, '_')}.jpg`;
        const imageRef = ref(storage, `product_images/${filename}`);
        await uploadBytes(imageRef, imageFile, { contentType: 'image/jpeg' });
        let url = await getDownloadURL(imageRef);
        if (url.includes('firebasestorage.googleapis.com')) {
            url += '?alt=media';
        }
        return url;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.priceAfter) {
            alert('Please fill in required fields (Name and Price).');
            return;
        }

        setSaving(true);
        const currentUser = auth.currentUser;

        try {
            const imageUrl = await uploadImage();

            const productData = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                price: {
                    before: parseFloat(formData.priceBefore) || parseFloat(formData.priceAfter),
                    after: parseFloat(formData.priceAfter)
                },
                discount: parseInt(formData.discount) || 0,
                mealsCount: parseInt(formData.mealsCount) || 0,
                orderDay: formData.orderDay,
                imageUrl: imageUrl,
                idrestaurant: currentUser.uid,
                updatedAt: new Date()
            };

            if (isEditing) {
                await updateDoc(doc(db, 'products', id), productData);
                alert('Product updated successfully!');
            } else {
                productData.createdAt = new Date();
                const newDocRef = doc(collection(db, 'products'));
                await setDoc(newDocRef, productData);
                alert('Product added successfully!');
            }

            navigate('/products');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save product. Please try again.');
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
        <div className="add-product-page">
            <div className="page-header">
                <div>
                    <button className="back-btn" onClick={() => navigate('/products')}>
                        <MdArrowBack /> Back to Products
                    </button>
                    <h1 className="page-title">
                        {isEditing ? <MdEdit /> : <MdAdd />}
                        {isEditing ? 'Edit Product' : 'Add New Product'}
                    </h1>
                </div>
            </div>

            <form className="product-form card" onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-left">
                        <div className="image-upload">
                            <div
                                className="image-preview"
                                onClick={() => document.getElementById('imageInput').click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" />
                                ) : (
                                    <div className="upload-placeholder">
                                        <MdCloudUpload />
                                        <span>Click to upload image</span>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                id="imageInput"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="form-right">
                        <div className="form-group">
                            <label className="form-label">Product Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter product name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-input"
                                placeholder="Enter product description"
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Available Day</label>
                                <select
                                    className="form-input"
                                    value={formData.orderDay}
                                    onChange={(e) => setFormData({ ...formData, orderDay: e.target.value })}
                                >
                                    <option value="today">Today</option>
                                    <option value="tomorrow">Tomorrow</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Original Price</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={formData.priceBefore}
                                    onChange={(e) => setFormData({ ...formData, priceBefore: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Discount (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    value={formData.discount}
                                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Final Price *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={formData.priceAfter}
                                    onChange={(e) => setFormData({ ...formData, priceAfter: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Meals Count</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Number of available meals"
                                min="0"
                                value={formData.mealsCount}
                                onChange={(e) => setFormData({ ...formData, mealsCount: e.target.value })}
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/products')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product')}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
