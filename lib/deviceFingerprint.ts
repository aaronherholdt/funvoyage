// lib/deviceFingerprint.ts
// Client-side device fingerprinting for tourist abuse protection
// Uses non-invasive browser characteristics (no tracking cookies)

/**
 * Generate a device fingerprint based on browser characteristics
 * This is NOT for tracking users - it's for preventing abuse of free trials
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen characteristics
  components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(`avail:${screen.availWidth}x${screen.availHeight}`);

  // Timezone
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  components.push(`tzOffset:${new Date().getTimezoneOffset()}`);

  // Language
  components.push(`lang:${navigator.language}`);
  components.push(`langs:${navigator.languages?.join(',') || 'none'}`);

  // Platform info
  components.push(`platform:${navigator.platform}`);
  components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
  components.push(`memory:${(navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown'}`);

  // Canvas fingerprint (simplified)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 25);
      ctx.fillStyle = '#069';
      ctx.fillText('FunVoyage', 2, 2);
      components.push(`canvas:${canvas.toDataURL().slice(-50)}`);
    }
  } catch {
    components.push('canvas:error');
  }

  // WebGL renderer (if available)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && 'getParameter' in gl && 'getExtension' in gl) {
      const webgl = gl as WebGLRenderingContext;
      const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(`webgl:${webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
      }
    }
  } catch {
    components.push('webgl:error');
  }

  // Generate hash
  const fingerprint = components.join('|');
  return await hashString(fingerprint);
}

/**
 * Hash a string using SHA-256
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a device fingerprint, cached in sessionStorage
 */
export async function getDeviceFingerprint(): Promise<string> {
  const cacheKey = 'fv_device_fp';

  // Check sessionStorage first
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Generate new fingerprint
  const fingerprint = await generateDeviceFingerprint();

  // Cache it
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem(cacheKey, fingerprint);
    } catch {
      // sessionStorage might be full or disabled
    }
  }

  return fingerprint;
}
