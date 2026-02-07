import React from 'react';
import { FormGroup, Label, Input, Button, Row, Col, Alert } from 'reactstrap';
import { Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select'; // 🚨 IMPORT REACT-SELECT

import { getGlobalDataKey } from '../../services/staticDataService'; 

const typeMap = {
    text: 'text',
    number: 'number',
    date: 'date',
    url: 'url',
    mixed: 'text',
    image_array: 'hidden' 
};

const IGNORED_DYNAMIC_FIELDS = new Set([
    'email', 'password', 'name', 'first_name', 'last_name', 
    'phone', 'city', 'country', 'address', 'zipCode', 'profile_picture'
]);

// -------------------------------------------------------------------
// 1. Helper: Render Field (Now with React-Select & Boolean Fixes)
// -------------------------------------------------------------------
const renderField = (fieldConfig, attributeDetails, values, setFieldValue, setFieldTouched, globalStaticLists, isEditing) => {
    if (!attributeDetails) return null;
    
    const fieldName = attributeDetails.slug;
    const globalDataKey = getGlobalDataKey(attributeDetails.defaultOptions);
    
    // Get options and map them for React-Select { value, label }
    const rawOptions = globalDataKey 
        ? (globalStaticLists[globalDataKey] || []) 
        : (attributeDetails.defaultOptions || []);

    const selectOptions = rawOptions.map(opt => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lbl = typeof opt === 'object' ? opt.label : opt;
        return { value: val, label: lbl };
    });

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
            // 🚨 FIX: Explicitly check against true/false for checked prop
            return (
                <FormGroup check key={fieldName} className="mt-4"> 
                    <Label check>
                        <Input 
                            type="checkbox" 
                            id={fieldName}
                            name={fieldName}
                            checked={values[fieldName] === true}
                            onChange={(e) => setFieldValue(fieldName, e.target.checked)}
                        />
                        {' '}{fieldConfig.label}
                    </Label>
                </FormGroup>
            );

        case 'select':
            // 🚨 UPGRADE: React-Select for Single Choice
            return (
                <FormGroup key={fieldName}>
                    <Label htmlFor={fieldName}>{fieldConfig.label}</Label>
                    <Select
                        id={fieldName}
                        options={selectOptions}
                        // Find the option object that matches the current value string
                        value={selectOptions.find(opt => opt.value === values[fieldName]) || null}
                        onChange={(option) => setFieldValue(fieldName, option ? option.value : '')}
                        onBlur={() => setFieldTouched(fieldName, true)}
                        placeholder={`Select ${fieldConfig.label}...`}
                        isClearable
                    />
                    <ErrorMessage name={fieldName} component="div" className="text-danger small mt-1" />
                </FormGroup>
            );

        case 'array':
            // 🚨 UPGRADE: React-Select for Multiple Choice
            return (
                <FormGroup key={fieldName}>
                    <Label htmlFor={fieldName}>{fieldConfig.label} (Select Multiple)</Label>
                    <Select
                        id={fieldName}
                        isMulti
                        options={selectOptions}
                        // Map array of strings back to array of option objects
                        value={selectOptions.filter(opt => (values[fieldName] || []).includes(opt.value))}
                        onChange={(options) => {
                            const values = options ? options.map(o => o.value) : [];
                            setFieldValue(fieldName, values);
                        }}
                        onBlur={() => setFieldTouched(fieldName, true)}
                        placeholder={`Select ${fieldConfig.label}...`}
                    />
                    <ErrorMessage name={fieldName} component="div" className="text-danger small mt-1" />
                </FormGroup>
            );

        default:
            return (
                <FormGroup key={fieldName}>
                    <Label htmlFor={fieldName}>{fieldConfig.label}</Label>
                    <Field name={fieldName}>
                        {({ field, meta }) => (
                            <Input 
                                type={typeMap[attributeDetails.fieldType] || 'text'} 
                                id={fieldName} 
                                placeholder={fieldConfig.label} 
                                {...field} 
                                invalid={meta.touched && !!meta.error} 
                            />
                        )}
                    </Field>
                    <ErrorMessage name={fieldName} component="div" className="text-danger small" />
                </FormGroup>
            );
    }
};

// -------------------------------------------------------------------
// 2. Helper: Initial Values (Robust Boolean handling)
// -------------------------------------------------------------------
const getInitialValues = (config, initialData) => {
    if (!config?.fields) return {};

    // Base fields (Static)
    const baseValues = {
        email: initialData?.email || '', 
        password: '', 
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        phone: initialData?.phone || '',
        city: initialData?.city || '',
        country: initialData?.country || '',
        address: initialData?.address || '',
        zipCode: initialData?.zipCode || '',
    };

    // Dynamic fields
    const dynamicValues = (config.fields || []).reduce((acc, field) => {
        const slug = field.attributeDetails?.slug;
        const type = field.attributeDetails?.fieldType;
        
        if (slug && type) {
             // Check if we have existing data for this slug (from groupSpecificAttributes or root)
             const existingValue = initialData && initialData[slug];

             if (type === 'boolean') {
                 // Ensure strictly boolean
                 acc[slug] = existingValue === true || existingValue === 'true';
             }
             else if (['array', 'image_array'].includes(type)) {
                 acc[slug] = Array.isArray(existingValue) ? existingValue : [];
             }
             else {
                 acc[slug] = existingValue || '';
             }
        }
        return acc;
    }, {});
    
    return { ...baseValues, ...dynamicValues };
};


export default function DynamicUserForm({ userConfig, onSubmit, isSubmitting, globalStaticLists, initialData, isEditing }) {
    
    if (!userConfig || !userConfig.fields || !globalStaticLists) return <p>Loading form configuration...</p>;

    const initialValues = getInitialValues(userConfig, initialData);

    // Prepare Validation
    const validationFields = {
        email: Yup.string().email('Invalid email').required('Required'),
        
        // Password logic: required on Create, optional on Edit
        password: isEditing 
            ? Yup.string()
                .transform(x => x === '' ? undefined : x)
                .min(6, 'Password must be at least 6 characters')
                .nullable()
            : Yup.string().min(6).required('Required'),

        first_name: Yup.string().required('First Name required'),
        last_name: Yup.string().required('Last Name required'),
        country: Yup.string().required('Country required'),
        
        // Dynamic Validators
        ...userConfig.fields.reduce((acc, field) => {
             const slug = field.attributeDetails?.slug;
             const fieldType = field.attributeDetails?.fieldType;

             if (!slug || !fieldType || IGNORED_DYNAMIC_FIELDS.has(slug)) return acc;

             let validator;

             switch (fieldType) {
                 case 'url': case 'text': case 'select': 
                     validator = Yup.string(); break;
                 case 'array': case 'image_array': 
                     validator = Yup.array(); break;
                 case 'number': 
                     validator = Yup.number(); break;
                 case 'date': 
                     validator = Yup.date(); break;
                 case 'boolean':
                     validator = Yup.boolean(); break;
                 default: 
                     validator = Yup.mixed();
             }

             if (field.required) {
                 if (['array', 'image_array'].includes(fieldType)) {
                     validator = validator.min(1, `${field.label} is required.`);
                 } else if (fieldType !== 'boolean') {
                     // Booleans can't really be "required" in the traditional sense (false is a valid value)
                     validator = validator.required(`${field.label} is required`);
                 }
             } 
             
             // Specific format checks
             if (fieldType === 'url') validator = validator.url('Must be a valid URL');
             if (fieldType === 'number') validator = validator.transform(v => (v === '' ? undefined : v)).nullable(true);

             acc[slug] = validator;
             return acc;
        }, {})
    };

    const validationSchema = Yup.object().shape(validationFields);

    const groupedFields = userConfig.fields.reduce((acc, field) => {
        if (IGNORED_DYNAMIC_FIELDS.has(field.attributeDetails?.slug)) return acc;
        const section = field.section || 'Other Details';
        if (!acc[section]) acc[section] = [];
        if (field.attributeDetails) acc[section].push(field);
        return acc;
    }, {});

    return (
        <Formik 
            initialValues={initialValues} 
            validationSchema={validationSchema} 
            onSubmit={async (values, { resetForm }) => {
                const submissionData = { ...values };

                // Clean up password
                if (isEditing && !submissionData.password) {
                    delete submissionData.password;
                }

                await onSubmit(submissionData, userConfig);
                
                if (!isEditing) resetForm();
            }} 
            enableReinitialize={true}
        >
            {({ setFieldValue, setFieldTouched, values, errors, touched }) => (
                <Form>
                    {/* SECTION 1: Account */}
                    <div className="mb-4 p-3 border rounded bg-light">
                        <h6 className="text-primary mb-3">Account Information</h6>
                        <Row>
                             <Col md={6}>
                                <FormGroup>
                                    <Label>Email</Label>
                                    <Field name="email">{({ field, meta }) => 
                                        <Input {...field} type="email" invalid={meta.touched && !!meta.error} disabled={isEditing} />
                                    }</Field>
                                    <ErrorMessage name="email" component="div" className="text-danger small" />
                                </FormGroup>
                             </Col>
                             <Col md={6}>
                                <FormGroup>
                                    <Label>Password</Label>
                                    <Field name="password">{({ field, meta }) => (
                                        <Input 
                                            {...field} 
                                            type="password" 
                                            placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
                                            autoComplete="new-password"
                                            invalid={meta.touched && !!meta.error} 
                                            value={field.value || ''} 
                                        />
                                    )}</Field>
                                    <ErrorMessage name="password" component="div" className="text-danger small" />
                                </FormGroup>
                             </Col>
                        </Row>
                    </div>

                    {/* SECTION 2: Personal Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="text-primary mb-3">Personal & Contact Details</h6>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>First Name</Label>
                                    <Field name="first_name">{({ field, meta }) => <Input {...field} invalid={meta.touched && !!meta.error} />}</Field>
                                    <ErrorMessage name="first_name" component="div" className="text-danger small" />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Last Name</Label>
                                    <Field name="last_name">{({ field, meta }) => <Input {...field} invalid={meta.touched && !!meta.error} />}</Field>
                                    <ErrorMessage name="last_name" component="div" className="text-danger small" />
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
                                    {/* Upgrade Country to React Select */}
                                    <Select
                                        options={globalStaticLists.countries?.map(c => ({ value: c, label: c }))}
                                        value={values.country ? { value: values.country, label: values.country } : null}
                                        onChange={(opt) => setFieldValue('country', opt?.value || '')}
                                        onBlur={() => setFieldTouched('country', true)}
                                        placeholder="Select Country..."
                                    />
                                    <ErrorMessage name="country" component="div" className="text-danger small mt-1" />
                                </FormGroup>
                            </Col>
                        </Row>
                        {/* Address Row ... (Same as before) */}
                        <Row className="mt-2">
                             <Col md={8}>
                                <FormGroup>
                                    <Label>Address</Label>
                                    <Field name="address">{({ field }) => <Input {...field} />}</Field>
                                </FormGroup>
                             </Col>
                             <Col md={4}>
                                <FormGroup>
                                    <Label>City</Label>
                                    <Field name="city">{({ field }) => <Input {...field} />}</Field>
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
                                        {renderField(
                                            field, 
                                            field.attributeDetails, 
                                            values, 
                                            setFieldValue, 
                                            setFieldTouched, // Pass this new handler
                                            globalStaticLists, 
                                            isEditing
                                        )}
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ))}
                    
                    {/* 🚨 DEBUGGER FOR VALIDATION ERRORS */}
                    {Object.keys(errors).length > 0 && (
                        <Alert color="danger">
                            <strong>Please fix the following errors before saving:</strong>
                            <ul className="mb-0 mt-2">
                                {Object.entries(errors).map(([key, msg]) => (
                                    <li key={key}><strong>{key}:</strong> {msg}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <Link to={initialData?._id ? `/admin/collaborators/${initialData._id}` : '/admin/collaborators'}>
                            <Button color="secondary" outline>
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