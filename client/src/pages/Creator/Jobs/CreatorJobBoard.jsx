import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, CardBody, CardTitle, CardSubtitle, Button, Badge, 
    Input, InputGroup, InputGroupText, Form, FormGroup, Label, Spinner 
} from 'reactstrap';
import { useLocation, Link } from 'react-router-dom';
import { FaSearch, FaCalendarAlt, FaFilter, FaCheckCircle, FaTimesCircle, FaStar, FaBriefcase } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Components & Services
import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getAllJobs } from '../../../services/jobService';
import { useAuth } from '../../../hooks/useAuth';

export default function CreatorJobBoard() {
    const { auth } = useAuth();
    const location = useLocation(); 
    
    // --- State ---
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initialize filters
    const [filters, setFilters] = useState({
        search: '',
        status: location.state?.initialStatus || 'Open', 
        startDate: ''
    });

    // --- Fetch Logic ---
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const myRole = auth.user?.collaboratorType || auth.user?.agencyType;
            
            // 1. Fetch Data
            // We pass the status to backend so it pre-filters the heavy lifting (e.g., Assigned/Rejected queries)
            const params = {
                targetRole: myRole,
                search: filters.search,
                status: filters.status 
            };
            
            const result = await getAllJobs(params);
            let data = result.data || [];

            // 2. Client-Side Refinement
            // While the backend filters the main query, we refine the "Open" list 
            // to ensure we don't see jobs we've already applied to.
            const filteredData = data.filter(job => {
                // ✅ USE BACKEND FLAGS (Single Source of Truth)
                const isAssigned = job.isAssignedToMe; 
                const isRejected = job.isRejected; // Now relies purely on status='rejected' from backend
                const myAppStatus = job.myApplicationStatus; // 'pending', 'shortlisted', 'accepted', 'rejected'
                const hasApplied = job.hasApplied;

                // Derived Flags for UI Logic
                // Strictly Shortlisted: Status is shortlisted AND I am NOT assigned/accepted
                const isStrictlyShortlisted = myAppStatus === 'shortlisted' && !isAssigned && myAppStatus !== 'accepted';
                
                // Strictly Assigned: I am in assigned list OR my status is accepted
                const isStrictlyAssigned = isAssigned || myAppStatus === 'accepted';

                // Optional: Date Filter
                if (filters.startDate) {
                    const filterDate = new Date(filters.startDate);
                    if (new Date(job.projectStartDate) < filterDate) return false;
                }

                // Switch Logic to match Tab Selection
                switch (filters.status) {
                    case 'Open':
                        // Show ONLY jobs I can apply to:
                        // 1. Job is Open
                        // 2. I haven't applied
                        // 3. I am not assigned
                        return job.status === 'Open' && !hasApplied && !isStrictlyAssigned;

                    case 'Applied':
                        // Show Pending applications:
                        // 1. Job is Open
                        // 2. I applied (pending)
                        // 3. Not shortlisted, Not assigned, Not rejected
                        return job.status === 'Open' && hasApplied && !isStrictlyShortlisted && !isStrictlyAssigned && !isRejected;

                    case 'Shortlisted':
                        // Show ONLY Shortlisted
                        return isStrictlyShortlisted && job.status === 'Open';

                    case 'Rejected':
                        return isRejected;

                    case 'Assigned':
                        // Show Assigned Jobs (Active)
                        // 1. I am assigned
                        // 2. Job is NOT completed (History)
                        return isStrictlyAssigned && job.status !== 'Completed';

                    case 'Completed':
                        // Show History
                        return job.status === 'Completed' && isStrictlyAssigned;

                    default: // 'All'
                        return true;
                }
            });

            setJobs(filteredData);
        } catch (error) {
            console.error(error);
            toast.error("Could not load jobs");
        } finally {
            setLoading(false);
        }
    }, [filters, auth.user]);

    // --- Effects ---
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]); 

    // --- Handlers ---
    const handleSearch = (e) => {
        e.preventDefault();
        fetchJobs();
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // --- UI Helpers ---
    const getCardBorder = (job) => {
        if (job.status === 'Completed') return 'border-dark';
        if (job.isAssignedToMe || job.myApplicationStatus === 'accepted') return 'border-primary'; // Blue
        if (job.isRejected) return 'border-danger'; // Red
        if (job.myApplicationStatus === 'shortlisted') return 'border-warning'; // Gold
        if (job.hasApplied) return 'border-success'; // Green
        return 'border-light';
    };

    const getStatusBadge = (job) => {
        if (job.status === 'Completed') 
            return <Badge color="dark" pill className="px-2">Completed</Badge>;

        if (job.isAssignedToMe || job.myApplicationStatus === 'accepted') 
            return <Badge color="primary" pill className="px-2"><FaBriefcase className="me-1"/> Assigned</Badge>;

        if (job.isRejected) 
            return <Badge color="danger" pill className="px-2"><FaTimesCircle className="me-1"/> Rejected</Badge>;
        
        if (job.myApplicationStatus === 'shortlisted') 
            return <Badge color="warning" text="dark" pill className="px-2"><FaStar className="me-1"/> Shortlisted</Badge>;
        
        if (job.hasApplied) 
            return <Badge color="success" pill className="px-2"><FaCheckCircle className="me-1"/> Applied</Badge>;

        return <Badge color="info" pill className="px-2">Open</Badge>;
    };

    return (
        <Container fluid>
            <div className="mb-4">
                <Title title="Job Opportunities" subtitle={`Available projects for ${auth.user?.collaboratorType || 'you'}`} />
            </div>

            <Widget className="mb-4 p-4">
                <Form onSubmit={handleSearch}>
                    <Row className="align-items-end g-3">
                        {/* Search */}
                        <Col md={5}>
                            <Label className="fw-bold text-muted small text-uppercase">Search</Label>
                            <InputGroup>
                                <InputGroupText className="bg-white border-end-0"><FaSearch className="text-muted" /></InputGroupText>
                                <Input 
                                    className="border-start-0 ps-0"
                                    name="search"
                                    placeholder="Keywords (e.g. 'Video', 'Photos')..." 
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                            </InputGroup>
                        </Col>

                        {/* Status Filter */}
                        <Col md={3}>
                            <Label className="fw-bold text-muted small text-uppercase">Status</Label>
                            <Input 
                                type="select" 
                                name="status" 
                                value={filters.status} 
                                onChange={handleFilterChange}
                                className="form-select"
                            >
                                <option value="All">All Jobs</option>
                                <option value="Open">Open Opportunities</option>
                                <option value="Applied">Applied (Pending)</option> 
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Assigned">Assigned to Me</option>
                                <option value="Completed">Completed</option>
                                <option value="Rejected">Rejected</option>
                            </Input>
                        </Col>

                        {/* Date Filter */}
                        <Col md={3}>
                            <Label className="fw-bold text-muted small text-uppercase">Starts After</Label>
                            <Input 
                                type="date" 
                                name="startDate" 
                                value={filters.startDate} 
                                onChange={handleFilterChange}
                            />
                        </Col>

                        {/* Refresh Button */}
                        <Col md={1}>
                            <Label className="d-none d-md-block">&nbsp;</Label>
                            <Button color="primary" block type="submit" className="w-100">
                                Go
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Widget>

            {/* Content Area */}
            {loading ? (
                <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-3 text-muted">Loading jobs...</p>
                </div>
            ) : (
                <Row>
                    {jobs.length > 0 ? jobs.map(job => (
                        <Col md={6} lg={4} key={job._id} className="mb-4">
                            <Card className={`h-100 shadow-sm ${getCardBorder(job)}`} style={{ transition: '0.2s', borderWidth: '1px' }}>
                                <CardBody className="d-flex flex-column">
                                    
                                    {/* Header: Role & Status */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <Badge color="light" className="text-dark border px-2 py-1">
                                            {job.targetRole}
                                        </Badge>
                                        {getStatusBadge(job)}
                                    </div>
                                    
                                    {/* Title & Desc */}
                                    <CardTitle tag="h5" className="fw-bold mb-2 text-dark">
                                        {job.projectName}
                                    </CardTitle>
                                    <CardSubtitle className="text-muted mb-3 flex-grow-1" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                        {job.projectDescription ? job.projectDescription.substring(0, 90) + '...' : 'No description.'}
                                    </CardSubtitle>
                                    
                                    {/* Meta Data Box */}
                                    <div className="bg-light p-3 rounded mb-3 border-0">
                                        <div className="d-flex align-items-center mb-2 small text-muted">
                                            <FaCalendarAlt className="me-2" /> 
                                            <span>
                                                {new Date(job.projectStartDate).toLocaleDateString()} 
                                                {job.projectEndDate && ` - ${new Date(job.projectEndDate).toLocaleDateString()}`}
                                            </span>
                                        </div>
                                        <div className="fw-bold text-dark h5 mb-0">
                                            {job.rate ? `€${job.rate}` : 'Negotiable'}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Link to={`/creator/jobs/${job._id}`} style={{ textDecoration: 'none' }}>
                                        <Button 
                                            color="dark" 
                                            outline={!job.hasApplied}
                                            block 
                                            className="w-100 fw-bold py-2"
                                        >
                                            {filters.status === 'Open' ? 'View & Apply' : 'View Details'}
                                        </Button>
                                    </Link>
                                </CardBody>
                            </Card>
                        </Col>
                    )) : (
                        <Col xs={12} className="text-center py-5">
                            <div className="text-muted opacity-50">
                                <FaFilter size={48} className="mb-3" />
                                <h4>No jobs found</h4>
                                <p>Try adjusting your filters or search terms.</p>
                                {filters.status !== 'Open' && (
                                    <Button color="link" onClick={() => setFilters(prev => ({...prev, status: 'Open'}))}>
                                        View Open Jobs
                                    </Button>
                                )}
                            </div>
                        </Col>
                    )}
                </Row>
            )}
        </Container>
    );
}