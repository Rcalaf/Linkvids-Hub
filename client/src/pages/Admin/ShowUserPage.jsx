// client/src/pages/Admin/ShowUserPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Container, Row, Col, ListGroup, ListGroupItem, Badge, Card, CardBody, 
    CardTitle, Button, Modal, ModalBody, ModalHeader, Alert 
} from 'reactstrap';
import { toast } from 'react-toastify';
import { 
    FaExternalLinkAlt, FaArrowLeft, FaUserShield, FaStickyNote, 
    FaBriefcase, FaChartLine 
} from 'react-icons/fa';

import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import StarRating from '../../components/Rating/StarRating'; 
import { usePermissions } from '../../hooks/usePermissions';
import { getUserById } from '../../services/userService';
import { getAllUserTypes } from '../../services/userTypeService';

export default function ShowUserPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { can } = usePermissions();
    
    const [user, setUser] = useState(null);
    const [userConfig, setUserConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Lightbox State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState({ path: '', name: '' });

    useEffect(() => {
        loadUserDataAndConfigs();
    }, [userId]); 

    const toggleModal = () => setModalOpen(!modalOpen);
    const openLightbox = (image) => { setModalImage(image); setModalOpen(true); };

    const loadUserDataAndConfigs = async () => {
        setIsLoading(true);
        try {
            const [userData, configs] = await Promise.all([
                getUserById(userId), 
                getAllUserTypes()
            ]);

            const typeSlug = userData.collaboratorType || userData.agencyType;
            const config = configs.find(c => c.slug === typeSlug);

            if (!config) throw new Error("User configuration schema not found.");
            
            setUser(userData);
            setUserConfig(config);
            
        } catch (error) {
            toast.error("Failed to load user profile: " + error.message);
            navigate('/admin/collaborators', { replace: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    const getAttributeValue = (slug, user) => {
        if (user.hasOwnProperty(slug)) return user[slug];
        return user.groupSpecificAttributes ? user.groupSpecificAttributes[slug] : undefined;
    };
    
    const renderValue = (value, fieldType) => {
        if (value === null || value === undefined || value === "") return <Badge color="secondary">N/A</Badge>;
        if (fieldType === 'boolean') return value ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>;
        if (fieldType === 'date') return new Date(value).toLocaleDateString();
        if (fieldType === 'url') return <a href={value} target="_blank" rel="noopener noreferrer">{value} <FaExternalLinkAlt size={10} /></a>;

        if (Array.isArray(value)) {
            if (fieldType === 'image_array') {
                 return (
                    <div className="d-flex flex-wrap">
                        {value.map(item => (
                            <img key={item.path} src={item.path} alt={item.name} onClick={() => openLightbox(item)}
                                style={{ width: '80px', height: '80px', objectFit: 'cover', margin: '5px', borderRadius: '4px', cursor: 'pointer' }} />
                        ))}
                        {value.length === 0 && <Badge color="secondary">None</Badge>}
                    </div>
                );
            }
            return value.map((v, i) => <Badge key={i} color="primary" className="me-1" pill>{v}</Badge>);
        }
        if (fieldType === 'select') return <Badge color="info">{String(value)}</Badge>;
        return String(value);
    };
    
    if (isLoading || !user || !userConfig) return <p>Loading user profile...</p>;

    const groupedFields = userConfig.fields.reduce((acc, field) => {
        const section = field.section || 'Other Details';
        if (!acc[section]) acc[section] = [];
        acc[section].push(field);
        return acc;
    }, {});

    // 🚨 Safe Access to Stats
    const jobStats = user.jobRatingStats || { average: 0, count: 0 };
    const adminRating = user.adminRating || 0;

    return (
        <Container fluid>
            <Title title={`User Profile: ${user.name}`} />
            <h5 className="text-muted mb-4">{userConfig.name} ({user.email})</h5>

            <Row>
                <Col md={4} className="mb-4">
                    {/* Core Info Card */}
                    <Card className="shadow-sm border-0 mb-3">
                        <img 
                            src={user.profile_picture || 'https://placehold.co/400x400?text=No+Image'} 
                            alt={`${user.name} profile`}
                            style={{ width: '100%', height: '300px', objectFit: 'cover', borderTopLeftRadius: '0.375rem', borderTopRightRadius: '0.375rem' }}
                        />
                        <CardBody>
                            <CardTitle tag="h6" className="text-uppercase text-primary mb-3">Core Account Info</CardTitle>
                            <ListGroup flush className="small">
                                <ListGroupItem className="px-0"><strong>User ID:</strong> <span className="text-muted">{user._id}</span></ListGroupItem>
                                <ListGroupItem className="px-0"><strong>Name:</strong> {user.first_name} {user.last_name}</ListGroupItem>
                                <ListGroupItem className="px-0"><strong>User Type:</strong> <Badge color="warning">{user.userType}</Badge></ListGroupItem>
                                <ListGroupItem className="px-0"><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</ListGroupItem>
                                <ListGroupItem className="px-0"><strong>Location:</strong> {user.city}, {user.country}</ListGroupItem>
                            </ListGroup>
                        </CardBody>
                    </Card>

                    {/* 🚨 PERFORMANCE PROFILE CARD (UPDATED) */}
                    <Card className="shadow-sm border-0 mb-4">
                        <CardBody className="bg-light rounded">
                            <CardTitle tag="h6" className="text-uppercase text-dark mb-3 d-flex align-items-center">
                                <FaChartLine className="me-2 text-primary" /> 
                                Performance Profile
                            </CardTitle>

                            {/* 1. Job Performance (Automatic) */}
                            <div className="mb-3 bg-white p-3 rounded border">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="fw-bold small text-muted"><FaBriefcase className="me-1"/> Job Performance</span>
                                    <Badge color="info" pill>{jobStats.count} Reviews</Badge>
                                </div>
                                <div className="d-flex align-items-center">
                                    <StarRating rating={jobStats.average} readonly={true} size={20} />
                                    <span className="ms-2 fw-bold text-dark">{jobStats.average || 0}/5</span>
                                </div>
                            </div>

                            {/* 2. Internal Admin Rating (Manual) */}
                            <div className="mb-3 bg-white p-3 rounded border">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="fw-bold small text-muted"><FaUserShield className="me-1"/> Internal Score</span>
                                </div>
                                <div className="d-flex align-items-center">
                                    <StarRating rating={adminRating} readonly={true} size={20} />
                                    <span className="ms-2 fw-bold text-dark">{adminRating || 0}/5</span>
                                </div>
                            </div>

                            {/* 3. Admin Notes */}
                            {user.adminRatingNotes && (
                                <Alert color="warning" className="mb-0 border-0 bg-white text-dark shadow-sm small">
                                    <div className="d-flex align-items-center mb-2 text-warning fw-bold">
                                        <FaStickyNote className="me-2" /> Admin Notes
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                        "{user.adminRatingNotes}"
                                    </div>
                                </Alert>
                            )}
                        </CardBody>
                    </Card>

                    <div className="d-flex gap-2">
                        <Link to="/admin/collaborators" style={{flex: 1}}>
                            <Button color="secondary" outline block><FaArrowLeft className="me-1"/> Back</Button>
                        </Link>
                     {can('collaborators', 'edit') && (
                         <Link to={`/admin/collaborators/${userId}/edit`} style={{flex: 1}}>
                            <Button color="primary" block>Edit Profile</Button>
                        </Link>
                     )}
                    </div>
                </Col>

                <Col md={8}>
                    {Object.entries(groupedFields).map(([section, fields]) => (
                        <Widget key={section} title={section} className="mb-4">
                            <ListGroup flush>
                                {fields.map(field => {
                                    const slug = field.attributeDetails?.slug;
                                    const value = getAttributeValue(slug, user);
                                    if (!slug) return null;

                                    return (
                                        <ListGroupItem key={slug} className="d-flex justify-content-between align-items-start px-0">
                                            <strong className="text-muted">{field.label}:</strong>
                                            <div className="text-end" style={{maxWidth: '60%'}}>
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
            
            <Modal isOpen={modalOpen} toggle={toggleModal} size="lg" centered>
                <ModalHeader toggle={toggleModal}>{modalImage.name || 'Image Preview'}</ModalHeader>
                <ModalBody className="text-center">
                    <img src={modalImage.path} alt="Full Size" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
                </ModalBody>
            </Modal>
        </Container>
    );
}