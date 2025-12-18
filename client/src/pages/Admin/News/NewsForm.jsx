// client/src/pages/Admin/News/NewsForm.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Container, Row, Col, Card, CardBody, 
    Form, FormGroup, Label, Input, Button, FormFeedback 
} from 'reactstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
// 🚨 Added new icons for the metadata card
import { 
    FaSave, FaArrowLeft, FaNewspaper, FaLink, FaInfoCircle, 
    FaCalendarAlt, FaClock, FaUser, FaCheckCircle 
} from 'react-icons/fa';
import { toast } from 'react-toastify';

import Title from '../../../components/Title';
import { createNews, updateNews, getNewsById } from '../../../services/newsService';

export default function NewsForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    
    const [loadingData, setLoadingData] = useState(isEditMode);
    
    // 1. New State to hold read-only metadata (dates, author)
    const [metaData, setMetaData] = useState(null); 

    const [initialValues, setInitialValues] = useState({
        title: '',
        excerpt: '',
        content: '',
        linkUrl: '',
        status: 'Draft'
    });

    // Validation Schema
    const validationSchema = Yup.object().shape({
        title: Yup.string()
            .required('Title is required')
            .min(5, 'Title must be at least 5 characters')
            .max(100, 'Title cannot exceed 100 characters'),
        excerpt: Yup.string()
            .required('Excerpt is required')
            .max(200, 'Excerpt must be 200 characters or less'),
        content: Yup.string()
            .required('Main content is required'),
        linkUrl: Yup.string()
            .url('Please enter a valid URL (https://...)')
            .nullable(),
        status: Yup.string()
            .oneOf(['Draft', 'Published'])
            .required('Status is required')
    });

    // Load Data
    useEffect(() => {
        if (isEditMode) {
            const loadData = async () => {
                try {
                    const data = await getNewsById(id);
                    
                    // 2. Save full object to metaData state for the sidebar
                    setMetaData(data);

                    setInitialValues({
                        title: data.title || '',
                        excerpt: data.excerpt || '',
                        content: data.content || '',
                        linkUrl: data.linkUrl || '',
                        status: data.status || 'Draft'
                    });
                } catch (error) {
                    console.error(error);
                    toast.error("Failed to load news details");
                    navigate('/admin/news');
                } finally {
                    setLoadingData(false);
                }
            };
            loadData();
        }
    }, [id, isEditMode, navigate]);

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            if (isEditMode) {
                await updateNews(id, values);
                toast.success("News item updated successfully");
            } else {
                await createNews(values);
                toast.success("News item created successfully");
            }
            navigate('/admin/news');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save news item");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData) return <div className="p-5 text-center">Loading form...</div>;

    // Helper variable for the new card
    const news = metaData; 

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center">
                    <Link to="/admin/news" className="btn btn-outline-secondary btn-sm me-3">
                        <FaArrowLeft />
                    </Link>
                    <Title title={isEditMode ? "Edit News Post" : "Create News Post"} />
                </div>
            </div>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            {/* LEFT COLUMN: Content */}
                            <Col lg={8}>
                                <Card className="shadow-sm border-0 mb-4">
                                    <CardBody className="p-4">
                                        <h6 className="fw-bold mb-3 text-muted">Article Details</h6>
                                        
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="title" className="fw-bold">Title <span className="text-danger">*</span></Label>
                                            <Input
                                                id="title"
                                                name="title"
                                                value={values.title}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                invalid={touched.title && !!errors.title}
                                            />
                                            <FormFeedback>{errors.title}</FormFeedback>
                                        </FormGroup>

                                        <FormGroup className="mb-3">
                                            <Label htmlFor="excerpt" className="fw-bold">Short Summary <span className="text-danger">*</span></Label>
                                            <Input
                                                type="textarea"
                                                id="excerpt"
                                                name="excerpt"
                                                rows="3"
                                                maxLength="200"
                                                value={values.excerpt}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                invalid={touched.excerpt && !!errors.excerpt}
                                            />
                                            <div className="d-flex justify-content-between mt-1">
                                                <FormFeedback className="d-block">{errors.excerpt}</FormFeedback>
                                                <small className={`text-end ${values.excerpt.length > 180 ? 'text-danger' : 'text-muted'}`}>
                                                    {values.excerpt.length}/200
                                                </small>
                                            </div>
                                        </FormGroup>

                                        <FormGroup className="mb-3">
                                            <Label htmlFor="content" className="fw-bold">Full Content <span className="text-danger">*</span></Label>
                                            <Input
                                                type="textarea"
                                                id="content"
                                                name="content"
                                                rows="12"
                                                value={values.content}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                invalid={touched.content && !!errors.content}
                                            />
                                            <FormFeedback>{errors.content}</FormFeedback>
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* RIGHT COLUMN: Settings & Metadata */}
                            <Col lg={4}>
                                <Card className="shadow-sm border-0 mb-4">
                                    <CardBody className="p-4 bg-light">
                                        <h6 className="fw-bold mb-3 text-muted">Publishing Settings</h6>

                                        <FormGroup className="mb-4">
                                            <Label htmlFor="status" className="fw-bold">Visibility</Label>
                                            <Input
                                                type="select"
                                                name="status"
                                                value={values.status}
                                                onChange={handleChange}
                                                className={values.status === 'Published' ? 'border-success text-success fw-bold' : ''}
                                            >
                                                <option value="Draft">Draft (Hidden)</option>
                                                <option value="Published">Published (Visible)</option>
                                            </Input>
                                            <div className="small text-muted mt-2">
                                                {values.status === 'Draft' 
                                                    ? <><FaInfoCircle className="me-1"/> Only admins can see this.</> 
                                                    : <><FaNewspaper className="me-1"/> Visible to all creators.</>
                                                }
                                            </div>
                                        </FormGroup>

                                        <hr className="my-4"/>

                                        <FormGroup className="mb-3">
                                            <Label htmlFor="linkUrl" className="fw-bold">External Link (Optional)</Label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-white"><FaLink /></span>
                                                <Input
                                                    id="linkUrl"
                                                    name="linkUrl"
                                                    placeholder="https://..."
                                                    value={values.linkUrl}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    invalid={touched.linkUrl && !!errors.linkUrl}
                                                />
                                                <FormFeedback>{errors.linkUrl}</FormFeedback>
                                            </div>
                                        </FormGroup>
                                        
                                        <div className="d-grid gap-2 mt-5">
                                            <Button type="submit" color="primary" size="lg" disabled={isSubmitting}>
                                                {isSubmitting ? 'Saving...' : (
                                                    <><FaSave className="me-2" /> {isEditMode ? "Save Changes" : "Publish News"}</>
                                                )}
                                            </Button>
                                            <Link to="/admin/news" className="btn btn-outline-secondary">Cancel</Link>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* 🚨 NEW METADATA CARD (ONLY IN EDIT MODE) 🚨 */}
                                {isEditMode && news && (
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
                                )}
                                {/* 🚨 END NEW CARD 🚨 */}
                            </Col>
                        </Row>
                    </Form>
                )}
            </Formik>
        </Container>
    );
}