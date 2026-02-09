import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'reactstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
    FaCheck, FaTimes, FaMapMarkerAlt, FaEnvelope, FaBan, FaUndo, 
    FaExternalLinkAlt, FaCheckCircle, FaStar, FaRegStar, FaQuoteLeft, FaPen 
} from 'react-icons/fa'; 

import Widget from '../../Widget/Widget';
import RatePerformanceModal from '../../Job/RatePerformanceModal';

// Services
import { 
    getJobApplicants, assignJob, rejectApplicant, unassignJob, 
    unrejectApplicant, shortlistApplicant, undoShortlistApplicant 
} from '../../../services/jobService';

export default function ApplicantManager({ 
    jobId, 
    currentStatus, 
    assignedToId, 
    positionsAvailable = 1, 
    onAssignComplete 
}) {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- RATING STATE ---
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [ratingCandidate, setRatingCandidate] = useState(null);

    useEffect(() => {
        if (jobId) loadApplicants();
    }, [jobId]);

    const loadApplicants = async () => {
        try {
            const data = await getJobApplicants(jobId);
            setApplicants(data);
        } catch (error) {
            console.error("Failed to load applicants", error);
            toast.error("Could not load applicants");
        } finally {
            setLoading(false);
        }
    };

    // --- MULTI-HIRE CALCULATIONS ---
    // Count how many are currently hired (accepted/assigned)
    const hiredCount = applicants.filter(app => 
        app.status === 'accepted'
    ).length;

    // Check if the quota is reached
    const isJobFull = hiredCount >= positionsAvailable;


    // --- ASSIGNMENT HANDLERS ---
    const handleAssign = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to hire ${userName}?`)) return;
        try {
            await assignJob(jobId, userId);
            
            // 🚨 RELOAD DATA: The backend might auto-reject others if this was the last slot.
            // It is safer to reload the list than to manually map the state here.
            await loadApplicants();
            
            toast.success(`${userName} hired!`);
            if (onAssignComplete) onAssignComplete(); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to assign job.");
        }
    };

  
    const handleUnassign = async (userId) => {
        if (!window.confirm("Cancel assignment? This slot will reopen.")) return;
        try {

            await unassignJob(jobId, userId);
            
            // Reload to reflect status changes (Job might go from Assigned -> Open)
            await loadApplicants();
            
            toast.info("Assignment cancelled.");
            if (onAssignComplete) onAssignComplete();
        } catch (error) {
            toast.error("Failed to unassign.");
        }
    };

    const handleReject = async (userId, userName) => {
        try {
            await rejectApplicant(jobId, userId);
            setApplicants(prev => prev.map(app => app.userId === userId ? { ...app, status: 'rejected' } : app));
            toast.info(`${userName} rejected.`);
        } catch (error) {
            toast.error("Failed to reject.");
        }
    };

    const handleUnreject = async (userId, userName) => {
        try {
            await unrejectApplicant(jobId, userId);
            setApplicants(prev => prev.map(app => app.userId === userId ? { ...app, status: 'pending' } : app));
            toast.success(`${userName} restored.`);
        } catch (error) {
            toast.error("Failed to restore.");
        }
    };

    const handleShortlist = async (userId, userName) => {
        try {
            await shortlistApplicant(jobId, userId);
            setApplicants(prev => prev.map(app => 
                app.userId === userId ? { ...app, status: 'shortlisted' } : app
            ));
            toast.success(`${userName} shortlisted!`);
        } catch (error) {
            toast.error("Failed to shortlist.");
        }
    };

    const handleUndoShortlist = async (userId, userName) => {
        try {
            await undoShortlistApplicant(jobId, userId);
            setApplicants(prev => prev.map(app => 
                app.userId === userId ? { ...app, status: 'pending' } : app
            ));
            toast.info(`${userName} removed from shortlist.`);
        } catch (error) {
            toast.error("Failed to update status.");
        }
    };

    // --- RATING HANDLERS ---
    const handleRateClick = (applicant) => {
        setRatingCandidate(applicant);
        setRateModalOpen(true);
    };

    const handleRateSuccess = () => {
        loadApplicants(); 
        if (onAssignComplete) onAssignComplete(); 
    };

    if (loading) return <p className="text-muted p-3">Loading applicants...</p>;

    return (
        <Widget title={
            <div className="d-flex justify-content-between align-items-center">
                <span>Applicants ({applicants.length})</span>
                <div className="d-flex align-items-center gap-2">
                    {/* 🚨 VISUAL INDICATOR FOR POSITIONS */}
                    <Badge color={isJobFull ? "success" : "info"} className="px-3 py-2">
                        Positions: {hiredCount} / {positionsAvailable}
                    </Badge>

                    {currentStatus === 'Completed' && <Badge color="dark">Completed</Badge>}
                </div>
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
                                <th className="border-top-0 text-end">Actions / Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applicants.map(application => {
                                const userId = application.userId; 
                                const userName = application.name || application.username || 'Unknown';
                                const userEmail = application.email;
                                const userAvatar = application.profile_picture || 'https://placehold.co/100?text=User';
                                const userLocation = application.city ? `${application.city}, ${application.country}` : '-';

                                // Check status
                                const isWinner = application.status === 'accepted';
                                const isRejected = application.status === 'rejected'; 
                                const isShortlisted = application.status === 'shortlisted';
                                
                                const isJobCompleted = currentStatus === 'Completed';
                                // Note: In multi-hire, we rely on individual status mostly, not just job status

                                let rowClass = "";
                                if (isWinner) rowClass = "table-success";
                                else if (isRejected) rowClass = "opacity-50 bg-light";
                                else if (isShortlisted) rowClass = "table-warning";

                                const profileUrl = `/admin/collaborators/${userId}`;

                                return (
                                    <tr key={application._id || userId} className={rowClass}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <Link to={profileUrl} target="_blank">
                                                    <img 
                                                        src={userAvatar} 
                                                        alt="Avatar" 
                                                        className="rounded-circle me-3 border"
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', filter: isRejected ? 'grayscale(100%)' : 'none' }}
                                                    />
                                                </Link>
                                                <div>
                                                    <div className="fw-bold">
                                                        <Link to={profileUrl} target="_blank" className="text-dark text-decoration-none">
                                                            {userName} <FaExternalLinkAlt size={10} className="text-muted ms-1" />
                                                        </Link>
                                                        {isWinner && <Badge color="success" className="ms-2">Hired</Badge>}
                                                        {isRejected && <Badge color="secondary" className="ms-2">Rejected</Badge>}
                                                        {isShortlisted && !isWinner && <Badge color="warning" className="text-dark ms-2">Shortlisted</Badge>}
                                                    </div>
                                                    <small className="text-muted"><FaEnvelope className="me-1"/> {userEmail}</small>
                                                    {application.coverNote && <div className="small text-primary mt-1 fst-italic">"{application.coverNote}"</div>}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td>{application.city ? <><FaMapMarkerAlt className="text-muted me-1" /> {userLocation}</> : <span className="text-muted">-</span>}</td>

                                        <td className="text-end">
                                            {/* SCENARIO 1: JOB COMPLETED (Show Ratings) */}
                                            {isJobCompleted ? (
                                                isWinner ? (
                                                    <div className="d-flex align-items-center justify-content-end gap-2">
                                                        {application.rating ? (
                                                            <>
                                                                {application.ratingNote && (
                                                                    <div className="text-muted small fst-italic text-end border-end pe-2" style={{ maxWidth: '200px', lineHeight: '1.2' }}>
                                                                        <FaQuoteLeft size={8} className="me-1 opacity-50" />
                                                                        {application.ratingNote}
                                                                    </div>
                                                                )}
                                                                <div className="d-flex align-items-center text-warning fw-bold border px-2 py-1 rounded bg-white shadow-sm">
                                                                    <FaStar className="me-1" /> {application.rating}/5
                                                                </div>
                                                                <Button color="light" size="sm" className="text-secondary border-0 p-1" onClick={() => handleRateClick(application)}>
                                                                    <FaPen size={12} />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button color="warning" size="sm" className="fw-bold shadow-sm" onClick={() => handleRateClick(application)}>
                                                                <FaStar className="me-1" /> Rate Work
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small">Not Selected</span>
                                                )
                                            ) 
                                            // SCENARIO 2: JOB ACTIVE / OPEN
                                            : (
                                                <div className="d-flex justify-content-end gap-2">
                                                    {isWinner ? (
                                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                                            <span className="text-success fw-bold me-2"><FaCheckCircle/> Working</span>
                                                            <Button 
                                                                color="danger" size="sm" outline 
                                                                title="Unassign" 
                                                                // 🚨 Pass userId to handle specific unassignment
                                                                onClick={() => handleUnassign(userId)}
                                                            >
                                                                <FaUndo /> Unassign
                                                            </Button>
                                                        </div>
                                                    ) : isRejected ? (
                                                         <div className="d-flex justify-content-end align-items-center gap-2">
                                                            <span className="text-muted small me-2"><FaBan className="me-1" /> Rejected</span>
                                                            <Button color="secondary" size="sm" outline title="Restore" onClick={() => handleUnreject(userId, userName)}><FaUndo /></Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {isShortlisted ? (
                                                                <Button 
                                                                    color="warning" size="sm" 
                                                                    onClick={() => handleUndoShortlist(userId, userName)}
                                                                >
                                                                    <FaStar className="text-white"/> 
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    color="secondary" outline size="sm" 
                                                                    onClick={() => handleShortlist(userId, userName)}
                                                                >
                                                                    <FaRegStar /> 
                                                                </Button>
                                                            )}

                                                            <Button 
                                                                color="success" size="sm" outline 
                                                                title="Assign" 
                                                                // 🚨 DISABLE if quota is reached
                                                                disabled={isJobFull} 
                                                                onClick={() => handleAssign(userId, userName)}
                                                            >
                                                                <FaCheck /> Assign
                                                            </Button>
                                                            <Button color="danger" size="sm" outline onClick={() => handleReject(userId, userName)} title="Reject">
                                                                <FaTimes />
                                                            </Button>
                                                        </>
                                                    )}
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

            {ratingCandidate && (
                <RatePerformanceModal 
                    isOpen={rateModalOpen}
                    toggle={() => setRateModalOpen(!rateModalOpen)}
                    jobId={jobId}
                    applicantName={ratingCandidate.name || ratingCandidate.username}
                    applicantId={ratingCandidate.userId} 
                    initialRating={ratingCandidate.rating}
                    initialFeedback={ratingCandidate.ratingNote}
                    onSuccess={handleRateSuccess}
                />
            )}
        </Widget>
    );
}