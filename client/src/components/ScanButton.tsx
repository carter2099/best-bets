import React from 'react';

interface ScanButtonProps {
    onClick: () => void;
    isLoading: boolean;
    text?: string;  // Make text optional with a default value
}

function ScanButton({ onClick, isLoading, text = 'Scan' }: ScanButtonProps) {
    return (
        <button 
            className="scan-button" 
            onClick={onClick} 
            disabled={isLoading}
        >
            {isLoading ? 'Scanning...' : text}
        </button>
    );
}

export default ScanButton; 