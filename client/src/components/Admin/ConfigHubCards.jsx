// client/src/components/Admin/ConfigHubCards.jsx
import React from 'react';
import { Row } from 'reactstrap';
import Widget from '../../components/Widget/Widget';
import ConfigNavCard from './ConfigNavCard'; // 🚨 Import the reusable card

const ATTRIBUTE_PATH = '/admin/config/attributes';
const USER_TYPE_PATH = '/admin/config/user-types';

export default function ConfigHubCards() {
    return (
        <Widget title="Select Configuration Area">
            <Row>
                
                {/* 🚨 Use Reusable ConfigNavCard for Attribute Library 🚨 */}
                <ConfigNavCard
                    title="⚙️ Attribute Library"
                    text="Create, edit, and manage reusable global fields (text, number, boolean, URL, etc.) that form the foundation of user profiles."
                    linkTo={ATTRIBUTE_PATH}
                    color="#007bff" // Blue for primary config area
                />

                {/* 🚨 Use Reusable ConfigNavCard for User Type Schemas 🚨 */}
                <ConfigNavCard
                    title="👥 User Type Schemas"
                    text="Define custom user groups (UGC, Actors, Agencies) by structuring and configuring fields from the Attribute Library."
                    linkTo={USER_TYPE_PATH}
                    color="#28a745" // Green for secondary config area
                />

            </Row>
        </Widget>
    );
}