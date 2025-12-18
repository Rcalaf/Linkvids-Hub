// client/src/pages/Admin/Jobs/JobList.jsx
import React, { useState, useEffect } from 'react';
import { 
    Container, Table, Button, Badge, Input, Row, Col, 
    InputGroup, InputGroupText, Pagination, PaginationItem, PaginationLink 
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaSearch, FaBriefcase, FaTrash, FaFilter, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getAllJobs, deleteJob } from '../../../services/jobService';
import { getAllUserTypes } from '../../../services/userTypeService'; // 🚨 Import to populate role filter
import { usePermissions } from '../../../hooks/usePermissions';

export default function JobList() {
    const { can } = usePermissions();
    const [jobs, setJobs] = useState([]);
    const [userTypes, setUserTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Pagination State
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        targetRole: 'all'
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10; // Items per page

    // 1. Load User Types once on mount (for filter dropdown)
    useEffect(() => {
        const loadTypes = async () => {
            try {
                const types = await getAllUserTypes();
                setUserTypes(types);
            } catch (e) {
                console.error("Failed to load user types for filter");
            }
        };
        loadTypes();
    }, []);

    // 2. Fetch Jobs whenever filters or page changes
    useEffect(() => {
        fetchJobs();
    }, [page, filters]); // Reload on page or filter change

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
            
            setJobs(result.data);
            
            // Calculate total pages based on metadata
            // Assuming result.metadata.total exists. If backend returns simple array, adjustment needed.
            const total = result.metadata?.total || 0;
            setTotalPages(Math.ceil(total / LIMIT));

        } catch (error) {
            toast.error("Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm("Are you sure you want to delete this job?")) return;
        try {
            await deleteJob(jobId);
            toast.success("Job deleted");
            fetchJobs(); // Refresh to update pagination counts
        } catch (error) {
            toast.error("Failed to delete job");
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to page 1 on filter change
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

    // Helper to render pagination pages
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        let items = [];
        for (let i = 1; i <= totalPages; i++) {
            items.push(
                <PaginationItem active={i === page} key={i}>
                    <PaginationLink onClick={() => setPage(i)}>
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        return (
            <Pagination aria-label="Page navigation" className="d-flex justify-content-center mt-4">
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
                            <Input 
                                placeholder="Search by name..." 
                                name="search"
                                value={filters.search}
                                onChange={(e) => {
                                    handleFilterChange(e);
                                    // Debouncing isn't implemented here for simplicity, 
                                    // but state update triggers fetch via useEffect
                                }}
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
                                <option key={t.slug} value={t.slug}>{t.name}</option>
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
                            }}
                        >
                            Clear
                        </Button>
                    </Col>
                </Row>

                {loading ? <p className="text-muted p-3">Loading jobs...</p> : (
                    <>
                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-top-0">Project</th>
                                        <th className="border-top-0 text-center">Applicants</th>
                                        <th className="border-top-0">Role</th>
                                        <th className="border-top-0">Rate</th>
                                        <th className="border-top-0">Dates</th>
                                        <th className="border-top-0">Status</th>
                                        {can('jobs', 'edit') && (
                                        <th className="border-top-0 text-end">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.length > 0 ? jobs.map(job => (
                                        <tr key={job._id}>
                                            <td>
                                                <div className="fw-bold">
                                                    <Link 
                                                        to={`/admin/jobs/${job._id}`} 
                                                        className="text-primary text-decoration-none"
                                                        style={{ cursor: 'pointer' }} // Force cursor
                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} // Hover effect
                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                    >
                                                    {job.projectName}
                                                </Link>
                                                </div>
                                                <small className="text-muted">Lang: {job.projectLanguage}</small>
                                            </td>
                                            <td className="text-center">
                                                {job.applicantCount > 0 ? (
                                                    <Badge color="info" pill>
                                                        <FaUsers className="me-1" /> {job.applicantCount}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted small">-</span>
                                                )}
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
                                                    <Button 
                                                        color="light" 
                                                        size="sm" 
                                                        className="border text-danger" 
                                                        title="Delete"
                                                        onClick={() => handleDelete(job._id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </div>
                                            </td>
                                            )}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center p-5 text-muted">
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