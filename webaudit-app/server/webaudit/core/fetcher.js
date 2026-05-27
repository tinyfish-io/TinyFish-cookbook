'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');
const tls = require('tls');

/**
 * Fetcher — performs raw HTTP/HTTPS requests to collect headers,
 * TLS/SSL certificate details, and redirect chains independently
 * of the browser session.
 */
class Fetcher {
  /**
   * Fetch HTTP response headers and status for a given URL.
   * @param {string} url
   * @returns {Promise<{headers: object, statusCode: number, redirects: string[]}>}
   */
  static async fetchHeaders(url) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const redirects = [];

      const makeRequest = (currentUrl, depth = 0) => {
        if (depth > 10) return reject(new Error('Too many redirects'));
        const u = new URL(currentUrl);
        const options = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          method: 'HEAD',
          headers: { 'User-Agent': 'WebAudit/1.0' },
          rejectUnauthorized: false,
          timeout: 15000,
        };
        const reqLib = u.protocol === 'https:' ? https : http;
        const req = reqLib.request(options, (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            redirects.push({ from: currentUrl, to: res.headers.location, status: res.statusCode });
            const nextUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : `${u.protocol}//${u.host}${res.headers.location}`;
            makeRequest(nextUrl, depth + 1);
          } else {
            resolve({ headers: res.headers, statusCode: res.statusCode, redirects, finalUrl: currentUrl });
          }
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.end();
      };

      makeRequest(url);
    });
  }

  /**
   * Retrieve TLS/SSL certificate information for a given hostname.
   * @param {string} url
   * @returns {Promise<object>}
   */
  static async fetchTLSInfo(url) {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
          return resolve({ supported: false, reason: 'Not HTTPS' });
        }
        const port = parseInt(parsed.port) || 443;
        const socket = tls.connect(
          { host: parsed.hostname, port, servername: parsed.hostname, rejectUnauthorized: false, timeout: 10000 },
          () => {
            const cert = socket.getPeerCertificate(true);
            const protocol = socket.getProtocol();
            const cipher = socket.getCipher();
            socket.end();
            if (!cert || !cert.subject) {
              return resolve({ supported: true, valid: false, reason: 'No certificate returned' });
            }
            const now = Date.now();
            const validFrom = new Date(cert.valid_from);
            const validTo = new Date(cert.valid_to);
            const daysRemaining = Math.floor((validTo - now) / 86400000);
            resolve({
              supported: true,
              valid: socket.authorized,
              authorizationError: socket.authorizationError || null,
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysRemaining,
              expired: daysRemaining < 0,
              expiringSoon: daysRemaining >= 0 && daysRemaining < 30,
              serialNumber: cert.serialNumber,
              fingerprint: cert.fingerprint,
              protocol,
              cipher: cipher ? cipher.name : null,
              cipherBits: cipher ? cipher.secretKeySize : null,
              subjectAltNames: cert.subjectaltname || null,
            });
          }
        );
        socket.on('error', (err) => resolve({ supported: false, reason: err.message }));
        socket.on('timeout', () => { socket.destroy(); resolve({ supported: false, reason: 'TLS timeout' }); });
      } catch (err) {
        resolve({ supported: false, reason: err.message });
      }
    });
  }

  /**
   * Fetch robots.txt for the given URL's origin.
   * @param {string} url
   * @returns {Promise<{found: boolean, content: string}>}
   */
  static async fetchRobotsTxt(url) {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
        const lib = parsed.protocol === 'https:' ? https : http;
        lib.get(robotsUrl, { rejectUnauthorized: false, timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ found: res.statusCode === 200, content: data, statusCode: res.statusCode }));
        }).on('error', () => resolve({ found: false, content: '', statusCode: 0 }));
      } catch {
        resolve({ found: false, content: '', statusCode: 0 });
      }
    });
  }

  /**
   * Fetch sitemap.xml for the given URL's origin.
   * @param {string} url
   * @returns {Promise<{found: boolean, content: string}>}
   */
  static async fetchSitemap(url) {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const sitemapUrl = `${parsed.protocol}//${parsed.host}/sitemap.xml`;
        const lib = parsed.protocol === 'https:' ? https : http;
        lib.get(sitemapUrl, { rejectUnauthorized: false, timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ found: res.statusCode === 200, content: data.substring(0, 2000), statusCode: res.statusCode }));
        }).on('error', () => resolve({ found: false, content: '', statusCode: 0 }));
      } catch {
        resolve({ found: false, content: '', statusCode: 0 });
      }
    });
  }
}


module.exports = Fetcher;
