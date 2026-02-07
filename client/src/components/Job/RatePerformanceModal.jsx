import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, FormGroup, Label, Input } from 'reactstrap';
import { FaStar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { reviewJobPerformance } from '../../services/jobService';

// 🚨 1. Add 'applicantId' to the props destructuring
export default function RatePerformanceModal({ isOpen, toggle, jobId, applicantName, applicantId, onSuccess }) {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [hover, setHover] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating.");
            return;
        }

        setSubmitting(true);
        try {
            // 🚨 2. Send 'userId' in the payload so the controller knows who to rate
            await reviewJobPerformance(jobId, { 
                rating, 
                feedback,
                userId: applicantId 
            });
            
            toast.success("Review submitted successfully!");
            onSuccess(); // Refresh parent data
            toggle();
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit review.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <ModalHeader toggle={toggle}>Rate Performance: {applicantName}</ModalHeader>
            <ModalBody>
                <div className="text-center mb-4">
                    <p className="text-muted small mb-2">How was your experience working with this user?</p>
                    <div className="d-flex justify-content-center">
                        {[...Array(5)].map((star, index) => {
                            const ratingValue = index + 1;
                            return (
                                <label key={index} style={{ cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name="rating" 
                                        value={ratingValue} 
                                        style={{ display: 'none' }} 
                                        onClick={() => setRating(ratingValue)}
                                    />
                                    <FaStar 
                                        size={35} 
                                        color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"} 
                                        onMouseEnter={() => setHover(ratingValue)}
                                        onMouseLeave={() => setHover(0)}
                                        className="mx-1"
                                    />
                                </label>
                            );
                        })}
                    </div>
                    <div className="mt-2 fw-bold text-warning">
                        {rating > 0 ? `${rating} Stars` : 'Select Rating'}
                    </div>
                </div>

                <FormGroup>
                    <Label>Feedback / Comments</Label>
                    <Input 
                        type="textarea" 
                        rows="4"
                        placeholder="Share details about their work quality, communication, and timeliness..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                </FormGroup>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggle} disabled={submitting}>Cancel</Button>
                <Button color="primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
            </ModalFooter>
        </Modal>
    );
}