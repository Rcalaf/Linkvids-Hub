// client/src/pages/Admin/ShowUserPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, ListGroup, ListGroupItem, Badge, Card, CardBody, CardTitle, Button, Modal, ModalBody, ModalHeader } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import { getUserById } from '../../services/userService';
import { getAllUserTypes } from '../../services/userTypeService';
import { FaExternalLinkAlt, FaArrowLeft} from 'react-icons/fa';
import { usePermissions } from '../../hooks/usePermissions';

export default function ShowUserPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [user, setUser] = useState(null);
    const [userConfig, setUserConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // STATE FOR LIGHTBOX
    const [modalOpen, setModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState({ path: '', name: '' });

    // Toggle function for the modal
    const toggleModal = () => setModalOpen(!modalOpen);

    // Function to open the modal with a specific image
    const openLightbox = (image) => {
        setModalImage(image);
        setModalOpen(true);
    };

    useEffect(() => {
        loadUserDataAndConfigs();
    }, [userId]); 

    const loadUserDataAndConfigs = async () => {
        setIsLoading(true);
        try {
            const [userData, configs] = await Promise.all([
                getUserById(userId),
                getAllUserTypes()
            ]);

            const typeSlug = userData.collaboratorType || userData.agencyType;
            const config = configs.find(c => c.slug === typeSlug);

            if (!config) {
                throw new Error("User configuration schema not found.");
            }

            setUser(userData);
            setUserConfig(config);
            
        } catch (error) {
            toast.error("Failed to load user profile: " + error.message);
            navigate('/admin/collaborators', { replace: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    /** Gets the attribute value, checking BaseUser first, then groupSpecificAttributes. */
    const getAttributeValue = (slug, user) => {
        if (user.hasOwnProperty(slug)) {
            return user[slug];
        }
        return user.groupSpecificAttributes ? user.groupSpecificAttributes[slug] : undefined;
    };
    
    /** Renders the value in a human-readable format based on its type. */
    const renderValue = (value, fieldType) => {
        if (value === null || value === undefined || value === "") {
            return <Badge color="secondary">N/A</Badge>;
        }
        
        if (fieldType === 'boolean') {
            return value ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>;
        }
        
        if (fieldType === 'date') {
            return new Date(value).toLocaleDateString();
        }

        if (fieldType === 'url') {
            return <a href={value} target="_blank" rel="noopener noreferrer">{value} <FaExternalLinkAlt size={10} /></a>;
        }

        if (Array.isArray(value)) {
            // --- IMAGE ARRAY STYLE with Lightbox Integration ---
            if (fieldType === 'image_array') {
                 return (
                    <div className="d-flex flex-wrap">
                        {value.map(item => (
                            <img 
                                key={item.path} 
                                src={item.path} 
                                alt={item.name} 
                                onClick={() => openLightbox(item)}
                                style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    objectFit: 'cover', 
                                    margin: '5px', 
                                    borderRadius: '4px',
                                    cursor: 'pointer' 
                                }} 
                            />
                        ))}
                        {value.length === 0 && <Badge color="secondary">None</Badge>}
                    </div>
                );
            }
            // General array/multi-select output
            return value.map((v, i) => (
                <Badge key={i} color="primary" className="me-1" pill>
                    {v}
                </Badge>
            ));
        }

        // Select / Single-choice style
        if (fieldType === 'select') {
            return <Badge color="info">{String(value)}</Badge>;
        }
        
        // Default for text, number, mixed
        return String(value);
    };
    
    // --- Main Rendering ---
    if (isLoading || !user || !userConfig) {
        return <p>Loading user profile...</p>;
    }

    // Group the configuration fields by section
    const groupedFields = userConfig.fields.reduce((acc, field) => {
        const section = field.section || 'Other Details';
        if (!acc[section]) acc[section] = [];
        acc[section].push(field);
        return acc;
    }, {});

    const financial = user.financial_profile || {};

    return (
        <Container fluid>
            

            <Title title={`User Profile: ${user.name}`} />
            <h5 className="text-muted mb-4">{userConfig.name} ({user.email})</h5>

            <Row>
                {/* General Information Card (Static/Core Data) */}
                <Col md={4} className="mb-4">
                    <Card>
                        <img 
                            src={user.profile_picture || 'https://placehold.co/400x400?text=No+Image'} 
                            alt={`${user.name} profile`}
                            style={{ 
                                width: '100%', 
                                height: '300px', 
                                objectFit: 'cover',
                                borderBottom: '1px solid #dfdfdf'
                            }}
                        />
                        <CardBody>
                            <CardTitle tag="h6" className="text-uppercase text-primary">Core Account Info</CardTitle>
                            <ListGroup flush>
                                <ListGroupItem><strong>User ID:</strong> {user._id}</ListGroupItem>
                                <ListGroupItem><strong>Name:</strong> {user.first_name} {user.last_name}</ListGroupItem>
                                <ListGroupItem><strong>User Type:</strong> <Badge color="warning">{user.userType}</Badge></ListGroupItem>
                                <ListGroupItem><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</ListGroupItem>
                                
                                <ListGroupItem><strong>Phone:</strong> {user.phone || <Badge color="secondary">N/A</Badge>}</ListGroupItem>
                                <ListGroupItem><strong>Location:</strong> {user.city}, {user.country}</ListGroupItem>
                            </ListGroup>
                        </CardBody>
                    </Card>
                    
                    <Card title="Financial Information" className="mt-3">
                         <CardBody>
                        <CardTitle tag="h6" className="text-uppercase text-primary">Financial & Billing Information</CardTitle>
                        {financial.profileType ? (
                            <ListGroup flush>
                                <ListGroupItem><strong>Entity:</strong> <Badge color="dark">{financial.profileType}</Badge></ListGroupItem>
                                <ListGroupItem><strong>Tax ID:</strong> {financial.taxId || financial.nationalId || '-'}</ListGroupItem>
                                <ListGroupItem><strong>Name:</strong> {financial.companyName || financial.billingContactName}</ListGroupItem>
                                <ListGroupItem><strong>Email:</strong> {financial.billingEmail}</ListGroupItem>
                                <ListGroupItem><strong>Address:</strong> <br/><small>{financial.fiscalAddress}</small></ListGroupItem>
                                <ListGroupItem className="bg-light"><strong>IBAN:</strong> {financial.iban || 'Not set'}</ListGroupItem>
                            </ListGroup>
                        ) : (
                            <p className="text-muted p-2">No financial data provided.</p>
                        )}
                        </CardBody>
                    </Card>
                    <div className="mt-3 d-flex gap-2">
                        <Link to="/admin/collaborators">
                            <Button color="secondary" outline >
                                <FaArrowLeft /> Back to List
                            </Button>
                        </Link>
                     {can('collaborators', 'edit') && (
                         <Link to={`/admin/collaborators/${userId}/edit`}>
                            <Button color="secondary">Go to Edit Form</Button>
                        </Link>
                     )}
                    </div>
                </Col>

                {/* Dynamic Attributes & Details (Right Column) */}
                <Col md={8}>
                    {Object.entries(groupedFields).map(([section, fields]) => (
                        <Widget key={section} title={section}>
                            <ListGroup flush>
                                {fields.map(field => {
                                    const slug = field.attributeDetails?.slug;
                                    const value = getAttributeValue(slug, user);
                                    
                                    // Skip if slug is invalid
                                    if (!slug) return null;

                                    return (
                                        <ListGroupItem key={slug} className="d-flex justify-content-between align-items-start">
                                            <strong>{field.label}:</strong>
                                            <div>
                                                {renderValue(value, field.attributeDetails?.fieldType)}
                                            </div>
                                        </ListGroupItem>
                                    );
                                })}
                            </ListGroup>
                        </Widget>
                    ))}
                    
                </Col>
            </Row>
            
            {/* LIGHTBOX/MODAL COMPONENT */}
            <Modal isOpen={modalOpen} toggle={toggleModal} size="lg" centered>
                <ModalHeader toggle={toggleModal}>{modalImage.name || 'Full Size Image'}</ModalHeader>
                <ModalBody className="text-center">
                    <img src={modalImage.path} alt="Full Size" style={{ maxWidth: '100%', height: 'auto' }} />
                </ModalBody>
            </Modal>
        </Container>
    );
}