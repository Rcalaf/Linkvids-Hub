import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';

const StarRating = ({ rating, onRate, readonly = false, size = 20 }) => {
    const [hover, setHover] = useState(null);

    return (
        <div className="d-flex">
            {[...Array(5)].map((star, i) => {
                const ratingValue = i + 1;
                
                return (
                    <label key={i} style={{ cursor: readonly ? 'default' : 'pointer' }}>
                        {!readonly && (
                            <input 
                                type="radio" 
                                name="rating" 
                                value={ratingValue} 
                                onClick={() => onRate(ratingValue)}
                                style={{ display: 'none' }}
                            />
                        )}
                        <FaStar 
                            size={size} 
                            color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"} 
                            onMouseEnter={() => !readonly && setHover(ratingValue)}
                            onMouseLeave={() => !readonly && setHover(null)}
                            className="me-1 transition-colors"
                        />
                    </label>
                );
            })}
        </div>
    );
};

export default StarRating;