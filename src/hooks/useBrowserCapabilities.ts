import { useState, useEffect } from 'react';

interface BrowserCapabilities {
  supportsGetUserMedia: boolean;
  supportsWebGL: boolean;
  supportsCanvas: boolean;
  isSecureContext: boolean;
  userAgent: string;
  isCompatible: boolean | undefined; // undefined initially, then true/false
  errors: string[];
}

export const useBrowserCapabilities = (): BrowserCapabilities => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>({
    supportsGetUserMedia: false,
    supportsWebGL: false,
    supportsCanvas: false,
    isSecureContext: false,
    userAgent: '',
    isCompatible: undefined, // Start as undefined
    errors: []
  });

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      setCapabilities(prev => ({
        ...prev,
        isCompatible: false,
        errors: ['Not in browser environment']
      }));
      return;
    }

    const checkCapabilities = async () => {
      try {
        const errors: string[] = [];
        
        // Check getUserMedia support
        const supportsGetUserMedia = !!(
          navigator.mediaDevices && 
          navigator.mediaDevices.getUserMedia
        );
        
        if (!supportsGetUserMedia) {
          errors.push('Browser tidak mendukung akses kamera (getUserMedia)');
        }

        // Check WebGL support (required for face-api.js)
        let supportsWebGL = false;
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          supportsWebGL = !!gl;
          
          // Test basic WebGL functionality
          if (gl && gl instanceof WebGLRenderingContext) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) {
              // Clean up test context
              ext.loseContext();
            }
          }
        } catch (webglError) {
          console.warn('WebGL check failed:', webglError);
          supportsWebGL = false;
        }
        
        if (!supportsWebGL) {
          errors.push('Browser tidak mendukung WebGL (diperlukan untuk face recognition)');
        }

        // Check Canvas support
        const supportsCanvas = !!(document.createElement('canvas').getContext);
        if (!supportsCanvas) {
          errors.push('Browser tidak mendukung Canvas API');
        }

        // Check secure context (HTTPS)
        const isSecureContext = window.isSecureContext || 
                               location.protocol === 'https:' || 
                               location.hostname === 'localhost' ||
                               location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
          errors.push('Face recognition memerlukan HTTPS atau localhost');
        }

        // Get user agent
        const userAgent = navigator.userAgent;

        // Check overall compatibility
        const isCompatible = supportsGetUserMedia && supportsWebGL && supportsCanvas && isSecureContext;

        console.log('🔍 Browser Capabilities Check:', {
          supportsGetUserMedia,
          supportsWebGL,
          supportsCanvas,
          isSecureContext,
          isCompatible,
          errors
        });

        setCapabilities({
          supportsGetUserMedia,
          supportsWebGL,
          supportsCanvas,
          isSecureContext,
          userAgent,
          isCompatible,
          errors
        });

      } catch (error) {
        console.error('Error checking browser capabilities:', error);
        setCapabilities(prev => ({
          ...prev,
          isCompatible: false,
          errors: ['Error checking browser capabilities']
        }));
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(checkCapabilities, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return capabilities;
}; 