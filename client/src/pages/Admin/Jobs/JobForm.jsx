// client/src/pages/Admin/Jobs/JobForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, FormGroup, Label, InputGroup, InputGroupText, Input as ReactstrapInput } from 'reactstrap';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaSave, FaTrash, FaPlus,FaEuroSign } from 'react-icons/fa';

import Widget from '../../../components/Widget/Widget';
import Title from '../../../components/Title';
import { createJob, getJobById, updateJob } from '../../../services/jobService';
import { getAllUserTypes } from '../../../services/userTypeService';
import { getStaticLists } from '../../../services/staticDataService';

// Hardcoded for now, or fetch from staticDataService


export default function JobForm() {
    const { jobId } = useParams(); // If present, we are editing
    const navigate = useNavigate();
    const isEditing = !!jobId;

    const [userTypes, setUserTypes] = useState([]);
    const [initialValues, setInitialValues] = useState(null);
    const [languages, setLanguages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Load User Types for the dropdown
                const [types, staticLists] = await Promise.all([
                    getAllUserTypes(),
                    getStaticLists()
                ]);

                console.log(staticLists)

                setUserTypes(types);
                setLanguages(staticLists.languages || []);

                if (isEditing) {
                    // 2. Load existing job data
                    const job = await getJobById(jobId);
                    // Format dates for input type="date" (YYYY-MM-DD)
                    const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
                    
                    setInitialValues({
                        ...job,
                        projectStartDate: formatDate(job.projectStartDate),
                        projectEndDate: formatDate(job.projectEndDate),
                        shootingDates: job.shootingDates.map(formatDate) // Ensure array dates are formatted
                    });
                } else {
                    // Default Values for Create
                    setInitialValues({
                        projectName: '',
                        projectDescription: '',
                        deliverables: '',
                        projectStartDate: '',
                        projectEndDate: '',
                        shootingDates: [''], // Start with one empty slot
                        projectLanguage: staticLists.GLOBAL_LANGUAGES?.[0] || 'Spanish',
                        targetRole: types[0]?.slug || '',
                        rate: '',
                        imageRightsDuration: '',
                        status: 'Draft'
                    });
                }
            } catch (error) {
                toast.error("Error loading form data");
                navigate('/admin/jobs');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [jobId, isEditing, navigate]);

    const validationSchema = Yup.object({
        projectName: Yup.string().required('Project name is required'),
        targetRole: Yup.string().required('Target role is required'),
        projectLanguage: Yup.string().required('Language is required'),
        rate: Yup.number().required('Rate is required').min(1, 'Rate must be positive'),
        imageRightsDuration: Yup.string().required('Rights duration is required'),
        projectDescription: Yup.string().required('Description is required'),
        deliverables: Yup.string().required('Deliverables are required'),
        projectStartDate: Yup.date().required('Start date is required'),
        projectEndDate: Yup.date()
            .required('End date is required')
            .min(
                Yup.ref('projectStartDate'),
                "End date cannot be before start date"
            ),
    });

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            // Clean up empty shooting dates
            const payload = {
                ...values,
                shootingDates: values.shootingDates.filter(d => d !== '')
            };

            if (isEditing) {
                await updateJob(jobId, payload);
                toast.success("Job updated successfully");
            } else {
                await createJob(payload);
                toast.success("Job created successfully");
            }
            navigate('/admin/jobs');
        } catch (error) {
            toast.error("Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) return <p>Loading...</p>;

    return (
        <Container fluid>

            <Title title={isEditing ? "Edit Job" : "Create New Job"} />
            <div className="mb-4">
                <Button tag={Link} to="/admin/jobs" color="secondary">
                    ← Back
                </Button>
            </div>

            {/* <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                    <Link to="/admin/jobs">
                        <Button color="secondary" outline size="sm"><FaArrowLeft /> Back</Button>
                    </Link>
                    <Title title={isEditing ? "Edit Job" : "Create New Job"} />
                </div>
            </div> */}

            <Widget title="Job Details">
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ values, isSubmitting, errors, touched }) => (
                        <Form>
                            <Row>
                                {/* Core Info */}
                                <Col md={8}>
                                    <FormGroup>
                                        <Label>Project Name</Label>
                                        <Field name="projectName" className={`form-control ${errors.projectName && touched.projectName ? 'is-invalid' : ''}`} placeholder="e.g. Summer Campaign 2025" />
                                        <ErrorMessage name="projectName" component="div" className="invalid-feedback" />
                                    </FormGroup>
                                    
                                    <Row>
                                        <Col md={6}>
                                            <FormGroup>
                                                <Label>Target Role</Label>
                                                <Field as="select" name="targetRole" className={`form-control form-select ${errors.targetRole && touched.targetRole ? 'is-invalid' : ''}`}>
                                                    <option value="">Select Role...</option>
                                                    {userTypes.map(t => (
                                                        <option key={t.slug} value={t.slug}>{t.name}</option>
                                                    ))}
                                                </Field>
                                                <ErrorMessage name="targetRole" component="div" className="invalid-feedback" />
                                            </FormGroup>
                                        </Col>
                                        <Col md={6}>
                                            <FormGroup>
                                                <Label>Project Language</Label>
                                                <Field as="select" name="projectLanguage" className={`form-control form-select ${errors.projectLanguage && touched.projectLanguage ? 'is-invalid' : ''}`}>
                                                    <option value="">Select Language...</option>
                                                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                                </Field>
                                                <ErrorMessage name="projectLanguage" component="div" className="invalid-feedback" />
                                            </FormGroup>
                                        </Col>
                                    </Row>

                                    <FormGroup>
                                        <Label>Description</Label>
                                        <Field as="textarea" name="projectDescription" className={`form-control ${errors.projectDescription && touched.projectDescription ? 'is-invalid' : ''}`} rows="5" />
                                        <ErrorMessage name="projectDescription" component="div" className="invalid-feedback" /> 
                                    </FormGroup>
                                    
                                    <FormGroup>
                                        <Label>Deliverables</Label>
                                        <Field as="textarea" name="deliverables" className={`form-control ${errors.deliverables && touched.deliverables ? 'is-invalid' : ''}`} rows="3" placeholder="List required files..." />
                                        <ErrorMessage name="deliverables" component="div" className="invalid-feedback" />                        
                                    </FormGroup>
                                </Col>

                                {/* Logistics Sidebar */}
                                <Col md={4}>
                                    <div className="p-3 bg-light rounded border mb-3">
                                        <h6 className="text-primary">Financials & Status</h6>
                                        <FormGroup>
                                            <InputGroup className={errors.rate && touched.rate ? 'is-invalid' : ''}>
                                                <InputGroupText><FaEuroSign /></InputGroupText>
                                                <Field type="number" name="rate" className={`form-control ${errors.rate && touched.rate ? 'is-invalid' : ''}`} />
                                            </InputGroup>
                                            <ErrorMessage name="rate" component="div" className="text-danger small mt-1" />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Rights Duration</Label>
                                            <Field name="imageRightsDuration" className={`form-control ${errors.imageRightsDuration && touched.imageRightsDuration ? 'is-invalid' : ''}`} placeholder="e.g. 1 Year, Perpetuity" />
                                            <ErrorMessage name="imageRightsDuration" component="div" className="invalid-feedback" />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Status</Label>
                                            <Field as="select" name="status" className="form-control form-select">
                                                <option value="Draft">Draft</option>
                                                <option value="Open">Open</option>
                                                <option value="Assigned">Assigned</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </Field>
                                        </FormGroup>
                                    </div>

                                    <div className="p-3 bg-light rounded border">
                                        <h6 className="text-primary">Dates</h6>
                                        <Row>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label>Start</Label>
                                                    <Field type="date" name="projectStartDate" className={`form-control ${errors.projectStartDate && touched.projectStartDate ? 'is-invalid' : ''}`} />
                                                    <ErrorMessage name="projectStartDate" component="div" className="invalid-feedback" />
                                                </FormGroup>
                                            </Col>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label>End</Label>
                                                    <Field type="date" name="projectEndDate" className={`form-control ${errors.projectEndDate && touched.projectEndDate ? 'is-invalid' : ''}`} />
                                                    <ErrorMessage name="projectEndDate" component="div" className="invalid-feedback" />
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                        
                                        <Label>Potential Shooting Dates</Label>
                                        <FieldArray name="shootingDates">
                                            {({ push, remove }) => (
                                                <div>
                                                    {values.shootingDates.map((date, index) => (
                                                        <div key={index} className="d-flex mb-2 gap-2">
                                                            <Field type="date" name={`shootingDates.${index}`} className="form-control form-control-sm" />
                                                            <Button color="danger" outline size="sm" onClick={() => remove(index)}><FaTrash /></Button>
                                                        </div>
                                                    ))}
                                                    <Button color="link" size="sm" onClick={() => push('')}><FaPlus /> Add Date</Button>
                                                </div>
                                            )}
                                        </FieldArray>
                                    </div>
                                </Col>
                            </Row>

                            {/* <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                                <Button type="submit" color="success" size="lg" disabled={isSubmitting}>
                                    <FaSave className="me-2" /> {isEditing ? 'Update Job' : 'Create Job'}
                                </Button>
                            </div> */}
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <Link to={`/admin/jobs`}>
                                    <Button color="danger" outline >
                                            Cancel
                                    </Button>
                                </Link>
                    
                                <Button color="success" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : `Create Job`)}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Widget>
        </Container>
    );
}