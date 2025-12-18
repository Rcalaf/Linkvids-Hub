import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardTitle, CardSubtitle, Button, Badge, Input, InputGroup, InputGroupText, Form, FormGroup, Label } from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaSearch, FaCalendarAlt, FaBriefcase, FaFilter, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import JobStatusBadge from '../../../components/Job/JobStatusBadge';
import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getAllJobs } from '../../../services/jobService';
import { useAuth } from '../../../hooks/useAuth';

export default function CreatorJobBoard() {
    const { auth } = useAuth();
    
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filters, setFilters] = useState({
        search: '',
        status: 'Open', // Default to Open
        startDate: ''
    });

    // 🚨 Trigger fetch whenever filters change 🚨
    useEffect(() => {
        fetchJobs();
    }, [filters]); 

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const myRole = auth.user?.collaboratorType || auth.user?.agencyType;
            
            // Pass filters directly to API
            const params = {
                targetRole: myRole,
                search: filters.search,
                status: filters.status, // Can be 'Open', 'Applied', etc.
                // Backend handles the logic for 'Applied' vs standard status
            };
            
            const result = await getAllJobs(params);
            
            // Optional: Client-side date filter if backend doesn't support 'startDate' logic yet
            let data = result.data;
            if (filters.startDate) {
                const filterDate = new Date(filters.startDate);
                data = data.filter(job => new Date(job.projectStartDate) >= filterDate);
            }

            setJobs(data);
        } catch (error) {
            console.error(error);
            toast.error("Could not load jobs");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchJobs();
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Container fluid>
            <div className="mb-4">
                <Title title="Job Opportunities" subtitle={`Available projects for ${auth.user?.collaboratorType || 'you'}`} />
            </div>

            <Widget className="mb-4">
                <Form onSubmit={handleSearch}>
                    <Row className="align-items-end">
                        <Col md={5}>
                            <FormGroup className="mb-md-0">
                                <Label>Search Project</Label>
                                <InputGroup>
                                    <InputGroupText className="bg-white"><FaSearch /></InputGroupText>
                                    <Input 
                                        name="search"
                                        placeholder="Keywords..." 
                                        value={filters.search}
                                        onChange={handleFilterChange}
                                    />
                                </InputGroup>
                            </FormGroup>
                        </Col>

                        <Col md={3}>
                            <FormGroup className="mb-md-0">
                                <Label>View</Label>
                                <Input 
                                    type="select" 
                                    name="status" 
                                    value={filters.status} 
                                    onChange={handleFilterChange}
                                >
                                    <option value="Open">Open Opportunities</option>
                                    <option value="Applied">My Applications</option> {/* 🚨 Handled by backend now */}
                                    <option value="Assigned">History: Assigned</option>
                                    <option value="Completed">History: Completed</option>
                                </Input>
                            </FormGroup>
                        </Col>

                        <Col md={3}>
                            <FormGroup className="mb-md-0">
                                <Label>Starts After</Label>
                                <Input 
                                    type="date" 
                                    name="startDate" 
                                    value={filters.startDate} 
                                    onChange={handleFilterChange}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={1}>
                            <Button color="primary" block type="submit" className="w-100">
                                Go
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Widget>

            {loading ? <p className="text-center p-5">Loading...</p> : (
                <Row>
                    {jobs.length > 0 ? jobs.map(job => (
                        <Col md={6} lg={4} key={job._id} className="mb-4">
                            <Card className={`h-100 shadow-sm border-0 hover-card ${job.hasApplied ? 'border border-success' : ''}`}>
                                <CardBody className="d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <Badge color="primary" pill className="px-3 py-2">{job.targetRole}</Badge>
                                        <JobStatusBadge job={job} />
                                        {/* {job.hasApplied ? (
                                             <Badge color="success" pill className="px-2 py-2 d-flex align-items-center">
                                                <FaCheckCircle className="me-1" /> Applied
                                             </Badge>
                                        ) : (
                                            <h5 className="text-success fw-bold mb-0">
                                                {job.rate}€
                                            </h5>
                                        )} */}
                                    </div>
                                    
                                    <CardTitle tag="h5" className="fw-bold mb-3">{job.projectName}</CardTitle>
                                    
                                    <CardSubtitle className="text-muted mb-3 flex-grow-1" style={{ fontSize: '0.9rem' }}>
                                        {job.projectDescription.substring(0, 100)}...
                                    </CardSubtitle>
                                    
                                    <div className="bg-light p-3 rounded mb-3" style={{ fontSize: '0.85rem' }}>
                                        <div className="d-flex align-items-center mb-2">
                                            <FaCalendarAlt className="me-2 text-secondary" /> 
                                            <strong>Dates:</strong>&nbsp; 
                                            {new Date(job.projectStartDate).toLocaleDateString()} - {new Date(job.projectEndDate).toLocaleDateString()}
                                        </div>
                                        {/* Show status badge if viewing history */}
                                        {filters.status !== 'Open' && (
                                             <div className="mt-2">
                                                <Badge color="secondary">{job.status}</Badge>
                                            </div>
                                        )}
                                    </div>

                                    <Link to={`/creator/jobs/${job._id}`} style={{ textDecoration: 'none' }}>
                                        <Button 
                                            color={job.hasApplied ? "success" : "dark"} 
                                            outline={!job.hasApplied}
                                            block 
                                            className="w-100 fw-bold"
                                        >
                                            {job.hasApplied ? 'View Application' : 'View Details & Apply'}
                                        </Button>
                                    </Link>
                                </CardBody>
                            </Card>
                        </Col>
                    )) : (
                        <Col xs={12} className="text-center py-5">
                            <div className="text-muted">
                                <FaFilter size={40} className="mb-3 opacity-25" />
                                <h4>No jobs found</h4>
                                <p>Try adjusting your search filters.</p>
                            </div>
                        </Col>
                    )}
                </Row>
            )}
        </Container>
    );
}