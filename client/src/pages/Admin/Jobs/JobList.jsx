import React, { useState, useEffect } from 'react';
import { 
    Container, Table, Button, Badge, Input, Row, Col, 
    InputGroup, InputGroupText, Pagination, PaginationItem, PaginationLink 
} from 'reactstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaPlus, FaEdit, FaSearch, FaBriefcase, FaTrash, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getAllJobs, deleteJob } from '../../../services/jobService';
import { getAllUserTypes } from '../../../services/userTypeService'; 
import { usePermissions } from '../../../hooks/usePermissions';

export default function JobList() {
    const { can } = usePermissions();
    const location = useLocation();
    
    // 🚨 1. Helper to read URL params immediately
    const getInitialFilters = () => {
        const params = new URLSearchParams(location.search);
        return {
            search: '',
            status: params.get('status') || 'all', // Reads 'Open' directly from URL on first load
            targetRole: 'all'
        };
    };

    const [jobs, setJobs] = useState([]);
    const [userTypes, setUserTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initialize state using the helper function
    const [filters, setFilters] = useState(getInitialFilters);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10; 

    // 🚨 2. Listen for URL changes (Navigation from Dashboard)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status') || 'all';

        // Only update if it actually changed to prevent loops
        if (filters.status !== statusParam) {
            setFilters(prev => ({ ...prev, status: statusParam }));
            setPage(1);
        }
    }, [location.search]);

    // Load User Types (Run once)
    useEffect(() => {
        const loadTypes = async () => {
            try {
                const types = await getAllUserTypes();
                setUserTypes(types);
            } catch (e) {
                console.error("Failed to load user types");
            }
        };
        loadTypes();
    }, []);

    // 🚨 3. Fetch Jobs with Race Condition Protection
    useEffect(() => {
        let isActive = true; // Flag to track if this request is still valid

        const fetchJobs = async () => {
            setLoading(true);
            try {
                const result = await getAllJobs({ 
                    page, 
                    limit: LIMIT,
                    search: filters.search,
                    status: filters.status,
                    targetRole: filters.targetRole
                });
                
                // Only update state if this is the most recent request
                if (isActive) {
                    setJobs(result.data);
                    const total = result.metadata?.total || 0;
                    setTotalPages(Math.ceil(total / LIMIT));
                }

            } catch (error) {
                if (isActive) toast.error("Failed to load jobs");
            } finally {
                if (isActive) setLoading(false);
            }
        };

        fetchJobs();

        // Cleanup function: If dependencies change (filters/page update), 
        // set isActive = false so the previous "slow" request is ignored.
        return () => {
            isActive = false;
        };

    }, [page, filters]); 

    const handleDelete = async (jobId) => {
        if (!window.confirm("Are you sure you want to delete this job?")) return;
        try {
            await deleteJob(jobId);
            toast.success("Job deleted");
            // Re-trigger fetch by toggling a temp state or just calling fetch (simplified here)
            // Ideally, we'd refactor fetchJobs outside, but for now a reload works:
            window.location.reload(); 
        } catch (error) {
            toast.error("Failed to delete job");
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); 
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open': return 'success';
            case 'Draft': return 'secondary';
            case 'Assigned': return 'primary';
            case 'Completed': return 'info';
            case 'Cancelled': return 'danger';
            default: return 'light';
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        let items = [];
        for (let i = 1; i <= totalPages; i++) {
            items.push(
                <PaginationItem active={i === page} key={i}>
                    <PaginationLink onClick={() => setPage(i)}>{i}</PaginationLink>
                </PaginationItem>
            );
        }
        return (
            <Pagination className="d-flex justify-content-center mt-4">
                <PaginationItem disabled={page <= 1}><PaginationLink first onClick={() => setPage(1)} /></PaginationItem>
                <PaginationItem disabled={page <= 1}><PaginationLink previous onClick={() => setPage(page - 1)} /></PaginationItem>
                {items}
                <PaginationItem disabled={page >= totalPages}><PaginationLink next onClick={() => setPage(page + 1)} /></PaginationItem>
                <PaginationItem disabled={page >= totalPages}><PaginationLink last onClick={() => setPage(totalPages)} /></PaginationItem>
            </Pagination>
        );
    };

    return (
        <Container fluid>
            <Title title="Job Management" />
            {can('jobs', 'edit') && (
            <div className="d-flex justify-content-between align-items-center mb-4">
                <Link to="/admin/jobs/create">
                    <Button color="primary">
                        <FaPlus className="me-2" /> Post New Job
                    </Button>
                </Link>
            </div> 
            )}

            <Widget title="All Jobs">
                <Row className="mb-4 gx-2">
                    <Col md={4}>
                        <InputGroup>
                            <InputGroupText className="bg-white"><FaSearch /></InputGroupText>
                            <Input placeholder="Search by name..." name="search" value={filters.search} onChange={handleFilterChange} />
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Input type="select" name="targetRole" value={filters.targetRole} onChange={handleFilterChange}>
                            <option value="all">All Roles</option>
                            {userTypes.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                        </Input>
                    </Col>
                    <Col md={3}>
                        {/* 🚨 Ensure the value binds correctly to state */}
                        <Input type="select" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="all">All Statuses</option>
                            <option value="Open">Open</option>
                            <option value="Draft">Draft</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </Input>
                    </Col>
                    <Col md={2}>
                        <Button color="secondary" outline block onClick={() => { setFilters({ search: '', status: 'all', targetRole: 'all' }); setPage(1); }}>Clear</Button>
                    </Col>
                </Row>

                {loading ? <p className="text-muted p-3">Loading jobs...</p> : (
                    <>
                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-top-0">Project</th>
                                        <th className="border-top-0 text-center">Applicants / Spots</th>
                                        <th className="border-top-0">Role</th>
                                        <th className="border-top-0">Rate</th>
                                        <th className="border-top-0">Dates</th>
                                        <th className="border-top-0">Status</th>
                                        {can('jobs', 'edit') && <th className="border-top-0 text-end">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.length > 0 ? jobs.map(job => {
                                        const hiredCount = Array.isArray(job.assignedTo) ? job.assignedTo.length : (job.assignedTo ? 1 : 0);
                                        const totalSpots = job.positionsAvailable || 1;
                                        
                                        return (
                                        <tr key={job._id}>
                                            <td>
                                                <div className="fw-bold">
                                                    <Link to={`/admin/jobs/${job._id}`} className="text-primary text-decoration-none fw-bold">
                                                        {job.projectName}
                                                    </Link>
                                                </div>
                                                <small className="text-muted">Lang: {job.projectLanguage}</small>
                                            </td>
                                            
                                            <td className="text-center">
                                                <Badge color={hiredCount >= totalSpots ? "success" : "info"} pill>
                                                    <FaUsers className="me-1" /> {hiredCount} / {totalSpots} Filled
                                                </Badge>
                                                <div className="small text-muted mt-1">{job.applicantCount} applicants</div>
                                            </td>
                                            
                                            <td><Badge color="light" className="text-dark border">{job.targetRole}</Badge></td>
                                            <td className="fw-bold">{job.rate} €</td>
                                            <td>
                                                <small className="d-block text-muted">
                                                    {new Date(job.projectStartDate).toLocaleDateString()} - {new Date(job.projectEndDate).toLocaleDateString()}
                                                </small>
                                            </td>
                                            <td><Badge color={getStatusBadge(job.status)}>{job.status}</Badge></td>
                                            
                                            {can('jobs', 'edit') && (
                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Link to={`/admin/jobs/${job._id}/edit`}>
                                                        <Button color="light" size="sm" className="border" title="Edit">
                                                            <FaEdit className="text-secondary" />
                                                        </Button>
                                                    </Link>
                                                    <Button color="light" size="sm" className="border text-danger" title="Delete" onClick={() => handleDelete(job._id)}>
                                                        <FaTrash />
                                                    </Button>
                                                </div>
                                            </td>
                                            )}
                                        </tr>
                                    )}) : (
                                        <tr>
                                            <td colSpan="7" className="text-center p-5 text-muted">
                                                <FaBriefcase className="mb-3 display-4 opacity-25" />
                                                <p>No jobs found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                        {renderPagination()}
                    </>
                )}
            </Widget>
        </Container>
    );
}