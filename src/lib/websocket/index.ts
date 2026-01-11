/**
 * WebSocket Module Exports
 * @module lib/websocket
 */

export { FinnhubWebSocket } from './FinnhubWebSocket';
export {
    FinnhubMessageSchema,
    FinnhubTradeSchema,
    type FinnhubMessage,
    type FinnhubTrade,
    type NormalizedPrice,
    type ConnectionStatus,
    type WebSocketEvent,
} from './schemas';
