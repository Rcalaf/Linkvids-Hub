import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'reactstrap';
import { Link } from 'react-router-dom'; // 🚨 Import Link
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaMapMarkerAlt, FaEnvelope, FaBan, FaUndo, FaExternalLinkAlt } from 'react-icons/fa'; 
import Widget from '../../Widget/Widget';
import { getJobApplicants, assignJob, rejectApplicant, unassignJob, unrejectApplicant } from '../../../services/jobService';

export default function ApplicantManager({ jobId, currentStatus, assignedToId, rejectedIds, onAssignComplete }) {
    // ... (State and useEffects remain unchanged) ...
    const [applicants, setApplicants] = useState([]);
    const [localRejected, setLocalRejected] = useState(rejectedIds || []);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (jobId) loadApplicants();
    }, [jobId]);

    useEffect(() => {
        setLocalRejected(rejectedIds || []);
    }, [rejectedIds]);

    const loadApplicants = async () => {
        try {
            const data = await getJobApplicants(jobId);
            setApplicants(data);
        } catch (error) {
            console.error("Failed to load applicants");
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (userId, userName) => {
        if (!window.confirm(`Assign job to ${userName}?`)) return;
        try {
            await assignJob(jobId, userId);
            toast.success(`Job assigned to ${userName}`);
            if (onAssignComplete) onAssignComplete();
        } catch (error) {
            toast.error("Failed to assign job.");
        }
    };

    const handleReject = async (userId, userName) => {
        if (!window.confirm(`Reject application from ${userName}?`)) return;
        try {
            await rejectApplicant(jobId, userId);
            toast.info("Applicant rejected");
            setLocalRejected(prev => [...prev, userId]);
        } catch (error) {
            toast.error("Failed to reject applicant.");
        }
    };

  
    const handleUnassign = async () => {
        if (!window.confirm("Are you sure you want to cancel this assignment? The job will be reopened.")) return;
        try {
            await unassignJob(jobId);
            toast.info("Assignment cancelled. Job is now Open.");
            if (onAssignComplete) onAssignComplete(); // Refresh parent to update status
        } catch (error) {
            toast.error("Failed to unassign job.");
        }
    };

    const handleUnreject = async (userId, userName) => {
        if (!window.confirm(`Restore ${userName} to candidate list?`)) return;
        try {
            await unrejectApplicant(jobId, userId);
            toast.success("Applicant restored.");
            // Remove from local rejected list immediately
            setLocalRejected(prev => prev.filter(id => id !== userId));
        } catch (error) {
            toast.error("Failed to restore applicant.");
        }
    };

    if (loading) return <p className="text-muted p-3">Loading applicants...</p>;

    return (
        <Widget title={
            <div className="d-flex justify-content-between align-items-center">
                <span>Applicants ({applicants.length})</span>
                {currentStatus === 'Assigned' && <Badge color="primary">Job Assigned</Badge>}
            </div>
        }>
            {applicants.length === 0 ? (
                <div className="text-center py-4 text-muted">
                    <p>No applications received yet.</p>
                </div>
            ) : (
                <div className="table-responsive">
                    <Table hover className="align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="border-top-0">Candidate</th>
                                <th className="border-top-0">Location</th>
                                <th className="border-top-0 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applicants.map(user => {
                                const isWinner = assignedToId === user._id;
                                const isRejected = localRejected.includes(user._id);
                                const isJobClosed = currentStatus === 'Assigned' || currentStatus === 'Completed';
                                const rowClass = isWinner ? "table-success" : (isRejected ? "opacity-50 bg-light" : "");

                                // 🚨 DEFINE PROFILE URL 🚨
                                const profileUrl = `/admin/collaborators/${user._id}`;

                                return (
                                    <tr key={user._id} className={rowClass}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <Link to={profileUrl} target="_blank" rel="noopener noreferrer">
                                                    <img 
                                                        src={user.profile_picture || 'https://placehold.co/100?text=User'} 
                                                        alt="Avatar" 
                                                        className="rounded-circle me-3 border"
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', filter: isRejected ? 'grayscale(100%)' : 'none' }}
                                                    />
                                                </Link>
                                                
                                                <div>
                                                    <div className="fw-bold">
                                                        {/* 🚨 2. LINK THE NAME 🚨 */}
                                                        <Link 
                                                            to={profileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-dark text-decoration-none hover-primary"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                        >
                                                            {user.name} <FaExternalLinkAlt size={10} className="text-muted ms-1" />
                                                        </Link>

                                                        {isRejected && <Badge color="secondary" className="ms-2">Rejected</Badge>}
                                                    </div>
                                                    <small className="text-muted"><FaEnvelope className="me-1"/> {user.email}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {user.city ? (
                                                <><FaMapMarkerAlt className="text-muted me-1" /> {user.city}, {user.country}</>
                                            ) : <span className="text-muted">-</span>}
                                        </td>
                                        <td className="text-end">
                                           {isWinner ? (
                                                <div className="d-flex justify-content-end align-items-center gap-2">
                                                    <Badge color="success" className="p-2"><FaCheck className="me-1"/> Selected</Badge>
                                                    <Button color="danger" size="sm" outline title="Cancel Assignment" onClick={handleUnassign}>
                                                        <FaUndo />
                                                    </Button>
                                                </div>
                                            ) : isRejected ? (
                                                <div className="d-flex justify-content-end align-items-center gap-2">
                                                    <span className="text-muted small me-2"><FaBan className="me-1" /> Rejected</span>
                                                    {/* 🚨 UN-REJECT BUTTON 🚨 */}
                                                    <Button 
                                                        color="secondary" 
                                                        size="sm" 
                                                        outline 
                                                        title="Restore Applicant" 
                                                        onClick={() => handleUnreject(user._id, user.name)}
                                                    >
                                                        <FaUndo />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button color="success" size="sm" outline disabled={isJobClosed} onClick={() => handleAssign(user._id, user.name)} title="Assign Job">
                                                        <FaCheck /> Assign
                                                    </Button>
                                                    <Button color="danger" size="sm" outline onClick={() => handleReject(user._id, user.name)} title="Reject Applicant">
                                                        <FaTimes /> Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            )}
        </Widget>
    );
}