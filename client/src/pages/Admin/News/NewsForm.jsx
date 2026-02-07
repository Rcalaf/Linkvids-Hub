// client/src/pages/Admin/News/NewsForm.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Container, Row, Col, Card, CardBody, 
    Form, FormGroup, Label, Input, Button, FormFeedback 
} from 'reactstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { 
    FaSave, FaArrowLeft, FaNewspaper, FaLink, FaInfoCircle, 
    FaCalendarAlt, FaClock, FaUser, FaCheckCircle 
} from 'react-icons/fa';
import { toast } from 'react-toastify';

import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

import Title from '../../../components/Title';
import { createNews, updateNews, getNewsById } from '../../../services/newsService';

export default function NewsForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    
    const [loadingData, setLoadingData] = useState(isEditMode);
    const [metaData, setMetaData] = useState(null); 

    const [initialValues, setInitialValues] = useState({
        title: '',
        excerpt: '',
        content: '',
        linkUrl: '',
        status: 'Draft'
    });

    // 1. MAIN CONTENT OPTIONS (Full Featured)
    const contentOptions = useMemo(() => {
        return {
            spellChecker: false,
            maxHeight: "400px",
            placeholder: "Write the full article...",
            status: false,
            toolbar: [
                "bold", "italic", "heading", "|", 
                "quote", "unordered-list", "ordered-list", "|",
                "link", "image", "|", 
                "preview", "side-by-side", "fullscreen"
            ],
        };
    }, []);

    // 🚨 2. EXCERPT OPTIONS (Simplified & Smaller)
    const excerptOptions = useMemo(() => {
        return {
            spellChecker: false,
            minHeight: "100px", // Smaller height
            maxHeight: "150px", // Limit expansion
            placeholder: "Short summary...",
            status: false,
            // Removed images/headings/fullscreen to keep it simple for a summary
            toolbar: ["bold", "italic", "|", "link", "|", "preview"], 
        };
    }, []);

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

    useEffect(() => {
        if (isEditMode) {
            const loadData = async () => {
                try {
                    const data = await getNewsById(id);
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
                toast.success("News updated");
            } else {
                await createNews(values);
                toast.success("News created");
            }
            navigate('/admin/news');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData) return <div className="p-5 text-center">Loading form...</div>;

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
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                    <Form onSubmit={handleSubmit}>
                        <Row>
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

                                        {/* 🚨 3. REPLACED EXCERPT INPUT WITH SIMPLEMDE */}
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="excerpt" className="fw-bold">Short Summary <span className="text-danger">*</span></Label>
                                            
                                            <SimpleMDE
                                                id="excerpt"
                                                value={values.excerpt}
                                                onChange={(value) => setFieldValue("excerpt", value)}
                                                options={excerptOptions}
                                                className={touched.excerpt && errors.excerpt ? "border border-danger rounded" : ""}
                                            />
                                            
                                            {/* Character Count & Error Message */}
                                            <div className="d-flex justify-content-between mt-1">
                                                <div className="text-danger small">{touched.excerpt && errors.excerpt}</div>
                                                <small className={`text-end ${values.excerpt.length > 200 ? 'text-danger fw-bold' : 'text-muted'}`}>
                                                    {values.excerpt.length}/200 characters
                                                </small>
                                            </div>
                                        </FormGroup>

                                        {/* 4. MAIN CONTENT EDITOR */}
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="content" className="fw-bold">Full Content <span className="text-danger">*</span></Label>
                                            
                                            <SimpleMDE
                                                id="content"
                                                value={values.content}
                                                onChange={(value) => setFieldValue("content", value)}
                                                options={contentOptions}
                                                className={touched.content && errors.content ? "border border-danger rounded" : ""}
                                            />
                                            
                                            {touched.content && errors.content && (
                                                <div className="text-danger small mt-1">{errors.content}</div>
                                            )}
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

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
                                            <Button type="submit" color="primary" size="sm" disabled={isSubmitting}>
                                                {isSubmitting ? 'Saving...' : (
                                                    <><FaSave className="me-2" /> {isEditMode ? "Save Changes" : "Publish News"}</>
                                                )}
                                            </Button>
                                            <Link to="/admin/news" className="btn btn-outline-secondary">Cancel</Link>
                                        </div>
                                    </CardBody>
                                </Card>

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
                            </Col>
                        </Row>
                    </Form>
                )}
            </Formik>
        </Container>
    );
}