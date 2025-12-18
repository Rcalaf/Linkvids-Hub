// client/src/components/Admin/ConfigNavCard.jsx
import React from 'react';
import { Col, Card, CardBody, CardTitle, CardText, Button } from 'reactstrap';
import { Link } from 'react-router-dom';

export default function ConfigNavCard({ title, text, linkTo, color }) {
    return (
        <Col md={6} className="mb-4">
            <Card style={{ borderColor: color, height: '100%' }}>
                <CardBody className="d-flex flex-column">
                    <CardTitle tag="h5" className="text-primary" style={{ color: color }}>
                        {title}
                    </CardTitle>
                    <CardText className="flex-grow-1">
                        {text}
                    </CardText>
                    <Button 
                        tag={Link} 
                        to={linkTo} 
                        color={color === '#007bff' ? 'primary' : 'success'} // Use primary/success variant based on color
                        className="mt-auto"
                    >
                        Go to Management
                    </Button>
                </CardBody>
            </Card>
        </Col>
    );
}