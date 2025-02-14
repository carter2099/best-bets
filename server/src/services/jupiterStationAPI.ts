import axios from 'axios';

export interface Token {
    address: string;
    name: string;
    symbol: string;
}

export class JupiterStationAPI {
    private baseUrl: string;
    private apiKey: string;

    constructor(apiKey: string) {
        this.baseUrl = 'https://jupiter-station.api'; // Replace with actual API URL
        this.apiKey = apiKey;
    }

    async getBulkTokens(): Promise<Token[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/tokens`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching bulk tokens:', error);
            throw error;
        }
    }
} 