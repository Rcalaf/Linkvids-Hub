// client/src/pages/Admin/News/NewsList.jsx
import React, { useState, useEffect } from 'react';
import { 
    Container, Table, Button, Badge, Input, Row, Col, 
    InputGroup, InputGroupText, Pagination, PaginationItem, PaginationLink 
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaSearch, FaTrash, FaNewspaper, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getAllNewsAdmin, deleteNews } from '../../../services/newsService';
import { usePermissions } from '../../../hooks/usePermissions';

export default function NewsList() {
    const { can } = usePermissions();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Pagination State
    const [filters, setFilters] = useState({
        search: '',
        status: 'all'
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    // Fetch News whenever filters or page changes
    useEffect(() => {
        fetchNews();
    }, [page, filters]);

    const fetchNews = async () => {
        setLoading(true);
        try {
            // Note: If your backend endpoint /news/admin/all returns a flat array,
            // you might need to implement slicing here or update backend to accept query params.
            // This assumes the service/backend mimics the Job structure (accepting params).
            const data = await getAllNewsAdmin({ 
                page, 
                limit: LIMIT,
                search: filters.search,
                status: filters.status
            });
            
            // Handle both flat array (legacy) or paginated response object
            let newsData = [];
            let totalItems = 0;

            if (Array.isArray(data)) {
                // Client-side filtering/pagination fallback if backend sends all
                let filtered = data;
                if (filters.status !== 'all') filtered = filtered.filter(n => n.status === filters.status);
                if (filters.search) filtered = filtered.filter(n => n.title.toLowerCase().includes(filters.search.toLowerCase()));
                
                totalItems = filtered.length;
                
                // Manual Slice for pagination
                const startIndex = (page - 1) * LIMIT;
                newsData = filtered.slice(startIndex, startIndex + LIMIT);
            } else {
                // Server-side pagination
                newsData = data.data || [];
                totalItems = data.metadata?.total || 0;
            }

            setNews(newsData);
            setTotalPages(Math.ceil(totalItems / LIMIT) || 1);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load news");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this news item?")) return;
        try {
            await deleteNews(id);
            toast.success("News item deleted");
            fetchNews(); // Refresh
        } catch (e) { 
            toast.error("Failed to delete"); 
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Published': return 'success';
            case 'Draft': return 'secondary';
            default: return 'light';
        }
    };

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
            <Title title="News & Announcements" />
            
            {can('news', 'edit') && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <Link to="/admin/news/create">
                        <Button color="primary">
                            <FaPlus className="me-2" /> Post News
                        </Button>
                    </Link>
                </div>
            )}

            <Widget title="All News">
                {/* FILTERS */}
                <Row className="mb-4 gx-2">
                    <Col md={5}>
                        <InputGroup>
                            <InputGroupText className="bg-white"><FaSearch /></InputGroupText>
                            <Input 
                                placeholder="Search by title..." 
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                            />
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Input 
                            type="select" 
                            name="status" 
                            value={filters.status} 
                            onChange={handleFilterChange}
                        >
                            <option value="all">All Statuses</option>
                            <option value="Published">Published</option>
                            <option value="Draft">Draft</option>
                        </Input>
                    </Col>
                    <Col md={4} className="text-end">
                         <Button 
                            color="secondary" 
                            outline 
                            onClick={() => {
                                setFilters({ search: '', status: 'all' });
                                setPage(1);
                            }}
                        >
                            Clear Filters
                        </Button>
                    </Col>
                </Row>

                {loading ? <p className="text-muted p-3">Loading news...</p> : (
                    <>
                        <div className="table-responsive">
                            <Table hover className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-top-0">Article Details</th>
                                        <th className="border-top-0">Status</th>
                                        <th className="border-top-0">Date</th>
                                        {can('news', 'edit') && (
                                            <th className="border-top-0 text-end">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {news.length > 0 ? news.map(item => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className="fw-bold">
                                                    {can('news', 'edit') ? (
                                                        <Link 
                                                            to={`/admin/news/${item._id}/edit`}
                                                            className="text-primary text-decoration-none fw-bold"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                        >
                                                            {item.title}
                                                        </Link>
                                                    ) : (
                                                        item.title
                                                    )}
                                                </div>
                                                <small className="text-muted d-block text-truncate" style={{ maxWidth: '300px' }}>
                                                    {item.excerpt}
                                                </small>
                                                {item.linkUrl && (
                                                    <small className="text-info">
                                                        <FaExternalLinkAlt size={10} className="me-1"/> 
                                                        External Link
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <Badge color={getStatusBadge(item.status)}>{item.status}</Badge>
                                            </td>
                                            <td>
                                                <small className="text-muted">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </small>
                                            </td>
                                            {can('news', 'edit') && (
                                                <td className="text-end">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <Link to={`/admin/news/${item._id}/edit`}>
                                                            <Button color="light" size="sm" className="border" title="Edit">
                                                                <FaEdit className="text-secondary" />
                                                            </Button>
                                                        </Link>
                                                        <Button color="light" size="sm" className="text-danger border" onClick={() => handleDelete(item._id)}>
                                                            <FaTrash />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )) : (
                                        /* 🚨 EMPTY STATE 🚨 */
                                        <tr>
                                            <td colSpan="4" className="text-center p-5 text-muted">
                                                <FaNewspaper className="mb-3 display-4 opacity-25" />
                                                <p>No news items found.</p>
                                                {can('news', 'edit') && (
                                                    <Link to="/admin/news/create">
                                                        <Button color="primary" size="sm" outline>Create First Post</Button>
                                                    </Link>
                                                )}
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