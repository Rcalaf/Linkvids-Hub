// client/src/pages/Admin/ManageUsers.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Input, FormGroup, Label } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import DynamicUserForm from '../../components/Admin/DynamicUserForm';

// Services
import { getAllUserTypes } from '../../services/userTypeService'; 
import { createNewUser } from '../../services/userService'; // Needs to be created
import { getStaticLists } from '../../services/staticDataService'; // 🚨 REQUIRED IMPORT 🚨

export default function CreateUsers() {
    const [userConfigs, setUserConfigs] = useState([]);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [globalStaticLists, setGlobalStaticLists] = useState(null); // 🚨 NEW STATE FOR GLOBAL DATA 🚨

    useEffect(() => {
        fetchConfigsAndStaticData(); // Call combined fetch function on mount
    }, []);

    const fetchConfigsAndStaticData = async () => {
        setIsLoading(true);
        try {
            // Fetch configuration schemas and the static lists in parallel
            const [configs, staticData] = await Promise.all([
                getAllUserTypes(),
                getStaticLists() 
            ]);
            
            setUserConfigs(configs);
            setGlobalStaticLists(staticData); // Save static data
            
            if (configs.length > 0) {
                setSelectedConfig(configs[0]); // Auto-select the first type
            }
        } catch (error) {
            toast.error("Failed to load necessary form data (config or global lists).");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTypeChange = (e) => {
        const slug = e.target.value;
        // Find the full config object associated with the selected slug
        const config = userConfigs.find(c => c.slug === slug);
        setSelectedConfig(config);
    };
    
    // Handles submission from the DynamicUserForm
    const handleFormSubmit = async (formData, config) => {
        setIsSubmitting(true);
        
        // Structure the payload for the Node.js API
        const payload = {
            ...formData,
            // Mandatory Discriminator and Dynamic Keys
            userType: config.parentType, 
            collaboratorType: config.parentType === 'Collaborator' ? config.slug : undefined,
            agencyType: config.parentType === 'Agency' ? config.slug : undefined, 
        };

        try {
            const newUser = await createNewUser(payload); // Call the user creation service
            toast.success(`${config.name} user '${newUser.email}' created successfully!`);
        } catch (error) {
            const msg = error.response?.data?.message || "User creation failed.";
            toast.error(`Creation Failed: ${msg}`);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // const handleFormSubmit = async (formData, config) => {
    //     setIsSubmitting(true);
        
    //     // Structure the payload for the Node.js API
    //     const payload = {
    //         ...formData,
    //         // Mandatory Discriminator and Dynamic Keys
    //         userType: config.parentType, 
    //         collaboratorType: config.parentType === 'Collaborator' ? config.slug : undefined,
    //         agencyType: config.parentType === 'Agency' ? config.slug : undefined, 
    //     };

    //     try {
    //         const newUser = await createNewUser(payload); // 🚨 Execute Service Call 🚨
    //         toast.success(`${config.name} user '${newUser.email}' created successfully!`);
            
    //         // Optional: Reset form state or redirect after successful creation
    //         // setSelectedConfig(null); 

    //     } catch (error) {
    //         const msg = error.message; 
    //         toast.error(`Creation Failed: ${msg}`);
    //         console.error(error);
    //     } finally {
    //         setIsSubmitting(false);
    //     }
    // };

    if (isLoading || !globalStaticLists) {
        return <p>Loading configurations and global data...</p>;
    }

    return (
        <Container fluid>
            <Title title="Create New User" />

            <Row className="mb-4">
                <Col md={12}>
                    <Widget title="Select User Type">
                        <FormGroup>
                            <Label for="userTypeSelector">User Type</Label>
                            <Input 
                                type="select" 
                                id="userTypeSelector" 
                                value={selectedConfig?.slug || ''} 
                                onChange={handleTypeChange}
                                disabled={!userConfigs.length}
                            >
                                {userConfigs.map(config => (
                                    <option key={config.slug} value={config.slug}>
                                        {config.name} ({config.parentType})
                                    </option>
                                ))}
                            </Input>
                        </FormGroup>
                    </Widget>
                </Col>
            </Row>
            
            <Row>
                <Col md={12}>
                    <Widget title={`New ${selectedConfig?.name || 'User'} Profile`}>
                        {selectedConfig ? (
                            // 🚨 PASS THE GLOBAL STATIC LISTS AS A PROP 🚨
                            <DynamicUserForm 
                                userConfig={selectedConfig} 
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                                globalStaticLists={globalStaticLists} // Required by DynamicUserForm
                            />
                        ) : (
                            <p>No user types configured. Please create one in the User Type Configuration area.</p>
                        )}
                    </Widget>
                </Col>
            </Row>
        </Container>
    );
}