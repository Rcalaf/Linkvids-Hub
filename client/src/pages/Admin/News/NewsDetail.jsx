import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Container, Row, Col, Card, CardBody, Button, Badge, Spinner 
} from 'reactstrap';
import { 
    FaArrowLeft, FaEdit, FaTrash, FaExternalLinkAlt, 
    FaCalendarAlt, FaUser, FaCheckCircle, FaCircle, FaClock 
} from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import { getNewsById, deleteNews } from '../../../services/newsService';
import { usePermissions } from '../../../hooks/usePermissions';

export default function NewsDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermissions();

    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNews();
    }, [id]);

    const loadNews = async () => {
        try {
            const data = await getNewsById(id);
            setNews(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load news details");
            navigate('/admin/news');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this news item? This cannot be undone.")) return;
        try {
            await deleteNews(id);
            toast.success("News item deleted");
            navigate('/admin/news');
        } catch (error) {
            toast.error("Failed to delete item");
        }
    };

    if (loading) {
        return (
            <Container fluid className="p-5 text-center">
                <Spinner color="primary" />
                <p className="mt-3 text-muted">Loading article...</p>
            </Container>
        );
    }

    if (!news) return null;

    return (
        <Container fluid>
            {/* Header / Navigation */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center">
                    <Link to="/admin/news">
                        <Button color="secondary" outline size="sm" className="me-3">
                            <FaArrowLeft className="me-2" /> Back
                        </Button>
                    </Link>
                    <Title title="News Details" />
                </div>

                {/* Actions (Only if Edit Perms) */}
                {can('news', 'edit') && (
                    <div className="d-flex gap-2">
                        <Link to={`/admin/news/edit/${news._id}`}>
                            <Button color="primary">
                                <FaEdit className="me-2" /> Edit
                            </Button>
                        </Link>
                        <Button color="danger" outline onClick={handleDelete}>
                            <FaTrash className="me-2" /> Delete
                        </Button>
                    </div>
                )}
            </div>

            <Row>
                {/* LEFT: Main Content */}
                <Col lg={8}>
                    <Card className="shadow-sm border-0 mb-4">
                        <CardBody className="p-5">
                            {/* Title Section */}
                            <h1 className="fw-bold mb-3 text-dark">{news.title}</h1>
                            
                            <div className="mb-4">
                                <Badge color={news.status === 'Published' ? 'success' : 'secondary'} className="px-3 py-2 fs-6">
                                    {news.status === 'Published' ? <FaCheckCircle className="me-2"/> : <FaClock className="me-2"/>}
                                    {news.status}
                                </Badge>
                            </div>

                            {/* Excerpt */}
                            <div className="bg-light p-4 rounded mb-4 border-start border-4 border-primary">
                                <h5 className="text-uppercase text-muted small fw-bold mb-2">Summary</h5>
                                <p className="lead mb-0 text-secondary fst-italic">
                                    "{news.excerpt}"
                                </p>
                            </div>

                            <hr className="my-4 text-muted opacity-25" />

                            {/* Main Body */}
                            <div className="article-content">
                                <h6 className="text-uppercase text-muted small fw-bold mb-3">Full Content</h6>
                                {/* Using whitespace-pre-wrap to preserve paragraphs if it's plain text.
                                    If you implement a Rich Text Editor later, use dangerouslySetInnerHTML here.
                                */}
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '1.05rem', color: '#444' }}>
                                    {news.content}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>

                {/* RIGHT: Sidebar / Metadata */}
                <Col lg={4}>
                    {/* Link Card */}
                    {news.linkUrl && (
                        <Card className="shadow-sm border-0 mb-4 bg-primary text-white">
                            <CardBody className="p-4">
                                <h5 className="fw-bold mb-3"><FaExternalLinkAlt className="me-2"/> External Resource</h5>
                                <p className="opacity-75 mb-3 small">This article links to an external page.</p>
                                <a 
                                    href={news.linkUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-light w-100 fw-bold text-primary"
                                >
                                    Visit Link
                                </a>
                            </CardBody>
                        </Card>
                    )}

                    {/* Meta Data Card */}
                    <Card className="shadow-sm border-0">
                        <CardBody>
                            <h6 className="fw-bold border-bottom pb-2 mb-3">Publishing Details</h6>
                            
                            <div className="mb-3">
                                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Created Date</small>
                                <div className="d-flex align-items-center mt-1">
                                    <FaCalendarAlt className="text-muted me-2" />
                                    <span>{new Date(news.createdAt).toLocaleDateString()}</span>
                                    <span className="text-muted mx-2">at</span>
                                    <span>{new Date(news.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>

                            <div className="mb-3">
                                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Last Updated</small>
                                <div className="d-flex align-items-center mt-1">
                                    <FaClock className="text-muted me-2" />
                                    <span>{new Date(news.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mb-3">
                                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Author</small>
                                <div className="d-flex align-items-center mt-1">
                                    <FaUser className="text-muted me-2" />
                                    <span>{news.createdBy?.name || "Unknown Admin"}</span>
                                </div>
                            </div>

                            <div className="mb-0">
                                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Visibility</small>
                                <div className="mt-1">
                                    {news.status === 'Published' ? (
                                        <span className="text-success small fw-bold"><FaCheckCircle/> Visible to Users</span>
                                    ) : (
                                        <span className="text-secondary small fw-bold"><FaClock/> Hidden (Draft)</span>
                                    )}
                                </div>
                            </div>

                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}