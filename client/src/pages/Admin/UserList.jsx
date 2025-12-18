// client/src/pages/Admin/UserList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Table, Button, Input, InputGroup, InputGroupText, Pagination, PaginationItem, PaginationLink, Form, FormGroup, Label } from 'reactstrap';
import { Link, useLocation } from 'react-router-dom'; // 🚨 Import useLocation
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import { FaEdit,FaTrash, FaSearch, FaTimesCircle } from 'react-icons/fa'; 

import { getAllUsers, deleteUser } from '../../services/userService'; 
import { getUniqueFilterAttributes, getAllUserTypes } from '../../services/userTypeService'; // 🚨 Import getAllUserTypes
import { getStaticLists, getGlobalDataKey } from '../../services/staticDataService'; 
import { usePermissions } from '../../hooks/usePermissions';

const PAGE_LIMIT = 20;

const BASE_FILTER_FIELDS = [
    { slug: 'country', label: 'Country', fieldType: 'select', defaultOptions: ['GLOBAL_COUNTRIES'], section: 'Location' },
    { slug: 'city', label: 'City', fieldType: 'text', defaultOptions: [], section: 'Location' },
    { slug: 'phone', label: 'Phone', fieldType: 'text', defaultOptions: [], section: 'Contact Info' },
];

const ALLOWED_TEXT_FILTER_SLUGS = ['city', 'address', 'phone']; 

export default function UserList() {
    const location = useLocation(); // 🚨 Hook to read URL params
    const { can } = usePermissions();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');
    
    const [filterSelections, setFilterSelections] = useState({});
    const [localFilterSelections, setLocalFilterSelections] = useState({});
    const [pageJumpValue, setPageJumpValue] = useState(''); 
    
    const cachedData = useRef({ attributes: [], globalLists: null, userTypes: null }); 

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const typeSlug = params.get('type');

        if (typeSlug && cachedData.current.userTypes) {
            // Find the config to know if it is a Collaborator or Agency
            const config = cachedData.current.userTypes.find(t => t.slug === typeSlug);
            if (config) {
                const filterKey = config.parentType === 'Collaborator' ? 'collaboratorType' : 'agencyType';
                
                // Apply filter immediately
                setFilterSelections(prev => ({
                    ...prev,
                    [filterKey]: typeSlug
                }));
            }
        } else if (!typeSlug) {
            // If no type param, clear specific type filters (optional, keeps list clean on nav)
            setFilterSelections(prev => {
                const next = { ...prev };
                delete next.collaboratorType;
                delete next.agencyType;
                return next;
            });
        }
    }, [location.search, cachedData.current.userTypes]); // Run when URL or Data changes


    useEffect(() => {
        fetchUsersAndFilters();
    }, [page, currentSearchTerm, filterSelections]); 

    const fetchUsersAndFilters = async () => {
        setLoading(true);
        try {
            let filterAttrs = cachedData.current.attributes;
            let staticListsResponse = cachedData.current.globalLists;
            let userTypesList = cachedData.current.userTypes;
            
            // Fetch Configuration Data if cache is empty
            if (!staticListsResponse) {
                const [filterAttrsResponse, staticListsRes, userTypesRes] = await Promise.all([
                    getUniqueFilterAttributes(),
                    getStaticLists(),
                    getAllUserTypes() // 🚨 Fetch types to resolve slugs
                ]);

                const staticSlugs = new Set(BASE_FILTER_FIELDS.map(f => f.slug));
                const uniqueDynamicAttrs = filterAttrsResponse.filter(attr => !staticSlugs.has(attr.slug));
                
                filterAttrs = [...BASE_FILTER_FIELDS, ...uniqueDynamicAttrs];
                staticListsResponse = staticListsRes;
                userTypesList = userTypesRes;
                
                // Update Cache
                cachedData.current.attributes = filterAttrs;
                cachedData.current.globalLists = staticListsResponse;
                cachedData.current.userTypes = userTypesList;
            }

            const queryParams = { 
                page, 
                limit: PAGE_LIMIT, 
                search: currentSearchTerm, 
                ...filterSelections 
            };
            
            const response = await getAllUsers(queryParams);
            setUsers(response.data);
            setTotalPages(Math.ceil(response.metadata.total / PAGE_LIMIT));

        } catch (error) {
            toast.error(error.message || "Failed to load user list.");
        } finally {
            setLoading(false);
        }
    };
    
    // ... (Handlers: handlePageChange, handlePageJump, handleSearchSubmit remain the same) ...
    const handlePageChange = (newPage) => { if (typeof newPage === 'number' && newPage >= 1 && newPage <= totalPages) setPage(newPage); };
    const handlePageJump = (e) => { e.preventDefault(); const target = parseInt(pageJumpValue, 10); if (target >= 1 && target <= totalPages) { handlePageChange(target); setPageJumpValue(''); } else toast.error('Invalid page'); };
    const handleSearchSubmit = (e) => { e.preventDefault(); setPage(1); setCurrentSearchTerm(searchTerm); };

    const handleFilterChange = (slug, value) => {
        setLocalFilterSelections(prev => {
            const newSelections = { ...prev };
            newSelections[slug] = (value === 'all' || value === '') ? undefined : value;
            return newSelections;
        });
    };

    const handleRangeChange = (slug, boundary, value) => {
        setLocalFilterSelections(prev => {
            const newSelections = { ...prev };
            const currentRange = newSelections[slug] || {}; 
            if (value === '' || value === null) delete currentRange[boundary];
            else currentRange[boundary] = value;

            if (Object.keys(currentRange).length === 0) delete newSelections[slug];
            else newSelections[slug] = currentRange;
            return newSelections;
        });
    };
    
    const handleApplyAllFilters = () => {
        setFilterSelections(localFilterSelections);
        setPage(1); 
    };
    
    const handleClearFilters = () => {
        setSearchTerm(''); 
        setCurrentSearchTerm(''); 
        setLocalFilterSelections({}); 
        setFilterSelections({}); 
        setPage(1); 
        toast.info("All filters cleared.");
    };

    // ... (Delete logic & Rendering helpers remain the same) ...
    const handleDelete = async (userId, name) => { if (!window.confirm('Delete?')) return; try { await deleteUser(userId); toast.success('Deleted'); fetchUsersAndFilters(); } catch(e) { toast.error('Failed'); } };
    const getUserDisplayName = (u) => u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.name;
    
    // Pagination Logic
    const getPaginationRange = () => {
        const delta = 2; const range = []; const rangeWithEllipsis = []; let l;
        if (totalPages <= 1) return [1];
        for (let i = page - delta; i <= page + delta; i++) { if (i > 0 && i <= totalPages) range.push(i); }
        range.forEach(i => { if (l) { if (i - l === 2) rangeWithEllipsis.push(l + 1); else if (i - l !== 1) rangeWithEllipsis.push('...'); } rangeWithEllipsis.push(i); l = i; });
        if (!rangeWithEllipsis.includes(1)) { rangeWithEllipsis.unshift(1); if (rangeWithEllipsis[1] !== 2) rangeWithEllipsis.splice(1, 0, '...'); }
        if (!rangeWithEllipsis.includes(totalPages)) { if (rangeWithEllipsis[rangeWithEllipsis.length - 1] !== totalPages - 1) rangeWithEllipsis.push('...'); rangeWithEllipsis.push(totalPages); }
        return Array.from(new Set(rangeWithEllipsis));
    };
    const pagesToShow = getPaginationRange();

    // ... (renderFilter, groupFiltersBySection logic remains the same) ...
    const renderFilter = (attr) => {
        const globalKey = getGlobalDataKey(attr.defaultOptions);
        const isDropdown = ['select', 'array', 'boolean'].includes(attr.fieldType);
        const isNumberRange = attr.fieldType === 'number'; 
        const isAllowedText = ALLOWED_TEXT_FILTER_SLUGS.includes(attr.slug);
        
        if (attr.fieldType === 'text') return null; 
        if (!isDropdown && !isNumberRange) return null; 

        const isSelectFilter = isDropdown;
        const currentRange = localFilterSelections[attr.slug] || {};
        const isBoolean = attr.fieldType === 'boolean'; 

        if (isNumberRange) {
            return (
                <Col md={6} key={attr.slug}>
                    <FormGroup>
                        <Label className="small">{attr.label} (Min/Max)</Label>
                        <InputGroup>
                            <Input type="number" value={currentRange.min || ''} onChange={(e) => handleRangeChange(attr.slug, 'min', e.target.value)} placeholder="Min" />
                            <Input type="number" value={currentRange.max || ''} onChange={(e) => handleRangeChange(attr.slug, 'max', e.target.value)} placeholder="Max" />
                        </InputGroup>
                    </FormGroup>
                </Col>
            );
        } else if (isSelectFilter) {
            let options = globalKey ? cachedData.current.globalLists[globalKey] : attr.defaultOptions;
            if (isBoolean) options = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
            if (!options || options.length === 0) return null;

            return (
                <Col md={3} key={attr.slug}>
                    <FormGroup>
                        <Label className="small">{attr.label}</Label>
                        <Input type="select" value={localFilterSelections[attr.slug] || 'all'} onChange={(e) => handleFilterChange(attr.slug, e.target.value)}>
                            <option value="all">All {attr.label}</option>
                            {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
                        </Input>
                    </FormGroup>
                </Col>
            );
        }
    };
    
    const groupFiltersBySection = () => {
        return cachedData.current.attributes.reduce((acc, attr) => {
            if (attr.fieldType === 'text') return acc; 
            const section = attr.section || 'Other'; 
            if (!acc[section]) acc[section] = [];
            if (renderFilter(attr) !== null) acc[section].push(attr);
            return acc;
        }, {});
    };
    const groupedFilters = groupFiltersBySection();

    const getDirectoryTitle = () => {
        // Check if a specific type filter is active
        const activeTypeSlug = filterSelections.collaboratorType || filterSelections.agencyType;
        
        if (activeTypeSlug && cachedData.current.userTypes) {
            // Find the full config object to get the readable name (e.g., "UGC Content Creator")
            const config = cachedData.current.userTypes.find(t => t.slug === activeTypeSlug);
            if (config) {
                return `${config.name} Directory`;
            }
        }
        
        // Default title
        return "User Directory";
    };

    if (loading) return <p>Loading user data...</p>;

    return (
        <Container fluid>
            <Title title="User Management List" />
            <Widget title={getDirectoryTitle()}>
                {/* Search & Create Row */}
                <Row className="mb-4 align-items-center">
                    <Col md={6}>
                        <Form onSubmit={handleSearchSubmit}>
                            <InputGroup>
                                <InputGroupText><FaSearch /></InputGroupText>
                                <Input type="search" placeholder="Search ALL text fields..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                <Button color="primary" type="submit">Search</Button>
                            </InputGroup>
                        </Form>
                    </Col>
                    {can('collaborators', 'edit') && (
                    <Col md={6} className="text-end">
                        <Link to="/admin/collaborators/create"><Button color="success">➕ Create New User</Button></Link>
                    </Col>
                    )}
                </Row>

                {/* Filters */}
                {Object.keys(groupedFilters).length > 0 && (
                    <div className="mb-4 p-3 border rounded bg-light">
                        <h6>Filter Users</h6>
                        {Object.entries(groupedFilters).map(([section, attributes]) => (
                            <div key={section} className="mb-3 border-top pt-3">
                                <h6 className="text-primary mb-2">{section}</h6>
                                <Row>{attributes.map(renderFilter)}</Row>
                            </div>
                        ))}
                        <div className="text-end mt-3">
                            <Button color="danger" onClick={handleClearFilters} className="me-2"><FaTimesCircle /> Clear Filters</Button>
                            <Button color="primary" onClick={handleApplyAllFilters}>Apply Filters</Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <Table striped responsive className="mt-3">
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Type</th><th>City/Country</th>
                         {can('collaborators', 'edit') && (
                        <th>Actions</th>
                         )}
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? users.map(user => (
                            <tr key={user._id}>
                                <td><Link to={`/admin/collaborators/${user._id}`} style={{ fontWeight: 'bold' }}>{getUserDisplayName(user)}</Link></td>
                                <td>{user.email}</td>
                                <td>{user.userType} / <strong>{user.collaboratorType || user.agencyType || 'Admin'}</strong></td>
                                <td>{user.city}, {user.country}</td>
                                {can('collaborators', 'edit') && (
                                    <td>
                                        <Link to={`/admin/collaborators/${user._id}/edit`}>
                                            <Button color="light" size="sm" className="me-2 border"><FaEdit /></Button>
                                        </Link>
                                        <Button color="light" size="sm" className="text-danger border" onClick={() => handleDelete(user._id, getUserDisplayName(user))}>
                                            <FaTrash />
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className="text-center">No users found.</td></tr>
                        )}
                    </tbody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center">
                        <Form onSubmit={handlePageJump} className="d-flex align-items-center">
                            <Label for="pageJump" className="me-2 mb-0 small">Go to Page:</Label>
                            <InputGroup style={{ width: '150px' }}>
                                <Input type="number" min="1" max={totalPages} value={pageJumpValue} onChange={(e) => setPageJumpValue(e.target.value)} placeholder={`1 - ${totalPages}`} />
                                <Button color="secondary" size="sm" type="submit" disabled={!pageJumpValue}>Go</Button>
                            </InputGroup>
                        </Form>
                        <nav className="d-flex justify-content-center flex-grow-1">
                            <Pagination>
                                <PaginationItem disabled={page === 1}><PaginationLink first onClick={() => handlePageChange(1)} /></PaginationItem>
                                <PaginationItem disabled={page === 1}><PaginationLink previous onClick={() => handlePageChange(page - 1)} /></PaginationItem>
                                {pagesToShow.map((p, i) => (
                                    <PaginationItem key={i} active={p === page} disabled={p === '...'}>
                                        <PaginationLink onClick={() => handlePageChange(p)}>{p}</PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem disabled={page === totalPages}><PaginationLink next onClick={() => handlePageChange(page + 1)} /></PaginationItem>
                                <PaginationItem disabled={page === totalPages}><PaginationLink last onClick={() => handlePageChange(totalPages)} /></PaginationItem>
                            </Pagination>
                        </nav>
                    </div>
                )}
            </Widget>
        </Container>
    );
}