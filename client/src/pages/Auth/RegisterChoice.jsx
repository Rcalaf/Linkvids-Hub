import React from 'react';
import { Container, Row, Col, Card, CardBody, Button } from 'reactstrap';
import { Link } from 'react-router-dom';

export default function RegisterChoice() {
    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="text-center w-100" style={{ maxWidth: '800px' }}>
                <h2 className="mb-5">Join LinkVids</h2>
                <Row>
                    <Col md={6}>
                        <Card className="h-100 shadow-sm hover-shadow">
                            <CardBody className="p-5 d-flex flex-column">
                                <h4>I am a Creator</h4>
                                <p className="text-muted flex-grow-1">
                                    I want to offer my services as a UGC Creator, Actor, or Freelancer.
                                </p>
                                <Link to="/register/collaborator">
                                    <Button color="primary" size="lg" block>Join as Creator</Button>
                                </Link>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md={6}>
                        <Card className="h-100 shadow-sm">
                            <CardBody className="p-5 d-flex flex-column">
                                <h4>I am an Agency</h4>
                                <p className="text-muted flex-grow-1">
                                    I represent a brand or agency looking to hire talent and manage campaigns.
                                </p>
                                <Link to="/register/agency">
                                    <Button color="success" size="lg" block>Join as Agency</Button>
                                </Link>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
                <div className="mt-4">
                    Already have an account? <Link to="/login">Log In</Link>
                </div>
            </div>
        </Container>
    );
}