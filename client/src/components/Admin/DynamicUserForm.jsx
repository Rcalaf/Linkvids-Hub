// client/src/components/Admin/DynamicUserForm.jsx
import React from 'react';
import { FormGroup, Label, Input, Button, Row, Col } from 'reactstrap';
import { Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FaArrowLeft} from 'react-icons/fa';

import { getGlobalDataKey } from '../../services/staticDataService'; 

const typeMap = {
    text: 'text',
    number: 'number',
    date: 'date',
    url: 'url',
    mixed: 'text',
    image_array: 'hidden' 
};

// 🚨 Fields to ignore in dynamic sections (handled statically below) 🚨
const IGNORED_DYNAMIC_FIELDS = new Set([
    'email', 'password', 'name', 'first_name', 'last_name', 
    'phone', 'city', 'country', 'address', 'zipCode', 'profile_picture' // Added profile_picture
]);

// -------------------------------------------------------------------
// Helper Function: Renders a single dynamic field
// -------------------------------------------------------------------
const renderField = (fieldConfig, attributeDetails, values, setFieldValue, globalStaticLists, isEditing) => {
    if (!attributeDetails) return null;
    
    const fieldName = attributeDetails.slug;
    const globalDataKey = getGlobalDataKey(attributeDetails.defaultOptions);
    const optionsSource = globalDataKey 
        ? (globalStaticLists[globalDataKey] || []) 
        : (attributeDetails.defaultOptions || []);

    if (attributeDetails.fieldType === 'image_array') {
        if (isEditing) return null; 
        return (
            <FormGroup key={fieldName} className="border p-3 bg-light rounded">
                <Label>{fieldConfig.label} (File Array)</Label>
                <p className="text-danger small mb-0">Files must be managed after creation.</p>
            </FormGroup>
        );
    }

    switch (attributeDetails.fieldType) {
        case 'boolean':
            return (
                <FormGroup check key={fieldName}> 
                    <Label check>
                        <Field name={fieldName}>
                            {({ field }) => <Input type="checkbox" id={fieldName} {...field} checked={field.value === true} />}
                        </Field>
                        {fieldConfig.label}
                    </Label>
                </FormGroup>
            );
        case 'select':
            return (
                <FormGroup key={fieldName}>
                    <Label htmlFor={fieldName}>{fieldConfig.label}</Label>
                    <Field name={fieldName}>
                        {({ field, meta }) => (
                            <Input type="select" id={fieldName} {...field} invalid={meta.touched && !!meta.error}>
                                <option value="">-- Select One --</option>
                                {optionsSource.map(opt => (
                                    <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
                                ))}
                            </Input>
                        )}
                    </Field>
                    <ErrorMessage name={fieldName} component="div" className="text-danger" />
                </FormGroup>
            );
        case 'array':
            return (
                <FormGroup key={fieldName}>
                    <Label htmlFor={fieldName}>{fieldConfig.label} (Select Multiple)</Label>
                    <Field name={fieldName}>
                        {({ field, meta, form }) => (
                            <Input type="select" multiple id={fieldName} {...field} invalid={meta.touched && !!meta.error}
                                onChange={(e) => {
                                    const val = Array.from(e.target.options).filter(o => o.selected).map(o => o.value);
                                    form.setFieldValue(fieldName, val);
                                }}>
                                {optionsSource.map(opt => (
                                    <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
                                ))}
                            </Input>
                        )}
                    </Field>
                    <ErrorMessage name={fieldName} component="div" className="text-danger" />
                </FormGroup>
            );
        default:
            return (
                <FormGroup key={fieldName}>
                    <Label htmlFor={fieldName}>{fieldConfig.label}</Label>
                    <Field name={fieldName}>
                        {({ field, meta }) => (
                            <Input type={typeMap[attributeDetails.fieldType] || 'text'} id={fieldName} placeholder={fieldConfig.label} {...field} invalid={meta.touched && !!meta.error} />
                        )}
                    </Field>
                    <ErrorMessage name={fieldName} component="div" className="text-danger" />
                </FormGroup>
            );
    }
};

// -------------------------------------------------------------------
// Utility to generate stable initial values
// -------------------------------------------------------------------
const getInitialValues = (config) => {
    if (!config?.fields) return {};

    const baseValues = {
        email: config.email || '', 
        password: '', 
        first_name: config.first_name || '',
        last_name: config.last_name || '',
        phone: config.phone || '',
        city: config.city || '',
        country: config.country || '',
        address: config.address || '',
        zipCode: config.zipCode || '',
        profile_picture: config.profile_picture || '', // 🚨 Added to initial values
    };

    const dynamicValues = (config.fields || []).reduce((acc, field) => {
        const slug = field.attributeDetails?.slug;
        const type = field.attributeDetails?.fieldType;
        if (slug && type) {
             if (type === 'boolean') acc[slug] = config[slug] === undefined ? false : config[slug];
             else if (['array', 'image_array'].includes(type)) acc[slug] = config[slug] || [];
             else acc[slug] = config[slug] || '';
        }
        return acc;
    }, {});
    
    return { ...baseValues, ...dynamicValues };
};

// -------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------
export default function DynamicUserForm({ userId, userConfig, onSubmit, isSubmitting, globalStaticLists, initialData, isEditing }) {
    
    if (!userConfig || !userConfig.fields || !globalStaticLists) return <p>Loading...</p>;
    // console.log(userId);

    // const initialValues = isEditing ? initialData : getInitialValues(userConfig);
    const initialValues = isEditing 
        ? { ...initialData, password: '' } 
        : getInitialValues(userConfig);

        // console.log(isEditing);

    const validationFields = {
        // --- Static Fields ---
        email: Yup.string().email('Invalid email').required('Required'),
        password: isEditing ? Yup.string().min(6).optional() : Yup.string().min(6).required('Required'),
        first_name: Yup.string().required('First Name required'),
        last_name: Yup.string().required('Last Name required'),
        country: Yup.string().required('Country required'),
        // Add other static fields if necessary (e.g., city, phone)
        
        // --- Dynamic Fields ---
        ...userConfig.fields.reduce((acc, field) => {
             const slug = field.attributeDetails?.slug;
             const fieldType = field.attributeDetails?.fieldType;

             // Skip invalid or ignored fields
             if (!slug || !fieldType || IGNORED_DYNAMIC_FIELDS.has(slug)) return acc;

             let validator;

             // 1. SET BASE VALIDATOR TYPE
             switch (fieldType) {
                 case 'url': 
                 case 'text': 
                 case 'select': 
                     validator = Yup.string(); 
                     break;
                 case 'array': 
                 case 'image_array': 
                     validator = Yup.array().of(Yup.mixed()); 
                     break;
                 case 'number': 
                     validator = Yup.number(); 
                     break;
                 case 'date': 
                     validator = Yup.date(); 
                     break;
                 default: 
                     validator = Yup.mixed();
             }

             // 2. APPLY REQUIRED STATUS
             if (field.required) {
                 if (['array', 'image_array'].includes(fieldType)) {
                     // For arrays, "required" usually means "at least one item selected"
                     validator = validator.min(1, `${field.label} is required.`);
                 } else {
                     validator = validator.required(`${field.label} is required`);
                 }
             } 
             
             // 3. APPLY SPECIFIC TYPE RULES
             switch (fieldType) {
                 case 'url':
                     validator = validator.url('Must be a valid URL');
                     break;
                 case 'number':
                     validator = validator
                         .transform(v => (v === '' ? undefined : v))
                         .nullable(true)
                         .typeError('Must be a number');
                     break;
                 case 'date':
                     validator = validator.typeError('Date must be a valid date.');
                     // If not required, allow null for dates to avoid "invalid date" errors on empty
                     if (!field.required) validator = validator.nullable(true);
                     break;
             }

             acc[slug] = validator;
             return acc;
        }, {})
    };
    const validationSchema = Yup.object().shape(validationFields);

    // Group dynamic fields, excluding static ones
    const groupedFields = userConfig.fields.reduce((acc, field) => {
        if (IGNORED_DYNAMIC_FIELDS.has(field.attributeDetails?.slug)) return acc;
        const section = field.section || 'Other Details';
        if (!acc[section]) acc[section] = [];
        if (field.attributeDetails) acc[section].push(field);
        return acc;
    }, {});

    return (
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={async (values, { resetForm }) => {onSubmit(values, userConfig);resetForm(); }} enableReinitialize={true}>
            {({ setFieldValue, values }) => (
                <Form>
                    {/* 🚨 STATIC SECTION 1: Account & Profile 🚨 */}
                    <div className="mb-4 p-3 border rounded bg-light">
                        <h6 className="text-primary mb-3">Account Information</h6>
                        <Row>
                             <Col md={6}>
                                <FormGroup>
                                    <Label>Email</Label>
                                    <Field name="email">{({ field, meta }) => 
                                        <Input {...field} type="email" invalid={meta.touched && meta.error} disabled={isEditing} />
                                    }</Field>
                                    <ErrorMessage name="email" component="div" className="text-danger" />
                                </FormGroup>
                             </Col>
                             <Col md={6}>
                               
                                <FormGroup>
                                    <Label>Password</Label>
                                    <Field name="password">{({ field, meta }) => (
                                        <Input 
                                            {...field} 
                                            type="password" 
                                            // 🚨 FIX: Add placeholder and disable autocomplete to prevent browser filling 🚨
                                            placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
                                            autoComplete="new-password"
                                            invalid={meta.touched && meta.error} 
                                            value={field.value || ''} // Ensure it doesn't break if undefined
                                        />
                                    )}</Field>
                                    <ErrorMessage name="password" component="div" className="text-danger" />
                                </FormGroup>
                             </Col>
                        </Row>
                    </div>

                    {/* STATIC SECTION 2: Personal & Contact Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="text-primary mb-3">Personal & Contact Details</h6>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>First Name</Label>
                                    <Field name="first_name">{({ field, meta }) => <Input {...field} invalid={meta.touched && meta.error} />}</Field>
                                    <ErrorMessage name="first_name" component="div" className="text-danger" />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Last Name</Label>
                                    <Field name="last_name">{({ field, meta }) => <Input {...field} invalid={meta.touched && meta.error} />}</Field>
                                    <ErrorMessage name="last_name" component="div" className="text-danger" />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Phone</Label>
                                    <Field name="phone">{({ field }) => <Input {...field} type="tel" />}</Field>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Country</Label>
                                    <Field name="country">
                                        {({ field, meta }) => (
                                            <Input type="select" {...field} invalid={meta.touched && meta.error}>
                                                <option value="">-- Select Country --</option>
                                                {globalStaticLists.countries?.map(c => <option key={c} value={c}>{c}</option>)}
                                            </Input>
                                        )}
                                    </Field>
                                    <ErrorMessage name="country" component="div" className="text-danger" />
                                </FormGroup>
                            </Col>
                        </Row>
                         <Row>
                            <Col md={8}>
                                <FormGroup>
                                    <Label>Address</Label>
                                    <Field name="address">{({ field }) => <Input {...field} />}</Field>
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label>City</Label>
                                    <Field name="city">{({ field, meta }) => <Input {...field} invalid={meta.touched && meta.error} />}</Field>
                                     <ErrorMessage name="city" component="div" className="text-danger" />
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label>Zip Code</Label>
                                    <Field name="zipCode">{({ field }) => 
                                        <Input {...field} />
                                    }</Field>
                                </FormGroup>
                            </Col>
                        </Row>
                    </div>

                    {/* Dynamic Sections */}
                    {Object.entries(groupedFields).map(([section, fields]) => (
                        <div key={section} className="mb-4 p-3 border rounded">
                            <h6 className="text-primary mb-3">{section}</h6>
                            <Row>
                                {fields.map(field => (
                                    <Col md={6} key={field.attributeDetails.slug}>
                                        {renderField(field, field.attributeDetails, values, setFieldValue, globalStaticLists, isEditing)}
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ))}

                    <div className="d-flex justify-content-end gap-2 mt-4">
          
                        <Link to={`/admin/collaborators/${userId}`}>
                            <Button color="danger" outline >
                                 Cancel
                            </Button>
                        </Link>
          
                        <Button color="success" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : `Create ${userConfig.name}`)}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
}