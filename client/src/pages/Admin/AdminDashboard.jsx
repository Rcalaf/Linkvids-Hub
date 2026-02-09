import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, Progress, 
    ListGroup, ListGroupItem, Modal, ModalHeader, ModalBody, ModalFooter, Button, Badge 
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { 
    FaBriefcase, FaUsers, FaFileAlt, FaBell, FaArrowRight, 
    FaBuilding, FaUser, FaNewspaper, FaExternalLinkAlt 
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown'; // 🚨 Import Markdown Renderer

import Title from '../../components/Title';
import Widget from '../../components/Widget/Widget';
import { getAdminStats } from '../../services/adminService';
import { getNewsFeed } from '../../services/newsService'; // 🚨 Import News Service
import { usePermissions } from '../../hooks/usePermissions';

export default function Dashboard() {
    const { can } = usePermissions();
    
    // Data State
    const [stats, setStats] = useState(null);
    const [news, setNews] = useState([]); // 🚨 News State
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // 🚨 Fetch Stats AND News (if permitted) in parallel
            const promises = [getAdminStats()];
            
            // Only fetch news if user has permission
            if (can('news', 'view')) {
                promises.push(getNewsFeed({ limit: 5 }));
            }

            const results = await Promise.all(promises);
            
            setStats(results[0]); // First result is always stats
            
            if (results[1]) {
                setNews(results[1]); // Second result is news (if permission existed)
            }

        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Modal Handlers ---
    const openNewsModal = (item) => {
        setSelectedNews(item);
        setModalOpen(true);
    };

    const toggleModal = () => {
        setModalOpen(!modalOpen);
        setSelectedNews(null);
    };

    if (loading) return <p className="p-5 text-center">Loading dashboard...</p>;
    if (!stats) return null;

    // --- Helper Components ---
    const StatCard = ({ icon, title, value, color, link, hasAccess }) => (
        <Card className="border-0 shadow-sm h-100">
            <CardBody className="d-flex align-items-center">
                <div className={`rounded-circle p-3 me-3 bg-light text-${color}`}>
                    {icon}
                </div>
                <div>
                    <h6 className="text-muted mb-1 text-uppercase small fw-bold">{title}</h6>
                    <h3 className="mb-0 fw-bold">{value}</h3>
                    {link && hasAccess && (
                        <Link to={link} className="small text-decoration-none mt-1 d-block">
                            View Details
                        </Link>
                    )}
                </div>
            </CardBody>
        </Card>
    );

    const StatusCount = ({ label, count, statusKey, colorClass }) => {
        const canViewJobs = can('jobs', 'view');
        return (
            <Col>
                {canViewJobs ? (
                    <Link to={`/admin/jobs?status=${statusKey}`} className="text-decoration-none">
                         <h4 className={`fw-bold ${colorClass} mb-0`}>{count || 0}</h4>
                    </Link>
                ) : (
                    <h4 className={`fw-bold ${colorClass} mb-0`}>{count || 0}</h4>
                )}
                <small className="text-muted">{label}</small>
            </Col>
        );
    };

    return (
        <Container fluid>
            <Title title="Superadmin Overview" />

            {/* 1. TOP STATS ROW */}
            <Row className="mb-4">
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaBriefcase size={24} />} 
                        title="Total Jobs" 
                        value={stats.jobs.total} 
                        color="primary" 
                        link="/admin/jobs"
                        hasAccess={can('jobs', 'view')}
                    />
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaFileAlt size={24} />} 
                        title="Total Applications" 
                        value={stats.jobs.totalApplications} 
                        color="success" 
                        link="/admin/applications"
                        hasAccess={can('jobs', 'view')}
                    />
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaUser size={24} />} 
                        title="Collaborators" 
                        value={stats.users.collaborators} 
                        color="info" 
                        link="/admin/collaborators"
                        hasAccess={can('collaborators', 'view')}
                    />
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaBuilding size={24} />} 
                        title="Agencies" 
                        value={stats.users.agencies} 
                        color="warning" 
                        link="/admin/users"
                        hasAccess={can('users', 'view')}
                    />
                </Col>
            </Row>

            <Row>
                {/* 2. LEFT COLUMN */}
                <Col lg={8}>
                    
                    {/* A. PROJECT STATUS WIDGET */}
                    <Widget title="Project Status" className="mb-4">
                        <Row className="text-center mb-4">
                            <StatusCount label="Open" count={stats.jobs.byStatus.Open} statusKey="Open" colorClass="text-success" />
                            <StatusCount label="In Progress" count={stats.jobs.byStatus.Assigned} statusKey="Assigned" colorClass="text-primary" />
                            <StatusCount label="Completed" count={stats.jobs.byStatus.Completed} statusKey="Completed" colorClass="text-secondary" />
                            <StatusCount label="Drafts" count={stats.jobs.byStatus.Draft} statusKey="Draft" colorClass="text-muted" />
                        </Row>
                        
                        <h6 className="text-muted mb-2">Completion Progress</h6>
                        <Progress multi className="mb-4" style={{ height: '20px' }}>
                            <Progress bar color="success" value={(stats.jobs.byStatus.Open / stats.jobs.total) * 100} title="Open" />
                            <Progress bar color="primary" value={(stats.jobs.byStatus.Assigned / stats.jobs.total) * 100} title="Assigned" />
                            <Progress bar color="secondary" value={(stats.jobs.byStatus.Completed / stats.jobs.total) * 100} title="Completed" />
                        </Progress>
                        
                        {can('jobs', 'edit') && (
                            <div className="text-end">
                                <Link to="/admin/jobs/create">
                                    <button className="btn btn-primary btn-sm">
                                        <FaBriefcase className="me-2" /> Post New Job
                                    </button>
                                </Link>
                            </div>
                        )}
                    </Widget>

                    {/* 🚨 B. NEWS WIDGET (Conditional based on Permission & Data) */}
                    {can('news', 'view') && news.length > 0 && (
                        <Widget title="Internal Announcements" className="mb-4">
                            <ListGroup flush>
                                {news.map(item => (
                                    <ListGroupItem key={item._id} className="p-3 border-bottom action-hover">
                                        <Row className="align-items-start">
                                            {/* Content */}
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
                                                <div className="text-muted mb-2 small" style={{ fontSize: '0.9rem' }}>
                                                    <ReactMarkdown 
                                                        components={{ p: ({node, ...props}) => <p style={{margin:0}} {...props}/> }}
                                                    >
                                                        {item.excerpt}
                                                    </ReactMarkdown>
                                                </div>
                                            </Col>
                                            
                                            {/* Action Button */}
                                            <Col sm={4} xs={12} className="text-end">
                                                {item.linkUrl ? (
                                                    <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button color="light" size="sm" className="border fw-bold text-primary">
                                                            <FaExternalLinkAlt className="me-2" size={10} /> Visit
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
                            <div className="text-center mt-3">
                                <Link to="/admin/news" className="text-decoration-none fw-bold small">
                                    Manage News <FaArrowRight className="ms-1" size={10} />
                                </Link>
                            </div>
                        </Widget>
                    )}
                </Col>

                {/* 3. RIGHT COLUMN: RECENT ALERTS */}
                <Col lg={4}>
                    <Widget title="Recent Alerts">
                        <ListGroup flush>
                            {stats.recentActivity.length === 0 ? (
                                <p className="text-muted p-3 text-center">No recent alerts</p>
                            ) : (
                                stats.recentActivity.map(note => (
                                    <ListGroupItem key={note._id} className="px-0 py-3 border-bottom">
                                        <div className="d-flex align-items-start">
                                            <FaBell className="text-warning mt-1 me-3 flex-shrink-0" />
                                            <div>
                                                <small className="d-block text-dark fw-bold mb-1">
                                                    {note.message.substring(0, 60)}{note.message.length > 60 ? '...' : ''}
                                                </small>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <small className="text-muted">
                                                        {new Date(note.createdAt).toLocaleDateString()}
                                                    </small>
                                                    
                                                    {note.relatedJob && can('jobs', 'view') && (
                                                        <Link to={`/admin/jobs/${note.relatedJob._id}`} className="small">
                                                            View Job
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ListGroupItem>
                                ))
                            )}
                        </ListGroup>
                        <div className="text-center mt-3">
                            <Link to="/admin/notifications" className="text-decoration-none small fw-bold">
                                View All Notifications <FaArrowRight size={10} />
                            </Link>
                        </div>
                    </Widget>
                </Col>
            </Row>

            {/* 🚨 4. NEWS READER MODAL */}
            <Modal isOpen={modalOpen} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    <FaNewspaper className="me-2 text-primary" />
                    {selectedNews?.title}
                </ModalHeader>
                <ModalBody className="p-4" style={{ lineHeight: '1.7', fontSize: '1rem' }}>
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