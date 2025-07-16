import { NextRequest } from 'next/server';

interface ClientInfo {
  ipAddress: string;
  userAgent: string;
  location?: string;
}

export async function getClientInfo(req: NextRequest): Promise<ClientInfo> {
  // Get IP address
  let ipAddress = 
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.ip ||
    'unknown';

  // If multiple IPs in x-forwarded-for, get the first one
  if (ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  // Get user agent
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Try to get location info (basic)
  let location: string | undefined;
  try {
    // Get country from Cloudflare headers if available
    const cfCountry = req.headers.get('cf-ipcountry');
    if (cfCountry && cfCountry !== 'XX') {
      location = cfCountry;
    }
    
    // Get more location info from other headers if available
    const cfRegion = req.headers.get('cf-region');
    const cfCity = req.headers.get('cf-ipcity');
    
    if (cfCity && cfRegion) {
      location = `${cfCity}, ${cfRegion}, ${cfCountry || 'Unknown'}`;
    } else if (cfRegion) {
      location = `${cfRegion}, ${cfCountry || 'Unknown'}`;
    }
  } catch (error) {
    console.warn('Could not determine location:', error);
  }

  return {
    ipAddress,
    userAgent,
    location
  };
}

export function parseUserAgent(userAgent: string) {
  // Simple user agent parsing
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d\.]+/i);
  const osMatch = userAgent.match(/(Windows|Macintosh|Linux|Android|iOS)/i);
  
  return {
    browser: browserMatch ? browserMatch[1] : 'Unknown',
    os: osMatch ? osMatch[1] : 'Unknown',
    full: userAgent
  };
}

export function isValidIP(ip: string): boolean {
  // Basic IP validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
