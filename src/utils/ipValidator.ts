/**
 * Aegis-Linux IDS/IPS Input Validation & Network Safeguards
 * Prevents catastrophic operator errors like blocking loopback (127.0.0.1)
 * or internal RFC 1918 subnets which would sever local management connectivity.
 */

export interface IpValidationResult {
  isValid: boolean;
  normalized: string;
  isSafeguarded: boolean;
  safeguardType?: 'LOOPBACK' | 'RFC1918_10' | 'RFC1918_172' | 'RFC1918_192' | 'LINK_LOCAL' | 'BROADCAST';
  safeguardMessage?: string;
  error?: string;
}

export function parseIpv4ToNumber(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

export function validateIpOrCidr(rawInput: string): IpValidationResult {
  const input = rawInput.trim();
  if (!input) {
    return {
      isValid: false,
      normalized: '',
      isSafeguarded: false,
      error: 'IP address or CIDR range cannot be empty',
    };
  }

  // Check IPv6 loopback
  if (input === '::1' || input === '::' || input.toLowerCase() === 'localhost') {
    return {
      isValid: true,
      normalized: '::1',
      isSafeguarded: true,
      safeguardType: 'LOOPBACK',
      safeguardMessage: 'CRITICAL SAFEGUARD: Blocking loopback (::1 / localhost) is prohibited. Local inter-process IPC would fail.',
    };
  }

  // Parse IPv4 with optional CIDR mask
  let ipPart = input;
  let maskPart: number | null = null;

  if (input.includes('/')) {
    const tokens = input.split('/');
    if (tokens.length !== 2) {
      return { isValid: false, normalized: input, isSafeguarded: false, error: 'Invalid CIDR format' };
    }
    ipPart = tokens[0].trim();
    const mask = parseInt(tokens[1].trim(), 10);
    if (isNaN(mask) || mask < 0 || mask > 32) {
      return { isValid: false, normalized: input, isSafeguarded: false, error: 'CIDR prefix must be between /0 and /32' };
    }
    maskPart = mask;
  }

  const ipNum = parseIpv4ToNumber(ipPart);
  if (ipNum === null) {
    return {
      isValid: false,
      normalized: input,
      isSafeguarded: false,
      error: 'Malformed IPv4 address. Expected format: x.x.x.x or x.x.x.x/xx',
    };
  }

  const normalized = maskPart !== null ? `${ipPart}/${maskPart}` : ipPart;

  // Check Loopback: 127.0.0.0/8 (127.0.0.0 - 127.255.255.255)
  const loopbackStart = parseIpv4ToNumber('127.0.0.0')!;
  const loopbackEnd = parseIpv4ToNumber('127.255.255.255')!;
  if (ipNum >= loopbackStart && ipNum <= loopbackEnd) {
    return {
      isValid: true,
      normalized,
      isSafeguarded: true,
      safeguardType: 'LOOPBACK',
      safeguardMessage: 'CRITICAL SAFEGUARD: 127.0.0.0/8 loopback space is protected. Blocking localhost severs IPC & health checks.',
    };
  }

  // RFC 1918: 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
  const rfc10Start = parseIpv4ToNumber('10.0.0.0')!;
  const rfc10End = parseIpv4ToNumber('10.255.255.255')!;
  if (ipNum >= rfc10Start && ipNum <= rfc10End) {
    return {
      isValid: true,
      normalized,
      isSafeguarded: true,
      safeguardType: 'RFC1918_10',
      safeguardMessage: 'RFC1918 SAFEGUARD: 10.0.0.0/8 is reserved for private internal networks. Dropping this may sever LAN/VPC traffic.',
    };
  }

  // RFC 1918: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const rfc172Start = parseIpv4ToNumber('172.16.0.0')!;
  const rfc172End = parseIpv4ToNumber('172.31.255.255')!;
  if (ipNum >= rfc172Start && ipNum <= rfc172End) {
    return {
      isValid: true,
      normalized,
      isSafeguarded: true,
      safeguardType: 'RFC1918_172',
      safeguardMessage: 'RFC1918 SAFEGUARD: 172.16.0.0/12 is private internal space (frequently used by Docker/Kubernetes cluster bridges).',
    };
  }

  // RFC 1918: 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
  const rfc192Start = parseIpv4ToNumber('192.168.0.0')!;
  const rfc192End = parseIpv4ToNumber('192.168.255.255')!;
  if (ipNum >= rfc192Start && ipNum <= rfc192End) {
    return {
      isValid: true,
      normalized,
      isSafeguarded: true,
      safeguardType: 'RFC1918_192',
      safeguardMessage: 'RFC1918 SAFEGUARD: 192.168.0.0/16 is private home/corporate LAN space. Blocking this will isolate local gateway nodes.',
    };
  }

  // Link-Local: 169.254.0.0/16
  const linkLocalStart = parseIpv4ToNumber('169.254.0.0')!;
  const linkLocalEnd = parseIpv4ToNumber('169.254.255.255')!;
  if (ipNum >= linkLocalStart && ipNum <= linkLocalEnd) {
    return {
      isValid: true,
      normalized,
      isSafeguarded: true,
      safeguardType: 'LINK_LOCAL',
      safeguardMessage: 'LINK-LOCAL SAFEGUARD: 169.254.0.0/16 is autoconfigured link-local / cloud metadata (e.g. 169.254.169.254).',
    };
  }

  // Broadcast
  if (ipNum === 0xFFFFFFFF || ipNum === 0) {
    return {
      isValid: false,
      normalized,
      isSafeguarded: true,
      safeguardType: 'BROADCAST',
      safeguardMessage: 'Cannot target 0.0.0.0 or 255.255.255.255 broadcast addresses.',
      error: 'Invalid target address',
    };
  }

  return {
    isValid: true,
    normalized,
    isSafeguarded: false,
  };
}
