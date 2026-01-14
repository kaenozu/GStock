import { StockDataPoint, AnalysisResult, MarketRegime } from '@/types/market';
import {
    calculateAdvancedPredictions,
    calculateTechnicalIndicators,
    detectMarketRegime
} from '@/lib/api/prediction-engine';

self.onmessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    try {
        switch (type) {
            case 'CALCULATE_PREDICTIONS':
                const result = calculateAdvancedPredictions(data.stockData, data.externalData);
                self.postMessage({
                    type: 'PREDICTIONS_COMPLETE',
                    data: result
                });
                break;

            case 'CALCULATE_INDICATORS':
                const indicators = calculateTechnicalIndicators(data.stockData);
                self.postMessage({
                    type: 'INDICATORS_COMPLETE',
                    data: indicators
                });
                break;

            case 'CALCULATE_REGIME':
                const regime = detectMarketRegime(data.stockData);
                self.postMessage({
                    type: 'REGIME_COMPLETE',
                    data: regime
                });
                break;

            default:
                console.warn('[PredictionWorker] Unknown message type:', type);
        }
    } catch (error) {
        console.error('[PredictionWorker] Error processing message:', error);
        self.postMessage({
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export { };

