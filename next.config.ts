import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * The Content-Security-Policy is the significant one: it stops a stored value
 * that somehow reaches the page as markup from loading or exfiltrating
 * anything. `frame-ancestors 'none'` also prevents a verification page being
 * framed inside a site that then claims the result as its own.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required
      // for them, and is ignored by browsers that honour the nonce/hash form.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Wallets talk to RPC endpoints over https and wss.
      "connect-src 'self' https: wss:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version.
  poweredByHeader: false,

  // Trailing-slash redirects and the like should not leak the origin path.
  reactStrictMode: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
