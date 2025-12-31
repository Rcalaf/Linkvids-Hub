import React, { useState } from 'react';
import axios from 'axios';
import { 
    Button, Input, Form, Row, Col, Progress, InputGroup, 
    Card, CardBody, CardTitle 
} from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../Widget/Widget'; 
import { 
    FaTrashAlt, FaUpload, FaFilePdf, FaFileWord, FaFileAlt, FaExternalLinkAlt, FaImage 
} from 'react-icons/fa';


const API_URL = import.meta.env.DEV ? '/api/files/upload' : import.meta.env.VITE_API_URL+'/files/upload';
// const API_URL = '/api/files/upload'; 
const DELETE_API_URL = import.meta.env.DEV ? '/api/files/delete' : import.meta.env.VITE_API_URL+'/files/delete';
// const DELETE_API_URL = '/api/files/delete';

// --- CONFIGURATION FOR MODES ---
const UPLOAD_CONFIG = {
    image: {
        accept: ".jpg,.jpeg,.png,.gif,.webp",
        placeholder: "Select images...",
    },
    file: {
        accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt",
        placeholder: "Select documents...",
    }
};

export const SingleAttributeManager = ({ 
    userId, 
    attributeSlug, 
    attributeLabel, 
    currentFiles = [], 
    onUpdate,
    mode = 'image'
}) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const config = UPLOAD_CONFIG[mode] || UPLOAD_CONFIG.image;

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files).slice(0, 5)); 
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return toast.warning(`Select files to upload.`);

        // Limit Check
        const MAX_SIZE_MB = 5;
        const largeFile = selectedFiles.find(file => file.size > MAX_SIZE_MB * 1024 * 1024);
        if (largeFile) return toast.error(`File "${largeFile.name}" is too large! Max size is ${MAX_SIZE_MB}MB.`);

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('photos', file)); 
        formData.append('attributeSlug', attributeSlug); 
        formData.append('userId', userId);

        setUploading(true);
        setProgress(0);

        try {
            const response = await axios.post(`${API_URL}/${userId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / p.total))
            });

            toast.success(`${attributeLabel} updated successfully!`);
            setSelectedFiles([]);
            onUpdate(attributeSlug, response.data.photos); 

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Upload failed.');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };
    
    const handleRemove = async (filePath) => {
        if (!window.confirm(`Delete this file?`)) return;

        try {
            const response = await axios.delete(`${DELETE_API_URL}/${userId}`, {
                data: { attributeSlug, photoPath: filePath }
            });
            toast.success(`File removed.`);
            onUpdate(attributeSlug, response.data.photos); 
        } catch (error) {
            toast.error('Removal failed.');
        }
    };

    // 🚨 ROBUST URL & PREVIEW HANDLING 🚨
    const renderPreview = (file) => {
        // 1. Determine the source URL
        let url = file.path || "";
        
        // Safety: If it's a legacy local path (starts with /uploads), prefix it.
        // If it starts with http, it's an S3 URL -> leave it alone.
        if (url.startsWith('/')) {
            // Assuming your React app proxies to backend or they are on same domain
            // If strictly separate, you might need `process.env.REACT_APP_API_URL + url`
        }

        // 2. Extract clean filename for display
        // S3 Path: https://bucket.../uploads/123/images/9999-my_pic.jpg -> my_pic.jpg
        let displayName = file.name || "File";
        // Attempt to parse real name from URL if name is missing
        if (!file.name && url) {
            const parts = url.split('/');
            displayName = parts[parts.length - 1].split('-').slice(1).join('-') || parts[parts.length - 1]; 
        }

        // 3. Determine Extension
        // Remove query params first
        const cleanUrl = url.split('?')[0]; 
        const extension = cleanUrl.split('.').pop().toLowerCase();
        
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension);

        // --- IMAGE RENDER ---
        if (isImage) {
            return (
                <div 
                    style={{ height: '140px', overflow: 'hidden', backgroundColor: '#f8f9fa' }} 
                    className="d-flex align-items-center justify-content-center border-bottom"
                >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <img 
                            src={url} 
                            alt={displayName} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            onError={(e) => {
                                e.target.style.display = 'none'; 
                                e.target.nextSibling.style.display = 'flex'; 
                            }}
                        />
                        {/* Fallback Error State */}
                        <div style={{display: 'none', flexDirection: 'column', alignItems: 'center'}} className="text-muted p-2 text-center">
                            <FaImage size={24} className="mb-1" />
                            <span style={{fontSize:'0.7rem'}}>Image Load Error</span>
                        </div>
                    </a>
                </div>
            );
        }

        // --- DOCUMENT RENDER ---
        let Icon = FaFileAlt;
        if (extension === 'pdf') Icon = FaFilePdf;
        if (['doc', 'docx'].includes(extension)) Icon = FaFileWord;
        if (['xls', 'xlsx', 'csv'].includes(extension)) Icon = FaFileAlt;

        return (
            <div style={{ height: '140px' }} className="d-flex flex-column align-items-center justify-content-center bg-light border-bottom text-muted p-3">
                <Icon size={40} className="mb-2 text-secondary opacity-75" />
                <div className="small text-truncate w-100 text-center fw-bold px-2" title={displayName}>
                    {displayName}
                </div>
                <div className="small text-uppercase text-muted mt-1" style={{fontSize:'0.65rem'}}>
                    {extension || "FILE"}
                </div>
            </div>
        );
    };

    return (
        <Card className="mb-3 border shadow-sm">
            <CardBody>
                <CardTitle tag="h6" className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                    <span className="fw-bold text-dark">{attributeLabel}</span> 
                    <small className="text-muted">({currentFiles.length} files)</small>
                </CardTitle>

                <Form onSubmit={handleUpload} className="mb-4">
                    <InputGroup>
                        <Input 
                            type="file" 
                            multiple 
                            accept={config.accept} 
                            onChange={handleFileChange} 
                            disabled={uploading} 
                        />
                        <Button color="primary" type="submit" disabled={uploading || selectedFiles.length === 0}>
                            <FaUpload className="me-2"/> 
                            {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </InputGroup>
                    {uploading && <Progress value={progress} color="info" className="mt-2" style={{height:'6px'}} />}
                </Form>
                
                {currentFiles.length > 0 ? (
                    <Row>
                        {currentFiles.map((file, index) => (
                            <Col md={4} sm={6} xs={12} key={file.path || index} className="mb-3">
                                <div className="border rounded overflow-hidden shadow-sm h-100 bg-white d-flex flex-column">
                                    {renderPreview(file)}
                                    
                                    <div className="p-2 d-flex justify-content-between align-items-center mt-auto bg-white">
                                        <a href={file.path} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light border" title="Open in new tab">
                                            <FaExternalLinkAlt size={12} />
                                        </a>
                                        <Button 
                                            color="light" 
                                            size="sm" 
                                            className="text-danger border-0 hover-danger"
                                            onClick={() => handleRemove(file.path)}
                                            title="Delete"
                                        >
                                            <FaTrashAlt />
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <div className="text-center py-4 bg-light rounded border border-dashed">
                        <FaImage className="text-muted mb-2 opacity-50" size={24} />
                        <p className="text-muted mb-0 small">No files uploaded yet.</p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default function PhotoUploadManager({ userId, photoAttributes = [], currentUserData, onPhotosUpdate }) {
    if (!userId) return <Widget title="File Management"><p className="text-danger">User ID required.</p></Widget>;

    return (
        <Widget title="Media & Files">
            {photoAttributes.length === 0 && <p className="text-muted">No attributes configured.</p>}
            
            {photoAttributes.map(attr => (
                <SingleAttributeManager
                    key={attr.attributeDetails.slug}
                    userId={userId}
                    attributeSlug={attr.attributeDetails.slug}
                    attributeLabel={attr.label}
                    currentFiles={currentUserData.groupSpecificAttributes[attr.attributeDetails.slug] || []}
                    onUpdate={onPhotosUpdate}
                    mode="image" // Use 'file' if you want document defaults
                />
            ))}
        </Widget>
    );
}