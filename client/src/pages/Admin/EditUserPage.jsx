import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Container, Row, Col, Button, Card, CardBody, CardTitle, 
    Input, FormGroup, Label, Alert 
} from 'reactstrap'; 
import { toast } from 'react-toastify';
import { FaArrowLeft, FaUserShield } from 'react-icons/fa'; 

import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import DynamicUserForm from '../../components/Admin/DynamicUserForm';
import PhotoUploadManager, { SingleAttributeManager } from '../../components/Admin/PhotoUploadManager';
import FinancialProfileManager from '../../components/Admin/FinancialProfileManager';

// Import StarRating
import StarRating from '../../components/Rating/StarRating';

// Import Services
import { getUserById, updateExistingUser, rateUser } from '../../services/userService';
import { getAllUserTypes } from '../../services/userTypeService';
import { getStaticLists } from '../../services/staticDataService';

export default function EditUserPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    // Data State
    const [user, setUser] = useState(null);
    const [userConfig, setUserConfig] = useState(null);
    const [globalData, setGlobalData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [adminRating, setAdminRating] = useState(0);
    const [adminRatingNotes, setAdminRatingNotes] = useState('');

    useEffect(() => {
        loadUserDataAndConfigs();
    }, [userId]); 

    const loadUserDataAndConfigs = async () => {
        setIsLoading(true);
        try {
            const [userData, configs, staticLists] = await Promise.all([
                getUserById(userId), 
                getAllUserTypes(),
                getStaticLists()
            ]);
            const typeSlug = userData.collaboratorType || userData.agencyType;
            const config = configs.find(c => c.slug === typeSlug);

            if (!config) throw new Error("User configuration schema not found.");
        
            setUser(userData);
            setUserConfig(config);
            setGlobalData(staticLists);

            setAdminRating(userData.adminRating || 0);
            setAdminRatingNotes(userData.adminRatingNotes || '');

        } catch (error) {
            toast.error(error.message || "Failed to load user data.");
            navigate('/admin/collaborators', { replace: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handlers for Photos & Financials (unchanged)
    const handleDynamicPhotosUpdate = (slug, newPhotoArray) => {
        setUser(prev => ({ ...prev, groupSpecificAttributes: { ...prev.groupSpecificAttributes, [slug]: newPhotoArray } }));
    };
    const handleProfilePicUpdate = (slug, newPhotoArray) => {
         const newPath = newPhotoArray[0]?.path || '';
         setUser(prev => ({ ...prev, profile_picture: newPath }));
    };
    const handleFinancialUpdate = (newFinancialData) => {
        setUser(prev => ({ ...prev, financial_profile: newFinancialData || undefined }));
    };

    // 🚨 UNIFIED FORM SUBMIT 
    // This function is passed to DynamicUserForm. When that form submits, 
    // we use the 'formData' it gives us, PLUS the 'adminRating' state we hold here.
    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                userType: user.userType,
                collaboratorType: user.collaboratorType,
                agencyType: user.agencyType,
            };

            // 🚨 PARALLEL UPDATE: Update Profile AND Rating at the same time
            const [updatedUser] = await Promise.all([
                updateExistingUser(userId, payload),       // 1. Update Profile (Name, Address, etc)
                rateUser(userId, adminRating, adminRatingNotes)  // 2. Update Rating (Stars, Notes)
            ]);

            setUser(updatedUser); 
            toast.success(`Profile saved successfully!`);
            
            // Optional: Redirect back to show page after save
            // navigate(`/admin/collaborators/${userId}`);

        } catch (error) {
            console.error(error);
            toast.error(error.message || "Update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading || !user || !userConfig || !globalData) {
        return <div className="p-5 text-center">Loading...</div>;
    }

    const initialFormData = { ...user, ...user.groupSpecificAttributes }; 
    const photoAttributes = userConfig.fields.filter(field => field.attributeDetails?.fieldType === 'image_array');
    const profilePicData = user.profile_picture ? [{ path: user.profile_picture, name: 'Profile Picture', uploadedAt: new Date() }] : [];

    return (
        <Container fluid>
            <div className="mb-3">
                <Link to={`/admin/collaborators/${user._id}`}>
                    <Button color="secondary" outline size="sm">
                        <FaArrowLeft className="me-2" /> Back to Profile
                    </Button>
                </Link>
            </div>
            
            <Title title={`Edit User: ${user.name}`} />
            
            <Row>
                <Col md={8}>
                    {/* MAIN FORM WIDGET */}
                    <Widget title="User Details">
                        <DynamicUserForm
                            userId={userId}
                            userConfig={userConfig}
                            initialData={initialFormData}
                            onSubmit={handleFormSubmit}
                            isSubmitting={isSubmitting}
                            globalStaticLists={globalData}
                            isEditing={true}
                        />
                    </Widget>

                    <div className="mt-4">
                        <FinancialProfileManager 
                            userId={userId} 
                            onUpdate={handleFinancialUpdate} 
                        />
                    </div>
                </Col>

                <Col md={4}>
                    
                    {/* 🚨 SIDEBAR: INTERNAL EVALUATION */}
                    {/* No "Save" button here. It relies on the main form button. */}
                    {/* <Card className="shadow-sm mb-4">
                        <CardBody >
                            <CardTitle tag="h6" className="text-uppercase text-dark mb-3 d-flex align-items-center">
                                <FaUserShield className="me-2 text-warning" /> 
                                Internal Evaluation
                            </CardTitle> */}
                            
                            {/* <Alert color="warning" className="small border-0 shadow-sm p-2 mb-3">
                                <i className="fa fa-info-circle me-1"></i>
                                <strong>Note:</strong> Changes made here are saved when you click the main <strong>"Save Changes"</strong> button on the left.
                            </Alert> */}
                        <Widget title="Internal Evaluation">
                            <div className="mb-3 text-center p-3 bg-white rounded border">
                                <label className="small text-muted mb-1 d-block fw-bold">PERFORMANCE RATING</label>
                                <div className="d-flex justify-content-center">
                                    <StarRating 
                                        rating={adminRating} 
                                        onRate={setAdminRating} 
                                        size={32} 
                                    />
                                </div>
                                <div className="small text-muted mt-2 fw-bold">
                                    {adminRating > 0 ? `${adminRating}/5 Stars` : 'Click stars to rate'}
                                </div>
                            </div>

                            <FormGroup className="mb-0">
                                <Label className="small fw-bold">Admin Notes (Hidden from User)</Label>
                                <Input 
                                    type="textarea" 
                                    rows="6" 
                                    placeholder="Private notes about reliability, quality, payment history..."
                                    value={adminRatingNotes}
                                    onChange={(e) => setAdminRatingNotes(e.target.value)}
                                    style={{ fontSize: '0.9rem' }}
                                />
                            </FormGroup>
                        </Widget>
                        {/* </CardBody>
                    </Card> */}

                    {/* Static Profile Picture Manager */}
                    <Widget title="Primary Photo">
                        <SingleAttributeManager
                            userId={userId}
                            attributeSlug="profile_picture" 
                            attributeLabel="Profile Picture"
                            currentFiles={profilePicData}
                            onUpdate={handleProfilePicUpdate}
                            mode="image"
                        />
                    </Widget>

                    {/* Dynamic Gallery Manager(s) */}
                    <PhotoUploadManager
                        userId={userId}
                        photoAttributes={photoAttributes}
                        currentUserData={user}
                        onPhotosUpdate={handleDynamicPhotosUpdate}
                    />
                </Col>
            </Row>
        </Container>
    );
}