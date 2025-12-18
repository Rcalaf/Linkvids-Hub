import React, { useState, useEffect } from 'react';
import { Container, ListGroup, ListGroupItem, Badge, Button, Row, Col } from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaBell, FaInfoCircle, FaCheckDouble, FaUserPlus, FaTrash } from 'react-icons/fa';
import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getNotifications, markNotificationAsRead, markAllNotificationsRead, deleteNotification } from '../../../services/notificationService';

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data.notifications);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleRead = async (id, isRead) => {
        if (isRead) return;
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (e) { console.error(e); }
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent triggering the "Mark as Read" click event on the parent row
        if (!window.confirm("Delete this notification?")) return;

        try {
            await deleteNotification(id);
            // Remove from local state immediately
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (error) {
            console.error("Failed to delete notification");
        }
    };

    const getIcon = (message) => {
        if (message.includes("New Application")) return <FaUserPlus className="text-primary display-6" />;
        return <FaInfoCircle className="text-secondary display-6" />;
    };

    if (loading) return <p className="text-center p-5">Loading notifications...</p>;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <Title title="Admin Alerts" />
                {notifications.some(n => !n.isRead) && (
                    <Button color="light" size="sm" onClick={handleMarkAll} className="border">
                        <FaCheckDouble className="me-2" /> Mark all as read
                    </Button>
                )}
            </div>

            <Widget>
                {notifications.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <FaBell size={40} className="mb-3 opacity-25" />
                        <h5>All caught up</h5>
                        <p>No new alerts found.</p>
                    </div>
                ) : (
                    <ListGroup flush>
                        {notifications.map(note => (
                            <ListGroupItem 
                                key={note._id} 
                                className={`p-4 border-bottom ${!note.isRead ? 'bg-light' : ''}`}
                                style={{ cursor: 'pointer', transition: '0.2s' }}
                                onClick={() => handleRead(note._id, note.isRead)}
                            >
                                <Row className="align-items-center">
                                    <Col xs={2} md={1} className="text-center">
                                        {getIcon(note.message)}
                                    </Col>
                                    <Col xs={10} md={11}>
                                        <div className="d-flex justify-content-between mb-1">
                                           <strong className={!note.isRead ? "text-dark" : "text-muted"}>
                                                {note.type === 'JOB_ASSIGNED' ? 'Congratulations!' : 
                                                note.type === 'JOB_REJECTED' ? 'Application Update' : 
                                                'System Alert'}
                                            </strong>
                                            <div className="d-flex flex-column align-items-end ms-3">
                                                <small className="text-muted mb-2" style={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </small>
                                                <Button 
                                                    color="white" 
                                                    size="sm" 
                                                    className="text-danger p-0 border-0"
                                                    title="Delete"
                                                    onClick={(e) => handleDelete(e, note._id)}
                                                    style={{ lineHeight: 1 }}
                                                >
                                                    <FaTrash size={14} />
                                                </Button>
                                            </div>      
                                        </div>
                                        <p className="mb-1 text-secondary">{note.message}</p>
                                        
                                        {/* Link to Job View if related */}
                                        {note.relatedJob && (
                                            <Link 
                                                to={`/admin/jobs/${note.relatedJob._id}`} 
                                                className="small fw-bold text-decoration-none"
                                                onClick={(e) => e.stopPropagation()} 
                                            >
                                                View Job: {note.relatedJob.projectName}
                                            </Link>
                                        )}
                                        
                                        {!note.isRead && <div className="mt-2"><Badge color="primary" pill>New</Badge></div>}
                                    </Col>
                                   
                                </Row>
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                )}
            </Widget>
        </Container>
    );
}