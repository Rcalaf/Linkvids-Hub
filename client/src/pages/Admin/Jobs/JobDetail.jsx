// client/src/pages/Admin/Jobs/AdminJobDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Card, CardBody, ListGroup, ListGroupItem, Alert } from 'reactstrap';
import { FaArrowLeft, FaEdit, FaCalendarAlt, FaEuroSign, FaGlobe, FaBriefcase, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import ApplicantManager from '../../../components/Admin/Applications/ApplicantManager'; 
import { getJobById, deleteJob } from '../../../services/jobService';
import { usePermissions } from '../../../hooks/usePermissions';

export default function JobDetail() {
    const { can } = usePermissions();
    const { jobId } = useParams();
    const navigate = useNavigate();
    
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJob();
    }, [jobId]);

    const loadJob = async () => {
        try {
            const data = await getJobById(jobId);
            setJob(data);
        } catch (error) {
            toast.error("Job not found.");
            navigate('/admin/jobs');
        } finally {
            setLoading(false);
        }
    };

    // const handleDelete = async () => {
    //     if (!window.confirm("Are you sure you want to delete this job? This cannot be undone.")) return;
    //     try {
    //         await deleteJob(jobId);
    //         toast.success("Job deleted.");
    //         navigate('/admin/jobs');
    //     } catch (error) {
    //         toast.error("Delete failed.");
    //     }
    // };

    // Callback to refresh data after an assignment
    const handleAssignComplete = () => {
        loadJob(); // Reloads to show "Assigned" status and disable other buttons
    };

    if (loading) return <p className="p-5 text-center">Loading job details...</p>;
    if (!job) return null;

    return (
        <Container fluid>
            {/* Header / Nav */}
            <Title title={job.projectName} />
            <div className="mb-4 d-flex justify-content-between align-items-center">
                
                <div className="d-flex align-items-center gap-3">
                    <Link to="/admin/jobs">
                        <Button color="secondary" outline size="sm">
                            <FaArrowLeft /> Back
                        </Button>
                    </Link>
                    
                    <Badge color={job.status === 'Open' ? 'success' : 'secondary'} className="fs-6">
                        {job.status}
                    </Badge>
                </div>
                {can('jobs', 'edit') && (
                <div className="d-flex gap-2">
                    <Link to={`/admin/jobs/${jobId}/edit`}>
                        <Button color="primary">
                            <FaEdit className="me-2" /> Edit Job
                        </Button>
                    </Link>
                    {/* <Button color="danger" outline onClick={handleDelete}>
                        <FaTrash />
                    </Button> */}
                </div>  
                )}
            </div>

            <Row>
                {/* LEFT COLUMN: Job Overview */}
                <Col md={8}>
                    {/* 1. Job Details Widget */}
                    <Widget title="Job Overview">
                        <h6 className="fw-bold text-primary">Description</h6>
                        <p style={{ whiteSpace: 'pre-line' }} className="mb-4 text-secondary">
                            {job.projectDescription}
                        </p>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <h6 className="fw-bold text-primary">Deliverables</h6>
                                <div className="p-3 bg-light rounded border">
                                    <p className="mb-0 small" style={{ whiteSpace: 'pre-line' }}>{job.deliverables}</p>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <h6 className="fw-bold text-primary">Usage Rights</h6>
                                <p className="mb-0">{job.imageRightsDuration}</p>
                            </div>
                        </div>
                    </Widget>

                {can('jobs', 'edit') && (
                    <div className="mt-4">
                        <ApplicantManager 
                            jobId={jobId} 
                            currentStatus={job.status}
                            assignedToId={job.assignedTo}
                            rejectedIds={job.rejectedApplicants || []}
                            onAssignComplete={handleAssignComplete}
                        />
                    </div>
                )}
                </Col>

                {/* RIGHT COLUMN: Metadata */}
                <Col md={4}>
                    <Card className="shadow-sm mb-4">
                        <CardBody>
                            <h6 className="fw-bold text-muted mb-3">Logistics</h6>
                            <ListGroup flush>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span><FaBriefcase className="me-2 text-muted" /> Target Role</span>
                                    <Badge color="dark">{job.targetRole}</Badge>
                                </ListGroupItem>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span><FaGlobe className="me-2 text-muted" /> Language</span>
                                    <strong>{job.projectLanguage}</strong>
                                </ListGroupItem>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span><FaEuroSign className="me-2 text-muted" /> Rate</span>
                                    <span className="fw-bold text-success fs-5">{job.rate}€</span>
                                </ListGroupItem>
                            </ListGroup>

                            <hr />

                            <h6 className="fw-bold text-muted mb-3">Timeline</h6>
                            <ListGroup flush>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span>Start Date</span>
                                    <strong>{new Date(job.projectStartDate).toLocaleDateString()}</strong>
                                </ListGroupItem>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span>End Date</span>
                                    <strong>{new Date(job.projectEndDate).toLocaleDateString()}</strong>
                                </ListGroupItem>
                            </ListGroup>

                            {job.shootingDates?.length > 0 && (
                                <div className="mt-3">
                                    <small className="text-muted d-block mb-2">Specific Shooting Days</small>
                                    <div className="d-flex flex-wrap gap-1">
                                        {job.shootingDates.map((d, i) => (
                                            <Badge key={i} color="light" className="text-dark border">
                                                {new Date(d).toLocaleDateString()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Meta Info */}
                    <Alert color="light" className="border">
                        <small className="d-block text-muted">Created By: <strong>{job.createdBy?.name || 'Unknown'}</strong></small>
                        <small className="d-block text-muted">Created At: {new Date(job.createdAt).toLocaleDateString()}</small>
                    </Alert>
                </Col>
            </Row>
        </Container>
    );
}