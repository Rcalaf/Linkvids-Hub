import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, Button, Badge, 
    ListGroup, ListGroupItem, Progress, Modal, ModalHeader, ModalBody, ModalFooter 
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { 
    FaBriefcase, FaUserCircle, FaArrowRight, FaCalendarAlt, 
    FaCheckCircle, FaExclamationCircle, FaNewspaper, FaExternalLinkAlt 
} from 'react-icons/fa';
// 🚨 Import Markdown Renderer
import ReactMarkdown from 'react-markdown'; 

// Components
import JobStatusBadge from '../../components/Job/JobStatusBadge';
import Widget from '../../components/Widget/Widget';

// Services
import { getAllJobs } from '../../services/jobService';
import { getDashboardStats } from '../../services/userService'; 
import { getNewsFeed } from '../../services/newsService';
import { useAuth } from '../../hooks/useAuth';

export default function CreatorDashboard() {
    const { auth } = useAuth();
    const user = auth.user;

    // Data State
    const [recentJobs, setRecentJobs] = useState([]);
    const [news, setNews] = useState([]); 
    const [stats, setStats] = useState({
        activeApplications: 0,
        jobsCompleted: 0,
        totalEarnings: 0,
        profileCompleteness: 0,
        missingRequirements: [] 
    });
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const myRole = user?.collaboratorType || user?.agencyType;
            
            const [jobsResult, statsResult, newsResult] = await Promise.all([
                getAllJobs({ limit: 5, status: 'Open', targetRole: myRole }),
                getDashboardStats(),
                getNewsFeed({ limit: 5 }) 
            ]);
            
            setRecentJobs(jobsResult.data);
            setNews(newsResult || []);
            
            if (statsResult) {
                setStats(statsResult);
            }
    
        } catch (error) {
            console.error("Dashboard Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const completeness = stats.profileCompleteness;

    // Helper to open news modal
    const openNewsModal = (item) => {
        setSelectedNews(item);
        setModalOpen(true);
    };

    const toggleModal = () => {
        setModalOpen(!modalOpen);
        setSelectedNews(null);
    };

    return (
        <Container fluid>
            {/* 1. Welcome Banner */}
            <div className="bg-white p-4 rounded shadow-sm mb-4 border-start border-5 border-primary">
                <Row className="align-items-center">
                    <Col md={8}>
                        <h2 className="fw-bold text-primary mb-1">Welcome back, {user?.name}!</h2>
                        <p className="text-muted mb-0">
                            You are logged in as: <Badge color="info" className="text-uppercase">{user?.collaboratorType || 'Collaborator'}</Badge>
                        </p>
                    </Col>
                </Row>
            </div>

            <Row>
                {/* LEFT COLUMN: News & Jobs */}
                <Col lg={8}>
                    
                    {/* 2. NEWS WIDGET (Conditional Render) */}
                    {news.length > 0 && (
                        <Widget title="Latest Announcements" className="mb-4">
                            <ListGroup flush>
                                {news.map(item => (
                                    <ListGroupItem key={item._id} className="p-3 border-bottom action-hover">
                                        <Row className="align-items-start">
                                            {/* Content Column */}
                                            <Col sm={8} xs={12}>
                                                <div className="d-flex align-items-center mb-1">
                                                    <h6 
                                                        className="mb-0 fw-bold text-dark" 
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => openNewsModal(item)}
                                                    >
                                                        {item.title}
                                                    </h6>
                                                    <Badge color="light" className="text-muted border ms-2" pill>
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </Badge>
                                                </div>
                                                
                                                {/* 🚨 Use ReactMarkdown for Excerpt (Optional but cleaner) */}
                                                <div className="text-muted mb-2 small" style={{ fontSize: '0.9rem' }}>
                                                    <ReactMarkdown 
                                                        components={{ p: ({node, ...props}) => <p style={{margin:0}} {...props}/> }}
                                                    >
                                                        {item.excerpt}
                                                    </ReactMarkdown>
                                                </div>
                                            </Col>
                                            
                                            {/* Action Column */}
                                            <Col sm={4} xs={12} className="text-end">
                                                {item.linkUrl ? (
                                                    <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button color="light" size="sm" className="border fw-bold text-primary">
                                                            <FaExternalLinkAlt className="me-2" size={10} />
                                                            Visit
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <Button 
                                                        color="light" 
                                                        size="sm" 
                                                        className="border fw-bold text-dark"
                                                        onClick={() => openNewsModal(item)}
                                                    >
                                                        Read
                                                    </Button>
                                                )}
                                            </Col>
                                        </Row>
                                    </ListGroupItem>
                                ))}
                            </ListGroup>
                        </Widget>
                    )}

                    {/* 3. JOBS WIDGET */}
                    <Widget title={`Newest Job Opportunities`}>
                        {loading ? <p className="text-muted p-3">Finding matching jobs...</p> : (
                            <>
                                {recentJobs.length > 0 ? (
                                    <ListGroup flush>
                                        {recentJobs.map(job => (
                                            <ListGroupItem key={job._id} className="p-3 border-bottom action-hover">
                                                <Row className="align-items-center">
                                                    <Col md={8}>
                                                        <div className="d-flex align-items-center mb-1">
                                                            <h5 className="mb-0 fw-bold text-dark">
                                                                <Link to={`/creator/jobs/${job._id}`} className="text-decoration-none text-dark">
                                                                    {job.projectName}
                                                                </Link>
                                                            </h5>
                                                            <div className="ms-2">
                                                                <JobStatusBadge job={job} />
                                                            </div>
                                                        </div>
                                                        <small className="text-muted">
                                                            <FaCalendarAlt className="me-1" />
                                                            {new Date(job.projectStartDate).toLocaleDateString()}
                                                            <span className="mx-2">•</span>
                                                            {job.projectLanguage}
                                                        </small>
                                                        <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                                                            {job.projectDescription.substring(0, 120)}...
                                                        </p>
                                                    </Col>
                                                    <Col md={4} className="text-end mt-2 mt-md-0">
                                                        <Link to={`/creator/jobs/${job._id}`}>
                                                            <Button 
                                                                color={job.hasApplied ? "success" : "light"} 
                                                                outline={!job.hasApplied}
                                                                size="sm" 
                                                                className={job.hasApplied ? "border fw-bold" : "border fw-bold text-dark"}
                                                            >
                                                                {job.hasApplied ? 'View Status' : 'View Details'}
                                                            </Button>
                                                        </Link>
                                                    </Col>
                                                </Row>
                                            </ListGroupItem>
                                        ))}
                                    </ListGroup>
                                ) : (
                                    <div className="text-center py-5">
                                        <FaBriefcase className="text-muted opacity-25 mb-3" size={40} />
                                        <h5>No new jobs found</h5>
                                        <p className="text-muted">We will notify you when new projects match your profile.</p>
                                    </div>
                                )}
                                
                                {recentJobs.length > 0 && (
                                    <div className="text-center mt-3">
                                        <Link to="/creator/jobs" className="text-decoration-none fw-bold">
                                            View All Jobs <FaArrowRight className="ms-1" size={12} />
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </Widget>
                </Col>

                {/* RIGHT COLUMN: Profile & Stats */}
                <Col lg={4}>
                    
                    {/* 4. Profile Completeness Widget */}
                    <Card className="shadow-sm mb-4">
                        <CardBody>
                            <h6 className="fw-bold mb-3 d-flex align-items-center">
                                <FaUserCircle className="me-2 text-primary" /> Profile Status
                            </h6>
                            <div className="mb-2 d-flex justify-content-between">
                                <span className="text-muted small">Completeness</span>
                                <span className="fw-bold small">{completeness}%</span>
                            </div>
                            <Progress 
                                value={completeness} 
                                color={completeness === 100 ? "success" : completeness > 50 ? "info" : "warning"} 
                                className="mb-3" 
                                style={{ height: '8px' }} 
                            />                            
                            {completeness < 100 ? (
                                <div className="alert alert-light border p-3 mb-3">
                                    <div className="d-flex align-items-start">
                                        <FaExclamationCircle className="text-warning me-2 mt-1 flex-shrink-0" />
                                        <div>
                                            <strong className="d-block text-dark mb-1">Missing Information:</strong>
                                            
                                            <ul className="mb-0 ps-3 small text-muted">
                                                {stats.missingRequirements && stats.missingRequirements.length > 0 ? (
                                                    stats.missingRequirements.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))
                                                ) : (
                                                    <li>Complete your profile details</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-success p-2 mb-3">
                                    <small><FaCheckCircle className="me-1"/> Your profile is 100% ready!</small>
                                </div>
                            )}

                            <Link to="/creator/profile">
                                <Button outline color="secondary" block size="sm" className="w-100">
                                    Edit Profile
                                </Button>
                            </Link>
                        </CardBody>
                    </Card>

                    {/* 5. Stats Widget */}
                    <Widget title="My Activity">
                        {loading ? <p className="text-muted">Loading stats...</p> : (
                            <ListGroup flush>
                                
                                {/* 1. Active Applications */}
                                <ListGroupItem className="d-flex justify-content-between align-items-center px-0">
                                    <div>
                                        Active Applications
                                        <Link 
                                            to="/creator/jobs" 
                                            state={{ initialStatus: 'Applied' }}
                                            className="ms-2 text-decoration-none small text-primary"
                                        >
                                            <small>View</small> <FaExternalLinkAlt size={10} style={{ marginBottom: '2px' }} />
                                        </Link>
                                    </div>
                                    <Badge color="primary" pill>
                                        {stats.activeApplications}
                                    </Badge>
                                </ListGroupItem>

                                <ListGroupItem className="d-flex justify-content-between align-items-center px-0">
                                    <div>
                                        Jobs Assigned
                                        <Link 
                                            to="/creator/jobs" 
                                            state={{ initialStatus: 'Assigned' }} // Filters list to assigned jobs
                                            className="ms-2 text-decoration-none small text-primary"
                                        >
                                            <small>View</small> <FaExternalLinkAlt size={10} style={{ marginBottom: '2px' }} />
                                        </Link>
                                    </div>
                                    <Badge color="primary" pill>
                                        {stats.assignedJobs || 0}
                                    </Badge>
                                </ListGroupItem>

                                <ListGroupItem className="d-flex justify-content-between align-items-center px-0">
                                    <div>
                                        Jobs Completed
                                        <Link 
                                            to="/creator/jobs" 
                                            state={{ initialStatus: 'Completed' }}
                                            className="ms-2 text-decoration-none small text-success"
                                        >
                                            <small>View</small> <FaExternalLinkAlt size={10} style={{ marginBottom: '2px' }} />
                                        </Link>
                                    </div>
                                    <Badge color="success" pill>
                                        {stats.jobsCompleted}
                                    </Badge>
                                </ListGroupItem>

                                {/* 3. Rejected Applications */}
                                <ListGroupItem className="d-flex justify-content-between align-items-center px-0">
                                    Rejected Applications
                                    <Badge color="danger" pill>
                                        {stats.rejectedApplications || 0}
                                    </Badge>
                                </ListGroupItem>

                                {/* 4. Jobs Completed */}
                                

                                {/* 5. Earnings */}
                                <ListGroupItem className="d-flex justify-content-between align-items-center px-0">
                                    Total Earnings
                                    <span className="fw-bold text-success">
                                        {stats.totalEarnings.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                </ListGroupItem>
                            </ListGroup>
                        )}
                    </Widget>
                </Col>
            </Row>

            {/* 6. NEWS READER MODAL (UPDATED WITH MARKDOWN) */}
            <Modal isOpen={modalOpen} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    <FaNewspaper className="me-2 text-primary" />
                    {selectedNews?.title}
                </ModalHeader>
                <ModalBody className="p-4" style={{ lineHeight: '1.7', fontSize: '1rem' }}>
                    {/* 🚨 Render Markdown Content */}
                    <ReactMarkdown 
                        components={{
                            a: ({node, ...props}) => <a style={{color: '#0d6efd', fontWeight: 'bold'}} target="_blank" rel="noopener noreferrer" {...props} />,
                            img: ({node, ...props}) => <img style={{maxWidth: '100%', height: 'auto', borderRadius: '8px', margin: '15px 0'}} {...props} />,
                            h1: ({node, ...props}) => <h2 className="mt-4 mb-3 border-bottom pb-2" {...props} />,
                            h2: ({node, ...props}) => <h3 className="mt-4 mb-3" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-start border-4 border-primary ps-3 fst-italic text-muted my-3" {...props} />
                        }}
                    >
                        {selectedNews?.content}
                    </ReactMarkdown>
                </ModalBody>
                <ModalFooter>
                    {selectedNews?.linkUrl && (
                         <a href={selectedNews.linkUrl} target="_blank" rel="noopener noreferrer" className="me-auto">
                            <Button color="primary" outline>
                                <FaExternalLinkAlt className="me-2" /> Visit External Link
                            </Button>
                        </a>
                    )}
                    <Button color="secondary" onClick={toggleModal}>Close</Button>
                </ModalFooter>
            </Modal>

        </Container>
    );
}