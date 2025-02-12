import React from 'react';

interface ScanButtonProps {
    onClick: () => void;
    isLoading: boolean;
}

function ScanButton({ onClick, isLoading }: ScanButtonProps) {
    return (
        <button 
            onClick={onClick} 
            disabled={isLoading}
            className="scan-button"
        >
            {isLoading ? 'Scanning...' : 'Scan Now'}
        </button>
    );
}

export default ScanButton; 