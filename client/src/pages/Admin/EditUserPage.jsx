// client/src/pages/Admin/EditUserPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import DynamicUserForm from '../../components/Admin/DynamicUserForm';

import PhotoUploadManager, { SingleAttributeManager } from '../../components/Admin/PhotoUploadManager';
import FinancialProfileManager from '../../components/Admin/FinancialProfileManager';


import { getUserById, updateExistingUser } from '../../services/userService';
import { getAllUserTypes } from '../../services/userTypeService';
import { getStaticLists } from '../../services/staticDataService';
import { FaArrowLeft} from 'react-icons/fa';

export default function EditUserPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    const [user, setUser] = useState(null);
    const [userConfig, setUserConfig] = useState(null);
    const [globalData, setGlobalData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        } catch (error) {
            toast.error(error.message || "Failed to load user data.");
            navigate('/admin/collaborators', { replace: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handler for DYNAMIC photo arrays (updates groupSpecificAttributes)
    const handleDynamicPhotosUpdate = (slug, newPhotoArray) => {
        setUser(prev => ({
            ...prev,
            groupSpecificAttributes: {
                ...prev.groupSpecificAttributes,
                [slug]: newPhotoArray 
            }
        }));
    };

    // Handler for STATIC profile picture (updates root field)
    const handleProfilePicUpdate = (slug, newPhotoArray) => {
         // Backend returns an array, we take the first/only path for the static field
         const newPath = newPhotoArray[0]?.path || '';
         console.log(newPath);
         setUser(prev => ({ ...prev, profile_picture: newPath }));
    };

    const handleFinancialUpdate = (newFinancialData) => {
        setUser(prev => ({
            ...prev,
            financial_profile: newFinancialData || undefined
        }));
    };

    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                userType: user.userType,
                collaboratorType: user.collaboratorType,
                agencyType: user.agencyType,
            };
            const updatedUser = await updateExistingUser(userId, payload);
            setUser(updatedUser); 
            toast.success(`Profile updated successfully!`);
        } catch (error) {
            toast.error(error.message || "Profile update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading || !user || !userConfig || !globalData) {
        return <p>Loading...</p>;
    }

    const initialFormData = { ...user, ...user.groupSpecificAttributes }; 
    const photoAttributes = userConfig.fields.filter(field => field.attributeDetails?.fieldType === 'image_array');


    const profilePicData = user.profile_picture 
    ? [{ 
        path: user.profile_picture, 
        name: 'Profile Picture', 
        uploadedAt: new Date() // Optional, avoids "Invalid Date"
      }] 
    : [];

    return (
        <Container fluid>
            <div className="mb-3">
                <Link to={`/admin/collaborators/${user._id}`}>
                    <Button color="secondary" outline >
                        <FaArrowLeft /> Back to user
                    </Button>
                </Link>
            </div>
            <Title title={`Edit User: ${user.name}`} />
            <Row>
                <Col md={8}>
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
                    {/* 1. Static Profile Picture Manager */}
                    <Widget title="Primary Photo">
                        <SingleAttributeManager
                            userId={userId}
                            attributeSlug="profile_picture" // Special slug handled by backend
                            attributeLabel="Profile Picture"
                            currentFiles={profilePicData}
                            onUpdate={handleProfilePicUpdate}
                            mode="image"
                            // onPhotosUpdate={handleProfilePicUpdate}
                        />
                    </Widget>

                    {/* 2. Dynamic Gallery Manager(s) */}
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