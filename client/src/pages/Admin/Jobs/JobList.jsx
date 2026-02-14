import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Table, Button, Badge, Input, Row, Col, 
    InputGroup, InputGroupText, Pagination, PaginationItem, PaginationLink 
} from 'reactstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    
    // --- 1. Filter State Initialization ---
    // Read URL params immediately to set initial state correctly
    const [filters, setFilters] = useState(() => {
        const params = new URLSearchParams(location.search);
        return {
            search: '',
            status: params.get('status') || 'all',
            targetRole: 'all'
        };
    });

    const [jobs, setJobs] = useState([]);
    const [userTypes, setUserTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10; 

    // --- 2. Load User Types (Once) ---
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

    // --- 3. Sync URL Changes to State ---
    // If user navigates back/forward or clicks a dashboard link, update filter
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status') || 'all';

        if (filters.status !== statusParam) {
            setFilters(prev => ({ ...prev, status: statusParam }));
            setPage(1);
        }
    }, [location.search]);

    // --- 4. Fetch Jobs Logic ---
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            // Only send 'all' if you want backend to handle it, 
            // or send undefined/null if backend expects that for "no filter"
            const queryStatus = filters.status === 'all' ? undefined : filters.status;
            const queryRole = filters.targetRole === 'all' ? undefined : filters.targetRole;

            const result = await getAllJobs({ 
                page, 
                limit: LIMIT,
                search: filters.search,
                status: queryStatus,
                targetRole: queryRole
            });
            
            setJobs(result.data || []);
            const total = result.metadata?.total || 0;
            setTotalPages(Math.ceil(total / LIMIT));

        } catch (error) {
            console.error(error);
            toast.error("Failed to load jobs");
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    // Trigger Fetch when dependencies change
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // --- 5. Handlers ---
    const handleDelete = async (jobId) => {
        if (!window.confirm("Are you sure you want to delete this job?")) return;
        try {
            await deleteJob(jobId);
            toast.success("Job deleted");
            fetchJobs(); // Re-fetch instead of reload
        } catch (error) {
            toast.error("Failed to delete job");
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); 
        
        // Optional: Update URL to reflect filter change (good for sharing links)
        // const params = new URLSearchParams(location.search);
        // if (value === 'all') params.delete(name);
        // else params.set(name, value);
        // navigate({ search: params.toString() }, { replace: true });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'success';
            case 'Draft': return 'secondary';
            case 'Assigned': return 'primary';
            case 'Completed': return 'dark';
            case 'Cancelled': return 'danger';
            default: return 'light';
        }
    };

    // --- 6. Render ---
    const renderPagination = () => {
        if (totalPages <= 1) return null;
        
        let items = [];
        // Simple pagination logic (showing all pages for now, can be optimized for large numbers)
        for (let i = 1; i <= totalPages; i++) {
            items.push(
                <PaginationItem active={i === page} key={i}>
                    <PaginationLink onClick={() => setPage(i)}>{i}</PaginationLink>
                </PaginationItem>
            );
        }

        return (
            <div className="d-flex justify-content-center mt-4">
                <Pagination>
                    <PaginationItem disabled={page <= 1}>
                        <PaginationLink first onClick={() => setPage(1)} />
                    </PaginationItem>
                    <PaginationItem disabled={page <= 1}>
                        <PaginationLink previous onClick={() => setPage(page - 1)} />
                    </PaginationItem>
                    
                    {items}
                    
                    <PaginationItem disabled={page >= totalPages}>
                        <PaginationLink next onClick={() => setPage(page + 1)} />
                    </PaginationItem>
                    <PaginationItem disabled={page >= totalPages}>
                        <PaginationLink last onClick={() => setPage(totalPages)} />
                    </PaginationItem>
                </Pagination>
            </div>
        );
    };

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <Title title="Job Management" />
                {can('jobs', 'create') && (
                    <Link to="/admin/jobs/create">
                        <Button color="primary">
                            <FaPlus className="me-2" /> Post New Job
                        </Button>
                    </Link>
                )}
            </div>

            <Widget>
                {/* Filters */}
                <Row className="mb-4 gx-2 gy-2">
                    <Col md={4}>
                        <InputGroup>
                            <InputGroupText className="bg-white"><FaSearch /></InputGroupText>
                            <Input 
                                placeholder="Search by name..." 
                                name="search" 
                                value={filters.search} 
                                onChange={handleFilterChange} 
                            />
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Input 
                            type="select" 
                            name="targetRole" 
                            value={filters.targetRole} 
                            onChange={handleFilterChange}
                        >
                            <option value="all">All Roles</option>
                            {userTypes.map(t => (
                                <option key={t._id} value={t.slug}>{t.name}</option>
                            ))}
                        </Input>
                    </Col>
                    <Col md={3}>
                        <Input 
                            type="select" 
                            name="status" 
                            value={filters.status} 
                            onChange={handleFilterChange}
                        >
                            <option value="all">All Statuses</option>
                            <option value="Open">Open</option>
                            <option value="Draft">Draft</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </Input>
                    </Col>
                    <Col md={2}>
                        <Button 
                            color="secondary" 
                            outline 
                            block 
                            onClick={() => { 
                                setFilters({ search: '', status: 'all', targetRole: 'all' }); 
                                setPage(1); 
                                navigate('/admin/jobs'); // Clear URL params too
                            }}
                        >
                            Reset
                        </Button>
                    </Col>
                </Row>

                {/* Table */}
                {loading ? (
                    <p className="text-center p-5 text-muted">Loading jobs...</p>
                ) : (
                    <>
                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead className="bg-light text-muted small text-uppercase">
                                    <tr>
                                        <th className="border-0 ps-3">Project</th>
                                        <th className="border-0 text-center">Status</th>
                                        <th className="border-0">Applicants / Spots</th>
                                        <th className="border-0">Role</th>
                                        <th className="border-0">Rate</th>
                                        <th className="border-0">Dates</th>
                                        {can('jobs', 'edit') && <th className="border-0 text-end pe-3">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.length > 0 ? jobs.map(job => {
                                        const hiredCount = job.assignedTo?.length || 0;
                                        const totalSpots = job.positionsAvailable || 1;
                                        const applicantCount = job.applicantCount || 0;
                                        
                                        return (
                                        <tr key={job._id}>
                                            <td className="ps-3">
                                                <div className="fw-bold">
                                                    <Link to={`/admin/jobs/${job._id}`} className="text-dark text-decoration-none hover-primary">
                                                        {job.projectName}
                                                    </Link>
                                                </div>
                                                <small className="text-muted">Lang: {job.projectLanguage}</small>
                                            </td>
                                            
                                            <td className="text-center">
                                                 <Badge color={getStatusColor(job.status)} className="px-2 py-1">
                                                    {job.status}
                                                 </Badge>
                                            </td>

                                            <td>
                                                <div className="d-flex align-items-center mb-1">
                                                    <Badge 
                                                        color={hiredCount >= totalSpots ? "success" : "light"} 
                                                        className={`text-${hiredCount >= totalSpots ? 'white' : 'dark'} border me-2`} 
                                                        pill
                                                    >
                                                        <FaUsers className="me-1" /> {hiredCount} / {totalSpots} Hired
                                                    </Badge>
                                                </div>
                                                <small className="text-muted d-block ms-1">
                                                    {applicantCount} Applicant{applicantCount !== 1 && 's'}
                                                </small>
                                            </td>
                                            
                                            <td>
                                                <Badge color="light" className="text-dark border px-2">
                                                    {job.targetRole}
                                                </Badge>
                                            </td>
                                            
                                            <td className="fw-bold text-success">
                                                {job.rate ? `€${job.rate}` : 'N/A'}
                                            </td>
                                            
                                            <td>
                                                <small className="d-block text-muted">
                                                    {new Date(job.projectStartDate).toLocaleDateString()}
                                                </small>
                                                <small className="text-muted">
                                                    To: {new Date(job.projectEndDate).toLocaleDateString()}
                                                </small>
                                            </td>
                                            
                                            {can('jobs', 'edit') && (
                                            <td className="text-end pe-3">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Link to={`/admin/jobs/${job._id}/edit`}>
                                                        <Button color="white" size="sm" className="border shadow-sm" title="Edit">
                                                            <FaEdit className="text-secondary" />
                                                        </Button>
                                                    </Link>
                                                    <Button 
                                                        color="white" 
                                                        size="sm" 
                                                        className="border shadow-sm text-danger" 
                                                        title="Delete" 
                                                        onClick={() => handleDelete(job._id)}
                                                    >
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
                                                <h5>No jobs found</h5>
                                                <p>Try adjusting your search filters.</p>
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