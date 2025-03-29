export function setupCryptoPolyfill() {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Check if crypto is already available
  if (window.crypto && window.crypto.subtle) return;

  // Simple polyfill for environments where SubtleCrypto isn't available
  if (!window.crypto) {
    Object.defineProperty(window, 'crypto', {
      value: {},
      writable: true,
      configurable: true,
    });
  }

  // Provide a basic SubtleCrypto implementation
  if (!window.crypto.subtle) {
    console.warn('Polyfilling SubtleCrypto API - not secure for production use');
    
    // Create a basic mock implementation
    Object.defineProperty(window.crypto, 'subtle', {
      value: {
        // Add minimal methods that Arweave might need
        digest: async (algorithm: string, data: BufferSource) => {
          console.warn('Using polyfilled crypto.subtle.digest - not secure');
          // Return a dummy hash (this is just to make the code not crash)
          return new Uint8Array(32).buffer;
        },
        // Add other methods as needed based on what Arweave uses
      },
      writable: true,
      configurable: true,
    });
  }

  // Polyfill getRandomValues if needed
  if (!window.crypto.getRandomValues) {
    Object.defineProperty(window.crypto, 'getRandomValues', {
      value: function(array: Uint8Array) {
        console.warn('Using polyfilled crypto.getRandomValues - not secure');
        // Fill with pseudo-random values (not secure, just to make it not crash)
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
      writable: true,
      configurable: true,
    });
  }
} 