import { useChatLogic as useChatLogicProd } from './useChatLogic';
import { useChatLogic as useChatLogicDev } from './useChatLogicDev';

// Toggle between dev and production implementations via environment variable
// Set REACT_APP_USE_DEV=true to use the dev version
const USE_DEV = import.meta.env.REACT_APP_USE_DEV === 'true';

export const useChatLogic = USE_DEV ? useChatLogicDev : useChatLogicProd;