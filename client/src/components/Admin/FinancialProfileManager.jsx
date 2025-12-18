import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button, FormGroup, Label, Row, Col, Alert } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../Widget/Widget';
import { getFinancialProfile, updateFinancialProfile, deleteFinancialProfile } from '../../services/financialService';
import { FaTrashAlt, FaSave } from 'react-icons/fa';

const PROFILE_TYPES = [
    { value: 'Individual', label: 'Individual (Particular)' },
    { value: 'SelfEmployed', label: 'Self Employed (Autónomo)' },
    { value: 'Company', label: 'Company (Empresa)' }
];

const DEFAULT_VALUES = {
    profileType: 'Individual',
    billingContactName: '',
    billingEmail: '',
    billingPhone: '',
    fiscalAddress: '',
    companyName: '',
    taxId: '',
    vatNumber: '',
    nationalId: '',
    socialSecurityNumber: '',
    iban: '',
    swiftBic: ''
};

export default function FinancialProfileManager({ userId, onUpdate }) {
    const [initialValues, setInitialValues] = useState(null);
    const [hasExistingData, setHasExistingData] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getFinancialProfile(userId);
                
                // Check if we received a valid profile object
                // We check for a key field like 'billingContactName' or 'profileType' to confirm it's not empty
                if (data && Object.keys(data).length > 0 && data.profileType) {
                    setInitialValues({ ...DEFAULT_VALUES, ...data }); 
                    setHasExistingData(true);
                } else {
                    setInitialValues(DEFAULT_VALUES);
                    setHasExistingData(false);
                }
            } catch (error) {
                console.error("Financial load error", error);
                setInitialValues(DEFAULT_VALUES);
                setHasExistingData(false);
            } finally {
                setLoading(false);
            }
        };
        if (userId) loadData();
    }, [userId]);

    const validationSchema = Yup.object().shape({
        profileType: Yup.string().required(),
        billingContactName: Yup.string().required('Contact Name is required'),
        billingEmail: Yup.string().email().required('Billing Email is required'),
        fiscalAddress: Yup.string().required('Fiscal Address is required'),
        
        companyName: Yup.string().when('profileType', {
            is: 'Company',
            then: () => Yup.string().required('Company Name is required'),
            otherwise: () => Yup.string().nullable()
        }),
        taxId: Yup.string().when('profileType', {
            is: (val) => val === 'Company' || val === 'SelfEmployed',
            then: () => Yup.string().required('Tax ID (NIF/CIF) is required'),
            otherwise: () => Yup.string().nullable()
        }),
        nationalId: Yup.string().when('profileType', {
            is: 'Individual',
            then: () => Yup.string().required('DNI/NIE is required'),
            otherwise: () => Yup.string().nullable()
        }),
        socialSecurityNumber: Yup.string().when('profileType', {
            is: 'Individual',
            then: () => Yup.string().required('SSN is required'),
            otherwise: () => Yup.string().nullable()
        }),
    });

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            const response = await updateFinancialProfile(userId, values);
            toast.success("Financial profile updated successfully!");
            setHasExistingData(true);
            
            // Notify parent
            if (onUpdate && response.data) {
                onUpdate(response.data);
            }
        } catch (error) {
            const msg = error.response?.data?.message || "Failed to update financial profile.";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete your financial data? This cannot be undone.")) return;

        try {
            await deleteFinancialProfile(userId);
            toast.success("Financial data deleted.");
            setInitialValues(DEFAULT_VALUES);
            setHasExistingData(false);

            // Notify parent that data is gone
            if (onUpdate) {
                onUpdate(null);
            }
        } catch (error) {
            toast.error(error.message || "Delete failed.");
        }
    };

    if (loading) return <p>Loading financial data...</p>;

    return (
        <Widget title="Financial & Billing Information">
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, isSubmitting }) => (
                    <Form>
                        {/* Type Selector */}
                        <FormGroup>
                            <Label><strong>Billing Entity Type</strong></Label>
                            <Field as="select" name="profileType" className="form-control form-select">
                                {PROFILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </Field>
                        </FormGroup>

                        <hr />

                        {/* Common Fields */}
                        <h6 className="text-primary">Contact Details</h6>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Billing Contact Name</Label>
                                    <Field name="billingContactName" className={`form-control ${errors.billingContactName && touched.billingContactName ? 'is-invalid' : ''}`} />
                                    <ErrorMessage name="billingContactName" component="div" className="invalid-feedback" />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Billing Email</Label>
                                    <Field name="billingEmail" type="email" className={`form-control ${errors.billingEmail && touched.billingEmail ? 'is-invalid' : ''}`} />
                                    <ErrorMessage name="billingEmail" component="div" className="invalid-feedback" />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Fiscal Address</Label>
                                    <Field name="fiscalAddress" className={`form-control ${errors.fiscalAddress && touched.fiscalAddress ? 'is-invalid' : ''}`} />
                                    <ErrorMessage name="fiscalAddress" component="div" className="invalid-feedback" />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Phone (Optional)</Label>
                                    <Field name="billingPhone" className="form-control" />
                                </FormGroup>
                            </Col>
                        </Row>

                        <hr />

                        {/* Conditional Fields */}
                        {values.profileType === 'Company' && (
                            <div className="p-3 bg-light rounded mb-3">
                                <h6 className="text-info">Company Details</h6>
                                <Row>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Company Name (Razón Social)</Label>
                                            <Field name="companyName" className={`form-control ${errors.companyName && touched.companyName ? 'is-invalid' : ''}`} />
                                            <ErrorMessage name="companyName" component="div" className="invalid-feedback" />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Tax ID (CIF)</Label>
                                            <Field name="taxId" className={`form-control ${errors.taxId && touched.taxId ? 'is-invalid' : ''}`} />
                                            <ErrorMessage name="taxId" component="div" className="invalid-feedback" />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Intra-community VAT (Optional)</Label>
                                            <Field name="vatNumber" className="form-control" />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        {values.profileType === 'SelfEmployed' && (
                            <div className="p-3 bg-light rounded mb-3">
                                <h6 className="text-info">Freelancer Details</h6>
                                <Row>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Tax ID (NIF)</Label>
                                            <Field name="taxId" className={`form-control ${errors.taxId && touched.taxId ? 'is-invalid' : ''}`} />
                                            <ErrorMessage name="taxId" component="div" className="invalid-feedback" />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Intra-community VAT (Optional)</Label>
                                            <Field name="vatNumber" className="form-control" />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        {values.profileType === 'Individual' && (
                            <div className="p-3 bg-light rounded mb-3">
                                <h6 className="text-info">Individual Details</h6>
                                <Row>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>National ID (DNI/NIE)</Label>
                                            <Field name="nationalId" className={`form-control ${errors.nationalId && touched.nationalId ? 'is-invalid' : ''}`} />
                                            <ErrorMessage name="nationalId" component="div" className="invalid-feedback" />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Social Security Number</Label>
                                            <Field name="socialSecurityNumber" className={`form-control ${errors.socialSecurityNumber && touched.socialSecurityNumber ? 'is-invalid' : ''}`} />
                                            <ErrorMessage name="socialSecurityNumber" component="div" className="invalid-feedback" />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        <hr />
                        <h6 className="text-primary">Bank Details</h6>
                        <Row>
                             <Col md={8}>
                                <FormGroup>
                                    <Label>IBAN</Label>
                                    <Field name="iban" className="form-control" placeholder="ESXX XXXX XXXX XXXX XXXX XXXX" />
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label>SWIFT / BIC</Label>
                                    <Field name="swiftBic" className="form-control" />
                                </FormGroup>
                            </Col>
                        </Row>

                        <div className="d-flex justify-content-between mt-4">
                             {/* 🚨 DELETE BUTTON (Conditionally Rendered) 🚨 */}
                             {hasExistingData ? (
                                <Button color="danger" outline onClick={handleDelete} type="button">
                                    <FaTrashAlt className="me-2" /> Delete Data
                                </Button>
                             ) : <div></div>}
                             
                             <Button type="submit" color="success" disabled={isSubmitting}>
                                <FaSave className="me-2" /> {hasExistingData ? 'Update Financial Profile' : 'Save Financial Profile'}
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Widget>
    );
}