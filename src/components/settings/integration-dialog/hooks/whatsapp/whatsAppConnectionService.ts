
// Export all functionality from the refactored services
export { checkConnectionState } from './services/connectionStateService';
export { checkInstanceStatus } from './services/instanceStatusService';
export { initializeConnection } from './services/connectionInitService';
export { formatQrCodeUrl } from './utils/formatters';

// Export utilities
export { callEvolutionApiViaEdgeFunction, callEvolutionApiDirectly } from './services/api/evolutionApi';
export { processConnectionData } from './services/qrHandlers';
export { getSavedInstanceData } from './services/instanceStorage';
