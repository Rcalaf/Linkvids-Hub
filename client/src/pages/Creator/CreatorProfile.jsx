import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, CardBody, CardTitle, ListGroup, ListGroupItem, Badge } from 'reactstrap';
import { toast } from 'react-toastify';
import { FaEdit, FaArrowLeft, FaExternalLinkAlt, FaCamera } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

// Components
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import DynamicUserForm from '../../components/Admin/DynamicUserForm';
import PhotoUploadManager, { SingleAttributeManager } from '../../components/Admin/PhotoUploadManager';
import FinancialProfileManager from '../../components/Admin/FinancialProfileManager';

// Services
import { getUserById, updateExistingUser } from '../../services/userService';
import { getAllUserTypes } from '../../services/userTypeService';
import { getStaticLists } from '../../services/staticDataService';
// import { getStoredUser } from '../../services/authService'; 

export default function CreatorProfile() {
    const { auth, updateUser, loading: authLoading } = useAuth();

    const [isEditing, setIsEditing] = useState(false); 
    const [user, setUser] = useState(null);
    const [userConfig, setUserConfig] = useState(null);
    const [globalData, setGlobalData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state for lightbox (View Mode)
    const [modalOpen, setModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState({ path: '', name: '' });

    useEffect(() => {
        // 🚨 FIX: Only run if Auth is done loading AND we have a user 🚨
        if (!authLoading && auth.user) {
            loadMyProfile();
        }
    }, [auth.user, authLoading]);

    const loadMyProfile = async () => {
        setIsLoading(true);
        try {
            // 1. Get ID from logged-in session
            const currentUser = auth.user._id;
          
            if (!currentUser) throw new Error("No active session found.");
  
            // 2. Fetch fresh data
            const [userData, configs, staticLists] = await Promise.all([
                getUserById(currentUser), // Use ID from token
                getAllUserTypes(),
                getStaticLists()
            ]);

            // 3. Find config based on MY type
            const typeSlug = userData.collaboratorType || userData.agencyType;
            const config = configs.find(c => c.slug === typeSlug);
            
            if (!config) throw new Error("Configuration not found for your account type.");

            setUser(userData);
            setUserConfig(config);
            setGlobalData(staticLists);

        } catch (error) {
            toast.error("Failed to load profile.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Update Handlers (Edit Mode) ---
    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                userType: user.userType,
                collaboratorType: user.collaboratorType,
            };
            const updatedUser = await updateExistingUser(user._id, payload);
            setUser(updatedUser);
            // Update local storage to keep header name fresh
            // const currentStorage = auth.user._id;();
            // localStorage.setItem('user', JSON.stringify({ ...currentStorage, ...updatedUser }));
            updateUser(updatedUser);
            
            toast.success("Profile saved successfully!");
            setIsEditing(false); // Switch back to View Mode
        } catch (error) {
            toast.error(error.message || "Update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotosUpdate = (slug, newPhotoArray) => {
        setUser(prev => ({
            ...prev,
            groupSpecificAttributes: { ...prev.groupSpecificAttributes, [slug]: newPhotoArray }
        }));
        toast.success("Gallery updated!");
    };

    const handleProfilePicUpdate = (slug, newPhotoArray) => {
         const newPath = newPhotoArray[0]?.path || '';
         setUser(prev => ({ ...prev, profile_picture: newPath }));
         toast.success("Profile picture updated!");
    };


    // --- Rendering Helpers (View Mode) ---
    const getAttributeValue = (slug, user) => {
        if (user.hasOwnProperty(slug)) return user[slug];
        return user.groupSpecificAttributes ? user.groupSpecificAttributes[slug] : undefined;
    };

    const renderValue = (value, fieldType) => {
        if (value === null || value === undefined || value === "") return <span className="text-muted">Not set</span>;
        
        if (fieldType === 'boolean') return value ? <Badge color="success">Yes</Badge> : <Badge color="secondary">No</Badge>;
        if (fieldType === 'date') return new Date(value).toLocaleDateString();
        if (fieldType === 'url') return <a href={value} target="_blank" rel="noreferrer">{value} <FaExternalLinkAlt size={10} /></a>;

        if (Array.isArray(value)) {
            if (fieldType === 'image_array') {
                 return (
                    <div className="d-flex flex-wrap gap-2">
                        {value.map((item, i) => (
                            <img key={i} src={item.path} alt="Gallery" 
                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }} 
                                onClick={() => { /* Add Lightbox Logic Here */ }}
                            />
                        ))}
                        {value.length === 0 && <span className="text-muted">No images</span>}
                    </div>
                );
            }
            return value.map((v, i) => <Badge key={i} color="info" className="me-1" pill>{v}</Badge>);
        }
        return String(value);
    };

    const handleFinancialUpdate = (newFinancialData) => {
        setUser(prevUser => ({
            ...prevUser,
            financial_profile: newFinancialData || undefined 
        }));
    };

    if (authLoading || isLoading) return <p className="p-4 text-center">Loading profile...</p>;
    if (!user) return <p className="p-4 text-center">Loading profile...</p>;

    // --- Prepare Data ---
    const initialFormData = { ...user, ...user.groupSpecificAttributes }; 
    const photoAttributes = userConfig.fields.filter(field => field.attributeDetails?.fieldType === 'image_array');
    const profilePicData = user.profile_picture ? [{ path: user.profile_picture, name: 'Profile Pic' }] : [];
    
    // Group fields for View Mode
    const groupedFields = userConfig.fields.reduce((acc, field) => {
        const section = field.section || 'Details';
        if (!acc[section]) acc[section] = [];
        if (field.attributeDetails) acc[section].push(field);
        return acc;
    }, {});

    const financial = user.financial_profile || {};

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <Title title={isEditing ? "Edit My Profile" : "My Profile"} />
                <Button 
                    color={isEditing ? "secondary" : "primary"} 
                    onClick={() => setIsEditing(!isEditing)}
                >
                    {isEditing ? <><FaArrowLeft /> Back to View</> : <><FaEdit /> Edit Profile</>}
                </Button>
            </div>

            <Row>
                {/* LEFT COLUMN: Main Info */}
                <Col md={8}>
                    {isEditing ? (
                        <>
                            <Widget title="Edit Details">
                                <DynamicUserForm
                                    userConfig={userConfig}
                                    initialData={initialFormData}
                                    onSubmit={handleFormSubmit}
                                    isSubmitting={isSubmitting}
                                    globalStaticLists={globalData}
                                    isEditing={true} 
                                />
                            </Widget>
                            <div className="mt-4">
                                <FinancialProfileManager userId={user._id} onUpdate={handleFinancialUpdate}/>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-4 p-3 bg-white border rounded shadow-sm">
                                <h5 className="text-primary mb-3">Account & Contact</h5>
                                <Row>
                                    <Col md={6} className="mb-2"><strong>Name:</strong> {user.first_name} {user.last_name}</Col>
                                    <Col md={6} className="mb-2"><strong>Email:</strong> {user.email}</Col>
                                    <Col md={6} className="mb-2"><strong>Phone:</strong> {user.phone || '-'}</Col>
                                    <Col md={6} className="mb-2"><strong>Location:</strong> {user.city}, {user.country}</Col>
                                </Row>
                            </div>

                            {Object.entries(groupedFields).map(([section, fields]) => (
                                <Widget key={section} title={section}>
                                    <ListGroup flush>
                                        {fields.map(field => {
                                            const slug = field.attributeDetails?.slug;
                                            const value = getAttributeValue(slug, user);
                                            if (!slug) return null;

                                            return (
                                                <ListGroupItem key={slug} className="d-flex justify-content-between align-items-center">
                                                    <strong>{field.label}</strong>
                                                    <div className="text-end" style={{ maxWidth: '60%' }}>
                                                        {renderValue(value, field.attributeDetails?.fieldType)}
                                                    </div>
                                                </ListGroupItem>
                                            );
                                        })}
                                    </ListGroup>
                                </Widget>
                            ))}
                            <Widget title="Financial Information">
                                {financial.profileType ? (
                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <strong>Entity Type:</strong> <Badge color="dark">{financial.profileType}</Badge>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <strong>Tax ID (NIF/CIF):</strong> {financial.taxId || financial.nationalId || '-'}
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <strong>Billing Name:</strong> {financial.companyName || financial.billingContactName}
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <strong>Billing Email:</strong> {financial.billingEmail}
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <strong>Fiscal Address:</strong> {financial.fiscalAddress}
                                        </Col>
                                        <Col md={12}>
                                            <div className="p-2 bg-light rounded border">
                                                <strong>IBAN:</strong> {financial.iban || 'Not set'} 
                                                {financial.swiftBic && <span className="ms-3"><strong>BIC:</strong> {financial.swiftBic}</span>}
                                            </div>
                                        </Col>
                                    </Row>
                                ) : (
                                    <p className="text-muted">No financial data provided yet.</p>
                                )}
                            </Widget>
                        </>
                    )}
                </Col>

                {/* RIGHT COLUMN: Photos */}
                <Col md={4}>
                    <Widget title="Profile Picture">
                         {/* In Edit mode, show Uploader. In View mode, show Image. */}
                        {isEditing ? (
                            <SingleAttributeManager
                                userId={user._id}
                                attributeSlug="profile_picture"
                                attributeLabel="Main Photo"
                                currentFiles={profilePicData}
                                // onPhotosUpdate={handleProfilePicUpdate}
                                onUpdate={handleProfilePicUpdate}
                                mode="image"
                                
                            />
                        ) : (
                            <div className="text-center">
                                <img 
                                    src={user.profile_picture || 'https://placehold.co/400x400?text=No+Image'} 
                                    alt="Profile" 
                                    className="img-fluid rounded mb-2"
                                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                                />
                            </div>
                        )}
                    </Widget>

                    {/* Dynamic Galleries */}
                    {isEditing ? (
                        <PhotoUploadManager
                            userId={user._id}
                            photoAttributes={photoAttributes}
                            currentUserData={user}
                            onPhotosUpdate={handlePhotosUpdate}
                        />
                    ) : (
                        /* In View Mode, galleries are rendered inside the main list loop above via renderValue */
                        /* Optionally, you can render a dedicated gallery view here if preferred */
                        null
                    )}
                </Col>
            </Row>
        </Container>
    );
}