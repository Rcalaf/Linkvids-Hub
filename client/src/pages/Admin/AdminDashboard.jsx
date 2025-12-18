import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Progress, ListGroup, ListGroupItem, Badge } from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaBriefcase, FaUsers, FaFileAlt, FaBell, FaArrowRight, FaBuilding, FaUser } from 'react-icons/fa';
import Title from '../../components/Title';
import Widget from '../../components/Widget/Widget';
import { getAdminStats } from '../../services/adminService';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getAdminStats();
            setStats(data);
        } catch (error) {
            console.error("Dashboard Load Error");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p className="p-5 text-center">Loading dashboard...</p>;
    if (!stats) return null;

    // Helper Component for Top Cards
    const StatCard = ({ icon, title, value, color, link }) => (
        <Card className="border-0 shadow-sm h-100">
            <CardBody className="d-flex align-items-center">
                <div className={`rounded-circle p-3 me-3 bg-light text-${color}`}>
                    {icon}
                </div>
                <div>
                    <h6 className="text-muted mb-1 text-uppercase small fw-bold">{title}</h6>
                    <h3 className="mb-0 fw-bold">{value}</h3>
                    {link && <Link to={link} className="small text-decoration-none mt-1 d-block">View Details</Link>}
                </div>
            </CardBody>
        </Card>
    );

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
                    />
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaFileAlt size={24} />} 
                        title="Total Applications" 
                        value={stats.jobs.totalApplications} 
                        color="success" 
                    />
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaUser size={24} />} 
                        title="Collaborators" 
                        value={stats.users.collaborators} 
                        color="info" 
                        link="/admin/users"
                    />
                </Col>
                <Col md={3} sm={6} className="mb-3">
                    <StatCard 
                        icon={<FaBuilding size={24} />} 
                        title="Agencies" 
                        value={stats.users.agencies} 
                        color="warning" 
                        link="/admin/users"
                    />
                </Col>
            </Row>

            <Row>
                {/* 2. LEFT: JOB STATUS BREAKDOWN */}
                <Col lg={8}>
                    <Widget title="Project Status">
                        <Row className="text-center mb-4">
                            <Col>
                                <h4 className="fw-bold text-success">{stats.jobs.byStatus.Open || 0}</h4>
                                <small className="text-muted">Open</small>
                            </Col>
                            <Col>
                                <h4 className="fw-bold text-primary">{stats.jobs.byStatus.Assigned || 0}</h4>
                                <small className="text-muted">In Progress</small>
                            </Col>
                            <Col>
                                <h4 className="fw-bold text-secondary">{stats.jobs.byStatus.Completed || 0}</h4>
                                <small className="text-muted">Completed</small>
                            </Col>
                            <Col>
                                <h4 className="fw-bold text-muted">{stats.jobs.byStatus.Draft || 0}</h4>
                                <small className="text-muted">Drafts</small>
                            </Col>
                        </Row>
                        
                        <h6 className="text-muted mb-2">Completion Progress</h6>
                        <Progress multi className="mb-4" style={{ height: '20px' }}>
                            <Progress bar color="success" value={(stats.jobs.byStatus.Open / stats.jobs.total) * 100} title="Open" />
                            <Progress bar color="primary" value={(stats.jobs.byStatus.Assigned / stats.jobs.total) * 100} title="Assigned" />
                            <Progress bar color="secondary" value={(stats.jobs.byStatus.Completed / stats.jobs.total) * 100} title="Completed" />
                        </Progress>
                        
                        <div className="text-end">
                            <Link to="/admin/jobs/create">
                                <button className="btn btn-primary btn-sm">
                                    <FaBriefcase className="me-2" /> Post New Job
                                </button>
                            </Link>
                        </div>
                    </Widget>
                </Col>

                {/* 3. RIGHT: RECENT ACTIVITY (NOTIFICATIONS) */}
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
                                                    {note.relatedJob && (
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
        </Container>
    );
}