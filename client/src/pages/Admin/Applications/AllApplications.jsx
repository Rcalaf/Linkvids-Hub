import React, { useState, useEffect } from 'react';
import { 
    Table, Badge, Input, InputGroup, InputGroupText, 
    Spinner, Button, Row, Col 
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { 
    FaSearch, FaCalendarAlt, 
    FaCheck, FaTimes, FaStar, FaRegStar, FaUndo 
} from 'react-icons/fa';
import { toast } from 'react-toastify';

// Hooks & Services
import { usePermissions } from '../../../hooks/usePermissions';
import { 
    getAllApplications, 
    assignJob, 
    unassignJob, 
    rejectApplicant, 
    unrejectApplicant, 
    shortlistApplicant, 
    undoShortlistApplicant 
} from '../../../services/jobService';

import Widget from '../../../components/Widget/Widget'; 

export default function AllApplications() {
    // 1. Permissions Hook
    const { can } = usePermissions();
    const canEdit = can('jobs', 'edit');

    const [applications, setApplications] = useState([]); 
    const [filteredApps, setFilteredApps] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending'); // Default to Pending

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, statusFilter, applications]);

    const loadData = async () => {
        try {
            const data = await getAllApplications();
            setApplications(data);
            setFilteredApps(data);
        } catch (error) {
            console.error("Error loading applications:", error);
            toast.error("Failed to load application master list.");
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = applications;

        // Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(app => 
                (app.candidateName && app.candidateName.toLowerCase().includes(lowerTerm)) ||
                (app.jobTitle && app.jobTitle.toLowerCase().includes(lowerTerm))
            );
        }

        // Dropdown Status Filter
        if (statusFilter !== 'all') {
            result = result.filter(app => app.status === statusFilter);
        }

        setFilteredApps(result);
    };

    // --- ACTION HANDLERS (Same as before) ---
    const handleAssign = async (app) => {
        if (!window.confirm(`Assign "${app.jobTitle}" to ${app.candidateName}?`)) return;
        try {
            await assignJob(app.jobId, app.candidateId);
            setApplications(prev => prev.map(item => {
                if (item.jobId === app.jobId) {
                    if (item.candidateId === app.candidateId) {
                        return { ...item, status: 'accepted', jobStatus: 'Assigned' };
                    } else {
                        return { ...item, status: 'rejected', jobStatus: 'Assigned' };
                    }
                }
                return item;
            }));
            toast.success(`Job assigned to ${app.candidateName}`);
        } catch (error) {
            toast.error("Failed to assign job");
        }
    };

    const handleUnassign = async (app) => {
        if (!window.confirm(`Unassign this job? It will re-open.`)) return;
        try {
            await unassignJob(app.jobId);
            setApplications(prev => prev.map(item => 
                item.jobId === app.jobId ? { ...item, status: 'pending', jobStatus: 'Open' } : item
            ));
            toast.info("Job unassigned and re-opened.");
        } catch (error) {
            toast.error("Failed to unassign");
        }
    };

    const handleReject = async (app) => {
        try {
            await rejectApplicant(app.jobId, app.candidateId);
            setApplications(prev => prev.map(item => 
                item.applicationId === app.applicationId ? { ...item, status: 'rejected' } : item
            ));
            toast.info("Applicant rejected");
        } catch (error) {
            toast.error("Failed to reject");
        }
    };

    const handleUnreject = async (app) => {
        try {
            await unrejectApplicant(app.jobId, app.candidateId);
            setApplications(prev => prev.map(item => 
                item.applicationId === app.applicationId ? { ...item, status: 'pending' } : item
            ));
            toast.success("Applicant restored");
        } catch (error) {
            toast.error("Failed to restore");
        }
    };

    const handleShortlist = async (app) => {
        try {
            await shortlistApplicant(app.jobId, app.candidateId);
            setApplications(prev => prev.map(item => 
                item.applicationId === app.applicationId ? { ...item, status: 'shortlisted' } : item
            ));
            toast.success("Shortlisted!");
        } catch (error) {
            toast.error("Failed to shortlist");
        }
    };

    const handleUndoShortlist = async (app) => {
        try {
            await undoShortlistApplicant(app.jobId, app.candidateId);
            setApplications(prev => prev.map(item => 
                item.applicationId === app.applicationId ? { ...item, status: 'pending' } : item
            ));
            toast.info("Removed from shortlist");
        } catch (error) {
            toast.error("Failed to update");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'accepted': return <Badge color="success" className="p-2 px-3">Hired</Badge>;
            case 'shortlisted': return <Badge color="warning" className="text-dark p-2 px-3">Shortlisted</Badge>;
            case 'rejected': return <Badge color="secondary" className="p-2 px-3">Rejected</Badge>;
            case 'pending': return <Badge color="info" outline className="p-2 px-3">Pending</Badge>;
            default: return <Badge color="light" className="text-dark p-2 px-3">{status}</Badge>;
        }
    };

    if (loading) return <div className="p-5 text-center"><Spinner color="primary" /></div>;

    return (
        <div className="p-4">
            <h2 className="mb-4">Global Applications Manager</h2>
            
            <Widget>
                {/* --- UPDATED TOOLBAR --- */}
                <Row className="mb-4 g-3 align-items-center justify-content-between">
                    
                    {/* Search Bar (Left) */}
                    <Col md={5}>
                        <InputGroup>
                            <InputGroupText className="bg-white border-end-0"><FaSearch className="text-muted"/></InputGroupText>
                            <Input 
                                placeholder="Search candidate or job..." 
                                className="border-start-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </Col>

                    {/* Status Dropdown (Right) */}
                    <Col md={3} className="d-flex justify-content-md-end">
                        <Input 
                            type="select" 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-select shadow-sm"
                            style={{ maxWidth: '250px', cursor: 'pointer' }}
                        >
                            <option value="pending">Pending Applications</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="accepted">Hired / Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">Show All Statuses</option>
                        </Input>
                    </Col>
                </Row>

                {/* --- TABLE --- */}
                {filteredApps.length === 0 ? (
                    <div className="text-center py-5 bg-light rounded text-muted">
                        <p className="mb-0 fs-5">No applications found in <strong>'{statusFilter}'</strong>.</p>
                        {statusFilter !== 'all' && (
                            <Button color="link" onClick={() => setStatusFilter('all')}>
                                View All Applications
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="align-middle">
                            <thead className="bg-light text-muted small text-uppercase">
                                <tr>
                                    <th className="border-0 ps-3">Candidate</th>
                                    <th className="border-0">Applied Job</th>
                                    <th className="border-0">Date</th>
                                    <th className="border-0">Status</th>
                                    <th className="border-0 text-end pe-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApps.map((app) => {
                                    const isJobClosed = app.jobStatus === 'Assigned' || app.jobStatus === 'Completed';
                                    const isWinner = app.status === 'accepted';
                                    const isRejected = app.status === 'rejected';
                                    const isShortlisted = app.status === 'shortlisted';

                                    return (
                                    <tr key={app.applicationId} className={isWinner ? 'table-success' : ''}>
                                        {/* Candidate Info */}
                                        <td className="ps-3">
                                            <div className="d-flex align-items-center">
                                                <Link to={`/admin/collaborators/${app.candidateId}`}>
                                                    <img 
                                                        src={app.candidateAvatar || 'https://placehold.co/100?text=User'} 
                                                        alt="Avatar" 
                                                        className="rounded-circle me-3 border"
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', filter: isRejected ? 'grayscale(100%)' : 'none' }}
                                                    />
                                                </Link>
                                                <div>
                                                    <Link to={`/admin/collaborators/${app.candidateId}`} className="fw-bold text-dark text-decoration-none">
                                                        {app.candidateName}
                                                    </Link>
                                                    <div className="small text-muted">{app.candidateLocation}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Job Info */}
                                        <td>
                                            <Link to={`/admin/jobs/${app.jobId}`} className="text-decoration-none fw-semibold">
                                                {app.jobTitle}
                                            </Link>
                                            <div className="small text-muted mt-1">
                                                Job: <span className={app.jobStatus === 'Assigned' ? 'text-success fw-bold' : ''}>{app.jobStatus}</span>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td>
                                            <div className="text-muted small">
                                                <FaCalendarAlt className="me-1 text-secondary" />
                                                {new Date(app.appliedAt).toLocaleDateString()}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td>{getStatusBadge(app.status)}</td>

                                        {/* Actions */}
                                        <td className="text-end pe-3">
                                            {canEdit ? (
                                                <div className="d-flex justify-content-end gap-2">
                                                    {isWinner ? (
                                                        <Button color="danger" size="sm" outline onClick={() => handleUnassign(app)} title="Unassign">
                                                            <FaUndo />
                                                        </Button>
                                                    ) : isRejected ? (
                                                        <Button color="secondary" size="sm" outline onClick={() => handleUnreject(app)} title="Restore">
                                                            <FaUndo />
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            {isShortlisted ? (
                                                                <Button color="warning" size="sm" onClick={() => handleUndoShortlist(app)} title="Remove Shortlist" disabled={isJobClosed}>
                                                                    <FaStar className="text-white"/>
                                                                </Button>
                                                            ) : (
                                                                <Button color="light" size="sm" onClick={() => handleShortlist(app)} title="Shortlist" disabled={isJobClosed}>
                                                                    <FaRegStar className="text-muted"/>
                                                                </Button>
                                                            )}
                                                            <Button color="success" size="sm" outline onClick={() => handleAssign(app)} disabled={isJobClosed} title="Assign Job">
                                                                <FaCheck />
                                                            </Button>
                                                            <Button color="danger" size="sm" outline onClick={() => handleReject(app)} disabled={isJobClosed} title="Reject">
                                                                <FaTimes />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <Link to={`/admin/jobs/${app.jobId}`} className="btn btn-sm btn-outline-secondary">
                                                    View Job
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Widget>
        </div>
    );
}