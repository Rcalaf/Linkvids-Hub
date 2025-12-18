import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Card, CardBody, ListGroup, ListGroupItem, Alert } from 'reactstrap';
import { FaArrowLeft, FaCalendarAlt, FaTimesCircle, FaCheckCircle, FaGlobe, FaBriefcase, FaUndo, FaBan } from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getJobById, toggleJobApplication } from '../../../services/jobService';
import { useAuth } from '../../../hooks/useAuth';

export default function CreatorJobDetail() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { auth } = useAuth();
    
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    
    // State to track if current user has applied
    const [hasApplied, setHasApplied] = useState(false);
    const [statusState, setStatusState] = useState({
        hasApplied: false,
        isRejected: false,
        isSelected: false
    });

    useEffect(() => {
        const loadJob = async () => {
            try {
                const data = await getJobById(jobId);
                setJob(data);

                setStatusState({
                    hasApplied: data.hasApplied || false,
                    isRejected: data.isRejected || false,
                    isSelected: data.isSelected || false
                });
                
                // Check if my ID is in the applicants array
                // if (data.applicants && data.applicants.includes(auth.user._id)) {
                //     setHasApplied(true);
                // }
            } catch (error) {
                toast.error("Job not found or access denied.");
                navigate('/creator/jobs');
            } finally {
                setLoading(false);
            }
        };
        loadJob();
    }, [jobId, auth.user._id, navigate]);

    const handleApplyToggle = async () => {
        if (!window.confirm(statusState.hasApplied ? "Withdraw your application?" : "Apply for this job?")) return;
        
        setApplying(true);
        try {
            const result = await toggleJobApplication(jobId);
            // setHasApplied(result.hasApplied);
            setStatusState(prev => ({ ...prev, hasApplied: result.hasApplied }));
            
            if (result.hasApplied) {
                toast.success("Application submitted successfully!");
            } else {
                toast.info("Application withdrawn.");
            }
        } catch (error) {
            toast.error("Failed to process request.");
        } finally {
            setApplying(false);
        }
    };

    const renderHeaderBadge = () => {
        if (statusState.isSelected) {
            return (
                <Badge color="success" className="p-2 px-3 fs-6 d-flex align-items-center">
                    <FaCheckCircle className="me-2" /> You are Selected!
                </Badge>
            );
        }
        if (statusState.isRejected) {
            return (
                <Badge color="danger" className="p-2 px-3 fs-6 d-flex align-items-center">
                    <FaTimesCircle className="me-2" /> Application Rejected
                </Badge>
            );
        }
        if (statusState.hasApplied) {
            return (
                <Badge color="info" className="p-2 px-3 fs-6 text-dark border d-flex align-items-center">
                    <FaCheckCircle className="me-2" /> Applied
                </Badge>
            );
        }
        return null; // Show nothing if just viewing
    };

    if (loading) return <p className="p-5 text-center">Loading job details...</p>;
    if (!job) return null;

    return (
        <Container fluid>
            {/* Navigation Header */}
            <div className="mb-4">
                <Link to="/creator/jobs">
                    <Button color="secondary" outline size="sm" className="mb-3">
                        <FaArrowLeft className="me-2" /> Back to Jobs
                    </Button>
                </Link>
                <Title title={job.projectName} />
                
                <div className="d-flex justify-content-between align-items-start">
                    {renderHeaderBadge()}
                    {/* STATUS BADGE FOR APPLICATION */}
                    {/* {hasApplied && (
                        <div className="text-end">
                             <Badge color="success" className="p-2 px-3" style={{ fontSize: '1rem' }}>
                                <FaCheckCircle className="me-2" /> Applied
                             </Badge>
                        </div>
                    )} */}
                </div>
            </div>

            <Row>
                {/* LEFT COLUMN: Main Content */}
                <Col md={8}>
                    <Widget title="Project Overview">
                        <h6 className="fw-bold text-primary">Description</h6>
                        <p style={{ whiteSpace: 'pre-line' }} className="mb-4 text-secondary">
                            {job.projectDescription}
                        </p>

                        <h6 className="fw-bold text-primary">Deliverables</h6>
                        <div className="p-3 bg-light rounded border mb-4">
                            <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{job.deliverables}</p>
                        </div>

                        <h6 className="fw-bold text-primary">Usage Rights</h6>
                        <p className="mb-0">{job.imageRightsDuration}</p>
                    </Widget>
                </Col>

                {/* RIGHT COLUMN: Sidebar Action */}
                <Col md={4}>
                    <Card className="shadow-sm  mb-4">
                        <CardBody>
                            <div className="text-center mb-4">
                                <h2 className="fw-bold text-success mb-0">{job.rate}€</h2>
                                <small className="text-muted">Project Rate</small>
                            </div>

                            <ListGroup flush className="mb-4">
                                <ListGroupItem className="px-0 d-flex justify-content-between align-items-center">
                                    <span><FaGlobe className="me-2 text-muted" /> Language</span>
                                    <Badge color="info" className="text-dark bg-light border">{job.projectLanguage}</Badge>
                                </ListGroupItem>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span><FaCalendarAlt className="me-2 text-muted" /> Start Date</span>
                                    <strong>{new Date(job.projectStartDate).toLocaleDateString()}</strong>
                                </ListGroupItem>
                                <ListGroupItem className="px-0 d-flex justify-content-between">
                                    <span><FaCalendarAlt className="me-2 text-muted" /> End Date</span>
                                    <strong>{new Date(job.projectEndDate).toLocaleDateString()}</strong>
                                </ListGroupItem>
                                {job.shootingDates && job.shootingDates.length > 0 && (
                                    <ListGroupItem className="px-0">
                                        <div className="mb-1"><FaBriefcase className="me-2 text-muted" /> Shooting Days</div>
                                        <div className="d-flex flex-wrap gap-1 justify-content-end">
                                            {job.shootingDates.map((d, i) => (
                                                <Badge key={i} color="info" pill>{new Date(d).toLocaleDateString()}</Badge>
                                            ))}
                                        </div>
                                    </ListGroupItem>
                                )}
                            </ListGroup>

                            {job.status === 'Open' || job.status === 'Assigned' || job.status === 'Completed' ? (
                                <div className="d-grid">
                                    
                                    {/* CASE 1: USER IS REJECTED */}
                                    {statusState.isRejected ? (
                                        <Button 
                                            color="secondary" 
                                          
                                            disabled 
                                            className="d-flex align-items-center justify-content-center gap-2"
                                        >
                                            <FaBan /> Application Rejected
                                        </Button>
                                    ) 
                                    
                                    /* CASE 2: USER IS SELECTED (WINNER) */
                                    : statusState.isSelected ? (
                                        <Button 
                                            color="success" 
                                          
                                            className="fw-bold d-flex align-items-center justify-content-center gap-2"
                                            onClick={() => alert("Contact the admin for next steps!")} // Or redirect to a chat/workspace
                                        >
                                            <FaCheckCircle /> You are Selected!
                                        </Button>
                                    )

                                    /* CASE 3: USER HAS APPLIED (PENDING) */
                                    : statusState.hasApplied ? (
                                        <>
                                            <Alert color="success" className="text-center py-2 mb-3">
                                                <small>You have applied for this job.</small>
                                            </Alert>
                                            {/* Only allow withdraw if job is still Open */}
                                            {job.status === 'Open' ? (
                                                <Button 
                                                    color="danger" 
                                                    outline 
                                                    onClick={handleApplyToggle}
                                                    disabled={applying}
                                                >
                                                    <FaUndo className="me-2" /> Withdraw Application
                                                </Button>
                                            ) : (
                                                <Button color="secondary" outline disabled>
                                                    Application Under Review
                                                </Button>
                                            )}
                                        </>
                                    ) 
                                    
                                    /* CASE 4: JOB IS CLOSED (But I didn't apply or wasn't explicitly rejected yet) */
                                    : job.status !== 'Open' ? (
                                        <Button color="secondary" size="lg" disabled>
                                            <FaLock className="me-2" /> Position Filled
                                        </Button>
                                    )

                                    /* CASE 5: STANDARD APPLY (Job Open, Not Applied) */
                                    : (
                                        <Button 
                                            color="primary" 
                                            onClick={handleApplyToggle}
                                            disabled={applying}
                                            className="fw-bold"
                                        >
                                            {applying ? 'Submitting...' : 'Apply Now'}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Alert color="warning" className="text-center">
                                    This job is currently {job.status} and is not accepting applications.
                                </Alert>
                            )}
                            {/* {job.status === 'Open' ? (
                                <div className="d-grid">
                                    {hasApplied ? (
                                        <>
                                            <Alert color="success" className="text-center py-2 mb-3">
                                                <small>You have applied for this job.</small>
                                            </Alert>
                                            <Button 
                                                color="danger" 
                                                outline 
                                                onClick={handleApplyToggle}
                                                disabled={applying}
                                            >
                                                <FaUndo className="me-2" /> Withdraw Application
                                            </Button>
                                        </>
                                    ) : (
                                        <Button 
                                            color="primary" 
                                            size="lg" 
                                            onClick={handleApplyToggle}
                                            disabled={applying}
                                            className="fw-bold"
                                        >
                                            {applying ? 'Submitting...' : 'Apply Now'}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Alert color="warning" className="text-center">
                                    This job is currently {job.status} and is not accepting applications.
                                </Alert>
                            )} */}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}