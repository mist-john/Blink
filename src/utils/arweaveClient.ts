import { setupCryptoPolyfill } from './crypto-polyfill';

// Initialize crypto polyfill before importing Arweave
let Arweave: any = null;

// Safe import function for Arweave
export async function getArweaveClient() {
  // Only import and initialize in client-side
  if (typeof window === 'undefined') {
    throw new Error('Arweave can only be used in browser environments');
  }

  // Setup polyfill before importing Arweave
  setupCryptoPolyfill();
  
  if (!Arweave) {
    try {
      // Dynamically import Arweave
      const arweaveModule = await import('arweave');
      Arweave = arweaveModule.default;
      
      // Initialize Arweave client
      const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
        timeout: 20000,
        logging: false,
      });
      
      return arweave;
    } catch (error) {
      console.error('Failed to initialize Arweave:', error);
      throw error;
    }
  } else {
    // Return initialized instance
    return Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
      timeout: 20000,
      logging: false,
    });
  }
} 