// client/src/pages/Creator/CreatorDashboard.jsx
import React from 'react';
import { Container, Card, CardBody, CardTitle, CardText, Button, Row, Col } from 'reactstrap';
import { Link } from 'react-router-dom';
import Title from '../../components/Title';

export default function CreatorDashboard() {
    // In a real app, fetch the user's name from context/storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <Container>
            <Title title={`Welcome back, ${user.first_name || user.name}!`} />
            
            <Row>
                <Col md={6}>
                    <Card className="shadow-sm">
                        <CardBody>
                            <CardTitle tag="h5">Update Your Profile</CardTitle>
                            <CardText>Keep your portfolio, skills, and photos up to date to get hired.</CardText>
                            <Button color="primary" tag={Link} to="/creator/profile">Edit Profile</Button>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="shadow-sm">
                        <CardBody>
                            <CardTitle tag="h5">My Jobs (Coming Soon)</CardTitle>
                            <CardText>View active contracts and application status.</CardText>
                            <Button color="secondary" disabled>View Jobs</Button>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}