
import React from 'react';
import { Badge } from 'reactstrap';
import { FaCheckCircle, FaTimesCircle, FaLock, FaClock, FaEuroSign } from 'react-icons/fa';

const  JobStatusBadge = ({ job }) => {
    // 1. PRIORITY: I WON THE JOB
    if (job.isSelected) {
        return (
            <Badge color="success" className="p-2 d-flex align-items-center gap-2">
                <FaCheckCircle /> <span>Selected</span>
            </Badge>
        );
    }

    // 2. PRIORITY: I WAS REJECTED
    if (job.isRejected) {
        return (
            <Badge color="danger" className="p-2 d-flex align-items-center gap-2">
                <FaTimesCircle /> <span>Application Rejected</span>
            </Badge>
        );
    }

    // 3. PRIORITY: JOB IS CLOSED (Assigned to someone else)
    // If I applied, wasn't rejected, but the job is now Assigned/Completed
    if (job.hasApplied && (job.status === 'Assigned' || job.status === 'Completed')) {
        return (
            <Badge color="secondary" className="p-2 d-flex align-items-center gap-2">
                <FaLock /> <span>Position Filled</span>
            </Badge>
        );
    }

    // 4. PRIORITY: PENDING APPLICATION
    if (job.hasApplied) {
        return (
            <Badge color="info" className="p-2 d-flex align-items-center gap-2 text-dark border">
                <FaClock /> <span>Application Pending</span>
            </Badge>
        );
    }

    // 5. DEFAULT: OPEN JOB (Show Rate)
    return (
        <Badge color="primary" className="p-2 d-flex align-items-center gap-2">
            <span className="fw-bold">{job.rate}€</span>
        </Badge>
    );
}
export default JobStatusBadge;