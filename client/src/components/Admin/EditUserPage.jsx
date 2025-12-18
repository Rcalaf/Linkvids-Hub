// client/src/pages/Admin/EditUserPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import DynamicUserForm from '../../components/Admin/DynamicUserForm';
import PhotoUploadManager from '../../components/Admin/PhotoUploadManager'; 
import FinancialProfileManager from '../../components/Admin/FinancialProfileManager'; 
import { getUserById, updateExistingUser } from '../../services/userService';
import { getAllUserTypes } from '../../services/userTypeService';
import { getStaticLists } from '../../services/staticDataService';



export default function EditUserPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    const [user, setUser] = useState(null);
    const [userConfig, setUserConfig] = useState(null);
    const [globalData, setGlobalData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Slug for the photo attribute (must be consistent with the UserTypeConfig)
    const PHOTO_ARRAY_SLUG = 'profile_photos'; 

    useEffect(() => {
        loadUserDataAndConfigs();
    }, [userId]); // Reload if userId changes

    const loadUserDataAndConfigs = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch user data, config schemas, and static lists concurrently
            const [userData, configs, staticLists] = await Promise.all([
                getUserById(userId),
                getAllUserTypes(),
                getStaticLists()
            ]);

            // 2. Identify the specific schema based on the user's type slug
            const typeSlug = userData.collaboratorType || userData.agencyType;
            const config = configs.find(c => c.slug === typeSlug);

            if (!config) {
                throw new Error("User configuration schema not found.");
            }

            setUser(userData);
            setUserConfig(config);
            setGlobalData(staticLists);
            
        } catch (error) {
            toast.error(error.message || "Failed to load user data for editing.");
            navigate('/admin/users', { replace: true }); // Redirect on fail
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handler to update photo state when files are uploaded
    const handlePhotosUpdate = (newPhotoArray) => {
        // Update the user state by merging the new photo array into groupSpecificAttributes
        setUser(prev => ({
            ...prev,
            groupSpecificAttributes: {
                ...prev.groupSpecificAttributes,
                [PHOTO_ARRAY_SLUG]: newPhotoArray 
            }
        }));
        toast.info("Profile photo array updated successfully.");
        // Note: The photo array is now saved directly to the DB in the fileController, 
        // but updating local state is good practice.
    };


    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            // 1. Combine Formik values with dynamic/discriminator IDs
            const payload = {
                // Spread all data from Formik (includes BaseUser fields and dynamic attributes)
                ...formData,
                // Ensure required discriminator IDs are included
                userType: user.userType,
                collaboratorType: user.collaboratorType,
                agencyType: user.agencyType,
                // Note: Password field will only update if user enters a new value
            };

            // 2. 🚨 Execute the UPDATE API call 🚨
            const updatedUser = await updateExistingUser(userId, payload);
            
            // 3. Update local state with fresh data and notify user
            setUser(updatedUser); 
            toast.success(`Profile for ${updatedUser.name} updated successfully!`);

        } catch (error) {
            toast.error(error.message || "Profile update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinancialUpdate = (newFinancialData) => {
        setUser(prevUser => ({
            ...prevUser,
            financial_profile: newFinancialData || undefined
        }));
    };
    
    if (isLoading || !user || !userConfig || !globalData) {
        return <p>Loading user data and configurations...</p>;
    }

    // Merge BaseUser fields and Dynamic Attributes for Formik initialization
    const initialFormData = { ...user, ...user.groupSpecificAttributes }; 

    return (
        <Container fluid>
            <Title title={`Edit User: ${user.name} (${userConfig.name})`} />

            <Row>
                {/* User Data Form (Left/Main Column) */}
                <Col md={8}>
                    <Widget title="User Details and Attributes">
                        {/* The DynamicUserForm handles both CREATE and EDIT by consuming initialData */}
                        <DynamicUserForm
                            userConfig={userConfig}
                            initialData={initialFormData} 
                            onSubmit={handleFormSubmit}
                            isSubmitting={isSubmitting}
                            globalStaticLists={globalData}
                            isEditing={true} // Indicate this is an edit form
                        />
                    </Widget>
                </Col>

                {/* Photo Management (Right Column) */}
                <Col md={4}>
                    <PhotoUploadManager
                        userId={userId}
                        attributeSlug={PHOTO_ARRAY_SLUG} 
                        currentPhotos={user.groupSpecificAttributes[PHOTO_ARRAY_SLUG] || []}
                        onPhotosUpdate={handlePhotosUpdate}
                    />
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={12}>
                    <FinancialProfileManager userId={userId} onUpdate={handleFinancialUpdate} />
                </Col>
            </Row>
            
        </Container>
    );
}