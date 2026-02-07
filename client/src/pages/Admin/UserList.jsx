import React, { useState, useEffect, useRef } from 'react';
import { 
    Container, Row, Col, Table, Button, Input, InputGroup, InputGroupText, 
    Pagination, PaginationItem, PaginationLink, Form, FormGroup, Label, Badge, 
    Collapse, Modal, ModalHeader, ModalBody, ModalFooter // 🚨 Removed Dropdown imports
} from 'reactstrap'; 
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Select from 'react-select'; 
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import { FaEdit, FaTrash, FaSearch, FaTimes, FaFilter, FaChevronDown, FaChevronUp, FaClock, FaSave, FaBookmark } from 'react-icons/fa'; 

import { getAllUsers, deleteUser } from '../../services/userService'; 
import { getUniqueFilterAttributes, getAllUserTypes } from '../../services/userTypeService'; 
import { getStaticLists, getGlobalDataKey } from '../../services/staticDataService'; 
import { usePermissions } from '../../hooks/usePermissions';
import { saveFilterSet, getSavedFilters, deleteSavedFilter } from '../../services/filterService';

const PAGE_LIMIT = 20;

const BASE_FILTER_FIELDS = [
    { slug: 'country', label: 'Country', fieldType: 'select', defaultOptions: ['GLOBAL_COUNTRIES'], section: 'Location' },
    { slug: 'city', label: 'City', fieldType: 'text', defaultOptions: [], section: 'Location' },
    { slug: 'phone', label: 'Phone', fieldType: 'text', defaultOptions: [], section: 'Contact Info' },
];

const SEARCHABLE_FIELDS = ['country', 'nationality', 'native_language', 'languages_spoken'];

export default function UserList() {
    const location = useLocation();
    const navigate = useNavigate();
    const { can } = usePermissions();
    
    // Data States
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState(''); 
    const [currentSearchTerm, setCurrentSearchTerm] = useState(''); 
    const [filterSelections, setFilterSelections] = useState({});
    const [localFilterSelections, setLocalFilterSelections] = useState({});
    const [openSections, setOpenSections] = useState({});
    
    // Saved Filter States
    const [savedFilters, setSavedFilters] = useState([]);
    const [saveFilterModal, setSaveFilterModal] = useState(false);
    const [newFilterName, setNewFilterName] = useState('');
    
    // 🚨 NEW: Track which preset ID is currently selected in the dropdown
    const [selectedPresetId, setSelectedPresetId] = useState('');

    const [pageJumpValue, setPageJumpValue] = useState(''); 
    const cachedData = useRef({ attributes: [], globalLists: null, userTypes: null }); 

    useEffect(() => {
        loadSavedFilters();
        const params = new URLSearchParams(location.search);
        const typeSlug = params.get('type');

        if (typeSlug && cachedData.current.userTypes) {
            const config = cachedData.current.userTypes.find(t => t.slug === typeSlug);
            if (config) {
                const filterKey = config.parentType === 'Collaborator' ? 'collaboratorType' : 'agencyType';
                const newFilters = { [filterKey]: typeSlug };
                setFilterSelections(prev => ({ ...prev, ...newFilters }));
                setLocalFilterSelections(prev => ({ ...prev, ...newFilters }));
            }
        }
    }, [location.search, cachedData.current.userTypes]); 

    useEffect(() => {
        fetchUsersAndFilters();
    }, [page, currentSearchTerm, filterSelections]); 

    const loadSavedFilters = async () => {
        try {
            const data = await getSavedFilters('collaborators');
            setSavedFilters(data);
        } catch (error) {
            console.error("Failed to load saved filters");
        }
    };

    const fetchUsersAndFilters = async () => {
        setLoading(true);
        try {
            if (!cachedData.current.globalLists) {
                const [filterAttrsResponse, staticListsRes, userTypesRes] = await Promise.all([
                    getUniqueFilterAttributes(),
                    getStaticLists(),
                    getAllUserTypes()
                ]);

                const staticSlugs = new Set(BASE_FILTER_FIELDS.map(f => f.slug));
                const uniqueDynamicAttrs = filterAttrsResponse.filter(attr => !staticSlugs.has(attr.slug));
                
                cachedData.current.attributes = [...BASE_FILTER_FIELDS, ...uniqueDynamicAttrs];
                cachedData.current.globalLists = staticListsRes;
                cachedData.current.userTypes = userTypesRes;
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
    
    // --- Handlers ---
    const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) setPage(newPage); };
    const handlePageJump = (e) => { e.preventDefault(); const target = parseInt(pageJumpValue, 10); if (target >= 1 && target <= totalPages) { handlePageChange(target); setPageJumpValue(''); } };
    
    const handleSearchSubmit = (e) => { 
        e.preventDefault(); 
        setPage(1); 
        setCurrentSearchTerm(searchTerm); 
    };

    const handleFilterChange = (slug, value) => {
        setLocalFilterSelections(prev => {
            const newSelections = { ...prev };
            if (value === 'all' || value === '') delete newSelections[slug];
            else newSelections[slug] = value;
            return newSelections;
        });
        // 🚨 Reset preset selection if user manually changes filters
        setSelectedPresetId(''); 
    };

    const handleReactSelectChange = (slug, selectedOption) => {
        const value = selectedOption ? selectedOption.value : '';
        handleFilterChange(slug, value);
    };

    const handleRangeChange = (slug, boundary, value) => {
        setLocalFilterSelections(prev => {
            const newSelections = { ...prev };
            const currentRange = { ...newSelections[slug] } || {}; 
            if (value === '' || value === null) delete currentRange[boundary];
            else currentRange[boundary] = value;
            if (Object.keys(currentRange).length === 0) delete newSelections[slug];
            else newSelections[slug] = currentRange;
            return newSelections;
        });
        setSelectedPresetId('');
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
        setSelectedPresetId('');
        navigate('/admin/collaborators'); 
        toast.info("All filters cleared.");
    };

    const handleRemoveFilterTag = (key) => {
        setFilterSelections(prev => { const next = { ...prev }; delete next[key]; return next; });
        setLocalFilterSelections(prev => { const next = { ...prev }; delete next[key]; return next; });
        setSelectedPresetId('');
        if (key === 'collaboratorType' || key === 'agencyType') navigate('/admin/collaborators');
    };

    const handleSaveFilter = async () => {
        if (!newFilterName.trim()) return toast.error("Please enter a name");
        try {
            await saveFilterSet(newFilterName, filterSelections, 'collaborators');
            toast.success("Filter saved!");
            setSaveFilterModal(false);
            setNewFilterName('');
            loadSavedFilters();
        } catch (error) {
            toast.error("Failed to save filter");
        }
    };

    // 🚨 UPDATED: Handle change from the standard Select
    const handlePresetChange = (e) => {
        const id = e.target.value;
        setSelectedPresetId(id);
        
        if (id) {
            const saved = savedFilters.find(f => f._id === id);
            if (saved) {
                setFilterSelections(saved.filters);
                setLocalFilterSelections(saved.filters);
                toast.info(`Loaded: ${saved.name}`);
            }
        }
    };

    const handleDeletePreset = async () => {
        if (!selectedPresetId) return;
        if (!window.confirm("Delete this saved preset?")) return;
        try {
            await deleteSavedFilter(selectedPresetId);
            loadSavedFilters();
            setSelectedPresetId(''); // Reset dropdown
            toast.success("Preset deleted");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const toggleSection = (sectionName) => {
        setOpenSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
    };

    const isSectionOpen = (sectionName) => openSections[sectionName] === true;

    const handleDelete = async (userId, name) => { 
        if (!window.confirm(`Delete user ${name}?`)) return; 
        try { await deleteUser(userId); toast.success('User deleted'); fetchUsersAndFilters(); } catch(e) { toast.error('Failed to delete user'); } 
    };
    
    const getUserDisplayName = (u) => u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.name;
    const getAttributeLabel = (slug) => {
        if (slug === 'collaboratorType') return 'Role Type';
        if (slug === 'agencyType') return 'Agency Type';
        const attr = cachedData.current.attributes.find(a => a.slug === slug);
        return attr ? attr.label : slug; 
    };
    const getAttributeValueLabel = (slug, value) => {
        if (typeof value === 'object') return `${value.min || '?'} - ${value.max || '?'}`;
        if (value === 'true') return 'Yes';
        if (value === 'false') return 'No';
        return value;
    };

    // --- Renderers ---
    const renderActiveFilterTags = () => {
        const activeKeys = Object.keys(filterSelections).filter(k => filterSelections[k] !== undefined);
        if (activeKeys.length === 0 && !currentSearchTerm) return null;

        return (
            <div className="d-flex flex-wrap gap-2 mb-3 align-items-center bg-white p-2 border rounded">
                <small className="text-muted fw-bold me-2"><FaFilter /> Active Filters:</small>
                {currentSearchTerm && (
                    <Badge color="info" className="p-2 d-flex align-items-center">
                        <span className="me-2">Search: "{currentSearchTerm}"</span>
                        <FaTimes style={{ cursor: 'pointer' }} onClick={() => { setCurrentSearchTerm(''); setSearchTerm(''); }} />
                    </Badge>
                )}
                {activeKeys.map(key => (
                    <Badge key={key} color="primary" className="p-2 d-flex align-items-center">
                        <span className="me-2">{getAttributeLabel(key)}: <strong>{getAttributeValueLabel(key, filterSelections[key])}</strong></span>
                        <FaTimes style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilterTag(key)} />
                    </Badge>
                ))}
                
                {activeKeys.length > 0 && (
                     <Button color="link" size="sm" className="text-success fw-bold text-decoration-none py-0" onClick={() => setSaveFilterModal(true)}>
                        <FaSave className="me-1" /> Save as Preset
                    </Button>
                )}

                <Button color="link" size="sm" className="text-danger text-decoration-none py-0" onClick={handleClearFilters}>Clear All</Button>
            </div>
        );
    };

    const renderFilter = (attr) => {
        // ... (Rendering logic remains the same) ...
        const isDropdown = ['select', 'array', 'boolean'].includes(attr.fieldType);
        const isNumberRange = attr.fieldType === 'number'; 
        if (attr.fieldType === 'text') return null; 
        if (!isDropdown && !isNumberRange) return null; 

        const currentRange = localFilterSelections[attr.slug] || {};
        const isBoolean = attr.fieldType === 'boolean'; 

        if (isNumberRange) {
            return (
                <Col md={4} lg={3} key={attr.slug} className="mb-3">
                    <FormGroup className="mb-0">
                        <Label className="small fw-bold">{attr.label} (Range)</Label>
                        <InputGroup size="sm">
                            <Input type="number" value={currentRange.min || ''} onChange={(e) => handleRangeChange(attr.slug, 'min', e.target.value)} placeholder="Min" />
                            <InputGroupText>-</InputGroupText>
                            <Input type="number" value={currentRange.max || ''} onChange={(e) => handleRangeChange(attr.slug, 'max', e.target.value)} placeholder="Max" />
                        </InputGroup>
                    </FormGroup>
                </Col>
            );
        } else {
            let options = [];
            const globalKey = getGlobalDataKey(attr.defaultOptions);

            if (isBoolean) options = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
            else if (globalKey && cachedData.current.globalLists) options = cachedData.current.globalLists[globalKey] || [];
            else options = attr.defaultOptions || [];

            if (SEARCHABLE_FIELDS.includes(attr.slug) && !isBoolean) {
                const selectOptions = options.map(o => {
                    const val = typeof o === 'object' ? o.value : o;
                    const lbl = typeof o === 'object' ? o.label : o;
                    return { value: val, label: lbl };
                });
                const currentValue = localFilterSelections[attr.slug];
                const selectedOption = selectOptions.find(opt => opt.value === currentValue) || null;

                return (
                    <Col md={4} lg={3} key={attr.slug} className="mb-3">
                        <FormGroup className="mb-0">
                            <Label className="small fw-bold">{attr.label}</Label>
                            <Select
                                options={selectOptions}
                                value={selectedOption}
                                onChange={(opt) => handleReactSelectChange(attr.slug, opt)}
                                placeholder={`Select ${attr.label}...`}
                                isClearable={true}
                                styles={{ control: (base) => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }), menu: (base) => ({ ...base, zIndex: 9999 }) }}
                            />
                        </FormGroup>
                    </Col>
                );
            }

            return (
                <Col md={4} lg={3} key={attr.slug} className="mb-3">
                    <FormGroup className="mb-0">
                        <Label className="small fw-bold">{attr.label}</Label>
                        <Input type="select" bsSize="sm" value={localFilterSelections[attr.slug] || 'all'} onChange={(e) => handleFilterChange(attr.slug, e.target.value)}>
                            <option value="all">Any</option>
                            {options.map((o, idx) => {
                                const val = typeof o === 'object' ? o.value : o;
                                const lbl = typeof o === 'object' ? o.label : o;
                                return <option key={idx} value={val}>{lbl}</option>;
                            })}
                        </Input>
                    </FormGroup>
                </Col>
            );
        }
    };
    
    // Group filters
    const groupedFilters = cachedData.current.attributes.reduce((acc, attr) => {
        if (attr.fieldType === 'text') return acc; 
        const section = attr.section || 'Other'; 
        if (!acc[section]) acc[section] = [];
        if (renderFilter(attr) !== null) acc[section].push(attr);
        return acc;
    }, {});

    const getDirectoryTitle = () => {
        const activeTypeSlug = filterSelections.collaboratorType || filterSelections.agencyType;
        if (activeTypeSlug && cachedData.current.userTypes) {
            const config = cachedData.current.userTypes.find(t => t.slug === activeTypeSlug);
            return config ? `${config.name} Directory` : "User Directory";
        }
        return "User Directory";
    };

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

    if (loading) return <div className="p-5 text-center">Loading user data...</div>;

    return (
        <Container fluid>
            <Title title="User Management" />
            <Widget title={<span className="fw-bold fs-5">{getDirectoryTitle()}</span>}>
                
                {/* 1. Main Toolbar */}
                <Row className="mb-4 align-items-center">
                    <Col md={5}>
                        <Form onSubmit={handleSearchSubmit}>
                            <InputGroup>
                                <InputGroupText className="bg-white"><FaSearch /></InputGroupText>
                                <Input type="search" placeholder="Search name, email, city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                <Button color="primary" type="submit">Search</Button>
                            </InputGroup>
                        </Form>
                    </Col>
                    
                    <Col md={7} className="text-end d-flex justify-content-end align-items-center gap-2">
                        
                        {/* Saved Filters Group */}
                        <div className="d-flex align-items-center">
                            <Input 
                                type="select" 
                                value={selectedPresetId} 
                                onChange={handlePresetChange}
                                style={{ maxWidth: '200px' }}
                                className="me-1"
                            >
                                <option value="">Preset Filters...</option>
                                {savedFilters.length > 0 ? (
                                    savedFilters.map(f => (
                                        <option key={f._id} value={f._id}>{f.name}</option>
                                    ))
                                ) : (
                                    <option disabled>No saved presets</option>
                                )}
                            </Input>
                            
                            {/* Delete Preset Button (Only shows if a preset is selected) */}
                            <Button 
                                color="light" 
                                className="border text-danger" 
                                disabled={!selectedPresetId}
                                onClick={handleDeletePreset}
                                title="Delete this preset"
                            >
                                <FaTrash />
                            </Button>
                        </div>

                        {can('collaborators', 'edit') && (
                            <Link to="/admin/collaborators/create" className="ms-2">
                                <Button color="success" size="sm" className="shadow-sm"><span className="fw-bold fs-5 me-1">+</span> Create User</Button>
                            </Link>
                        )}
                    </Col>
                </Row>

                {/* 2. ACCORDION FILTER SECTIONS */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0 text-secondary"><FaFilter className="me-2" /> Filters</h6>
                        <div>
                            <Button color="white" size="sm" onClick={handleClearFilters} className="me-2 text-danger border-0">Reset</Button>
                            <Button color="primary" size="sm" onClick={handleApplyAllFilters} className="px-3">Apply Filters</Button>
                        </div>
                    </div>
                    
                    {Object.entries(groupedFilters).map(([section, attributes]) => {
                        if (attributes.length === 0) return null;
                        const isOpen = isSectionOpen(section);
                        
                        return (
                            <div key={section} className="mb-2 bg-light border rounded">
                                <div 
                                    className="d-flex justify-content-between align-items-center p-2 px-3 cursor-pointer" 
                                    onClick={() => toggleSection(section)}
                                    style={{ cursor: 'pointer', backgroundColor: isOpen ? '#f8f9fa' : '#fff' }}
                                >
                                    <strong className="text-primary text-uppercase small">{section}</strong>
                                    <span className="text-muted small">
                                        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                                    </span>
                                </div>
                                <Collapse isOpen={isOpen}>
                                    <div className="p-3 border-top bg-white" style={{ overflow: 'visible' }}>
                                        <Row>
                                            {attributes.map(renderFilter)}
                                        </Row>
                                    </div>
                                </Collapse>
                            </div>
                        );
                    })}
                </div>

                {/* 3. ACTIVE FILTERS */}
                {renderActiveFilterTags()}

                {/* 4. Table */}
                <div className="table-responsive">
                    <Table striped hover className="mt-3 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role / Type</th>
                                <th>Location</th>
                                <th><span className="d-flex align-items-center text-muted small"><FaClock className="me-1" /> Last Login</span></th>
                                {can('collaborators', 'edit') && <th className="text-end">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? users.map(user => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <img src={user.profile_picture || 'https://placehold.co/40?text=User'} alt="avatar" className="rounded-circle me-3 border" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                            <Link to={`/admin/collaborators/${user._id}`} className="fw-bold text-decoration-none text-dark">{getUserDisplayName(user)}</Link>
                                        </div>
                                    </td>
                                    <td><span className="text-muted">{user.email}</span></td>
                                    <td>
                                        <Badge color="light" className="text-dark border me-1">{user.userType}</Badge>
                                        <small className="text-primary fw-bold">{user.collaboratorType || user.agencyType || '-'}</small>
                                    </td>
                                    <td>{user.city ? `${user.city}, ${user.country}` : <span className="text-muted">-</span>}</td>
                                    <td>
                                        {user.lastLogin ? (
                                            <div className="text-muted small">
                                                <div>{new Date(user.lastLogin).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '0.75rem' }}>{new Date(user.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </div>
                                        ) : (<span className="text-muted small fst-italic">Never</span>)}
                                    </td>
                                    {can('collaborators', 'edit') && (
                                        <td className="text-end">
                                            <Link to={`/admin/collaborators/${user._id}/edit`}><Button color="white" size="sm" className="me-2 text-secondary" title="Edit"><FaEdit /></Button></Link>
                                            <Button color="white" size="sm" className="text-danger" onClick={() => handleDelete(user._id, getUserDisplayName(user))} title="Delete"><FaTrash /></Button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-5 text-muted">No users found matching your criteria.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* 5. Pagination */}
                {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                        <Form onSubmit={handlePageJump} className="d-flex align-items-center">
                            <Label for="pageJump" className="me-2 mb-0 small text-muted">Page:</Label>
                            <InputGroup style={{ width: '120px' }} size="sm">
                                <Input type="number" min="1" max={totalPages} value={pageJumpValue} onChange={(e) => setPageJumpValue(e.target.value)} placeholder={page} />
                                <Button color="light" className="border" type="submit" disabled={!pageJumpValue}>Go</Button>
                            </InputGroup>
                        </Form>
                        <nav>
                            <Pagination size="sm">
                                <PaginationItem disabled={page === 1}><PaginationLink first onClick={() => handlePageChange(1)} /></PaginationItem>
                                <PaginationItem disabled={page === 1}><PaginationLink previous onClick={() => handlePageChange(page - 1)} /></PaginationItem>
                                {pagesToShow.map((p, i) => (<PaginationItem key={i} active={p === page} disabled={p === '...'}> <PaginationLink onClick={() => handlePageChange(p)}>{p}</PaginationLink> </PaginationItem>))}
                                <PaginationItem disabled={page === totalPages}><PaginationLink next onClick={() => handlePageChange(page + 1)} /></PaginationItem>
                                <PaginationItem disabled={page === totalPages}><PaginationLink last onClick={() => handlePageChange(totalPages)} /></PaginationItem>
                            </Pagination>
                        </nav>
                    </div>
                )}
            </Widget>

            {/* Save Filter Modal */}
            <Modal isOpen={saveFilterModal} toggle={() => setSaveFilterModal(false)}>
                <ModalHeader toggle={() => setSaveFilterModal(false)}>Save Filter Preset</ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label>Preset Name</Label>
                        <Input 
                            placeholder="e.g., Actors in Madrid" 
                            value={newFilterName} 
                            onChange={(e) => setNewFilterName(e.target.value)} 
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setSaveFilterModal(false)}>Cancel</Button>
                    <Button color="primary" onClick={handleSaveFilter}>Save Filter</Button>
                </ModalFooter>
            </Modal>
        </Container>
    );
}