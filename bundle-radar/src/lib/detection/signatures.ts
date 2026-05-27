import { Detection, Confidence } from '@/types';

interface SignatureRule {
  name: string;
  category: Detection['category'];
  subcategory?: string;
  url?: string;
  signals: {
    globalVars?: string[];
    scriptPatterns?: RegExp[];
    domSignals?: string[];
    headerPatterns?: Record<string, RegExp>;
    metaPatterns?: { name: string; pattern: RegExp }[];
    pathPatterns?: RegExp[];
  };
  versionExtractor?: (evidence: string[]) => string | undefined;
}

/**
 * Signature database for framework/library/service detection.
 */
const SIGNATURES: SignatureRule[] = [
  // ─── Frameworks ──────────────────────────────────────────
  {
    name: 'Next.js',
    category: 'framework',
    url: 'https://nextjs.org',
    signals: {
      globalVars: ['__NEXT_DATA__'],
      scriptPatterns: [/_next\/static/, /next\/dist/, /_next\/image/],
      domSignals: ['__next', '_next'],
      pathPatterns: [/_next\//],
    },
    versionExtractor: (ev) => {
      const m = ev.join(' ').match(/Next\.js\s*([\d.]+)/i);
      return m?.[1];
    },
  },
  {
    name: 'React',
    category: 'framework',
    url: 'https://react.dev',
    signals: {
      globalVars: ['React', '__REACT_DEVTOOLS_GLOBAL_HOOK__'],
      domSignals: ['data-reactroot', 'data-react-helmet'],
      scriptPatterns: [/react\.production\.min/, /react-dom/, /react\.development/],
    },
    versionExtractor: (ev) => {
      const m = ev.join(' ').match(/react@([\d.]+)/i);
      return m?.[1];
    },
  },
  {
    name: 'Vue.js',
    category: 'framework',
    url: 'https://vuejs.org',
    signals: {
      globalVars: ['Vue', '__VUE__', '__VUE_SSR_CONTEXT__'],
      domSignals: ['data-v-', '__vue-root'],
      scriptPatterns: [/vue\.runtime/, /vue\.global/, /vue@/],
    },
  },
  {
    name: 'Nuxt',
    category: 'framework',
    url: 'https://nuxt.com',
    signals: {
      globalVars: ['__NUXT__', '__nuxt'],
      scriptPatterns: [/_nuxt\//, /nuxt\.js/],
      pathPatterns: [/_nuxt\//],
    },
  },
  {
    name: 'Angular',
    category: 'framework',
    url: 'https://angular.dev',
    signals: {
      globalVars: ['angular', 'ng'],
      domSignals: ['ng-version', 'ng-app', '_nghost', '_ngcontent'],
      scriptPatterns: [/angular\.js/, /@angular\/core/, /zone\.js/],
    },
  },
  {
    name: 'Svelte/SvelteKit',
    category: 'framework',
    url: 'https://svelte.dev',
    signals: {
      globalVars: ['__SVELTEKIT_DATA__', '__sveltekit'],
      domSignals: ['__sveltekit', 'svelte-'],
      scriptPatterns: [/svelte/, /__sveltekit/],
    },
  },
  {
    name: 'Remix',
    category: 'framework',
    url: 'https://remix.run',
    signals: {
      globalVars: ['__remixContext', '__remixManifest'],
      scriptPatterns: [/__remix/, /remix\.run/],
    },
  },
  {
    name: 'Gatsby',
    category: 'framework',
    url: 'https://www.gatsbyjs.com',
    signals: {
      globalVars: ['___gatsby', '__GATSBY'],
      metaPatterns: [{ name: 'generator', pattern: /gatsby/i }],
      scriptPatterns: [/gatsby-/, /page-data\.json/],
    },
  },
  {
    name: 'Astro',
    category: 'framework',
    url: 'https://astro.build',
    signals: {
      metaPatterns: [{ name: 'generator', pattern: /astro/i }],
      domSignals: ['astro-island', 'astro-slot'],
      scriptPatterns: [/astro\//],
    },
  },
  {
    name: 'jQuery',
    category: 'framework',
    url: 'https://jquery.com',
    signals: {
      globalVars: ['jQuery', '$'],
      scriptPatterns: [/jquery[.-]/, /jquery\.min\.js/],
    },
  },

  // ─── UI Libraries ────────────────────────────────────────
  {
    name: 'Tailwind CSS',
    category: 'ui-library',
    url: 'https://tailwindcss.com',
    signals: {
      domSignals: ['class="flex', 'class="grid', 'class="bg-', 'class="text-', 'class="px-', 'class="py-'],
      scriptPatterns: [/tailwind/],
    },
  },
  {
    name: 'Material UI',
    category: 'ui-library',
    url: 'https://mui.com',
    signals: {
      domSignals: ['MuiBox', 'MuiButton', 'MuiTypography', 'css-'],
      scriptPatterns: [/@mui\//, /material-ui/],
    },
  },
  {
    name: 'Chakra UI',
    category: 'ui-library',
    url: 'https://chakra-ui.com',
    signals: {
      domSignals: ['chakra-', 'css-'],
      scriptPatterns: [/@chakra-ui/],
    },
  },
  {
    name: 'Radix UI',
    category: 'ui-library',
    url: 'https://www.radix-ui.com',
    signals: {
      domSignals: ['radix-'],
      scriptPatterns: [/@radix-ui/],
    },
  },
  {
    name: 'shadcn/ui',
    category: 'ui-library',
    url: 'https://ui.shadcn.com',
    signals: {
      domSignals: ['data-state=', 'data-orientation='],
      scriptPatterns: [/@radix-ui.*@radix-ui/], // Multiple radix deps = likely shadcn
    },
  },

  // ─── Build Tools ─────────────────────────────────────────
  {
    name: 'Webpack',
    category: 'build-tool',
    url: 'https://webpack.js.org',
    signals: {
      globalVars: ['webpackChunk', '__webpack_modules__', 'webpackJsonp'],
      scriptPatterns: [/webpack/, /chunk\.\w+\.js/],
    },
  },
  {
    name: 'Vite',
    category: 'build-tool',
    url: 'https://vitejs.dev',
    signals: {
      globalVars: ['__vite__'],
      scriptPatterns: [/@vite/, /vite\//, /import\.meta\.hot/],
    },
  },
  {
    name: 'Turbopack',
    category: 'build-tool',
    signals: {
      scriptPatterns: [/turbopack/, /__turbopack/],
    },
  },

  // ─── State Management ────────────────────────────────────
  {
    name: 'Redux',
    category: 'state-management',
    url: 'https://redux.js.org',
    signals: {
      globalVars: ['__REDUX_DEVTOOLS_EXTENSION__', '__REDUX_STATE__'],
      scriptPatterns: [/redux/, /createStore/, /configureStore/],
    },
  },
  {
    name: 'Apollo Client (GraphQL)',
    category: 'state-management',
    subcategory: 'GraphQL',
    url: 'https://www.apollographql.com',
    signals: {
      globalVars: ['__APOLLO_STATE__', '__APOLLO_CLIENT__'],
      scriptPatterns: [/@apollo\/client/, /apollo-client/],
    },
  },
  {
    name: 'Relay (GraphQL)',
    category: 'state-management',
    subcategory: 'GraphQL',
    signals: {
      globalVars: ['__RELAY_STORE__'],
      scriptPatterns: [/relay-runtime/, /react-relay/],
    },
  },
  {
    name: 'Zustand',
    category: 'state-management',
    url: 'https://zustand-demo.pmnd.rs',
    signals: {
      scriptPatterns: [/zustand/],
    },
  },

  // ─── Analytics ───────────────────────────────────────────
  {
    name: 'Google Analytics (GA4)',
    category: 'analytics',
    signals: {
      globalVars: ['gtag', 'dataLayer'],
      scriptPatterns: [/googletagmanager\.com/, /gtag\/js/, /analytics\.js/, /ga\.js/],
    },
  },
  {
    name: 'Segment',
    category: 'analytics',
    url: 'https://segment.com',
    signals: {
      globalVars: ['analytics'],
      scriptPatterns: [/cdn\.segment\.com/, /analytics\.js/],
    },
  },
  {
    name: 'Mixpanel',
    category: 'analytics',
    signals: {
      globalVars: ['mixpanel'],
      scriptPatterns: [/cdn\.mxpnl\.com/, /mixpanel/],
    },
  },
  {
    name: 'Amplitude',
    category: 'analytics',
    signals: {
      globalVars: ['amplitude'],
      scriptPatterns: [/cdn\.amplitude\.com/, /amplitude/],
    },
  },
  {
    name: 'PostHog',
    category: 'analytics',
    url: 'https://posthog.com',
    signals: {
      globalVars: ['posthog'],
      scriptPatterns: [/posthog/, /us\.i\.posthog\.com/, /eu\.i\.posthog\.com/],
    },
  },
  {
    name: 'Heap',
    category: 'analytics',
    signals: {
      globalVars: ['heap'],
      scriptPatterns: [/heap-/, /heapanalytics\.com/],
    },
  },
  {
    name: 'Plausible',
    category: 'analytics',
    url: 'https://plausible.io',
    signals: {
      globalVars: ['plausible'],
      scriptPatterns: [/plausible\.io\/js/],
    },
  },
  {
    name: 'Facebook Pixel',
    category: 'analytics',
    signals: {
      globalVars: ['fbq'],
      scriptPatterns: [/connect\.facebook\.net\/.*\/fbevents/],
    },
  },
  {
    name: 'Hotjar',
    category: 'analytics',
    signals: {
      globalVars: ['hj', 'hjSiteSettings'],
      scriptPatterns: [/hotjar\.com/, /static\.hotjar/],
    },
  },

  // ─── Monitoring & Observability ──────────────────────────
  {
    name: 'Sentry',
    category: 'monitoring',
    url: 'https://sentry.io',
    signals: {
      globalVars: ['__SENTRY__', 'Sentry'],
      scriptPatterns: [/sentry/, /browser\.sentry-cdn/, /@sentry\//],
    },
  },
  {
    name: 'Datadog RUM',
    category: 'monitoring',
    url: 'https://datadoghq.com',
    signals: {
      globalVars: ['DD_RUM', 'DD_LOGS'],
      scriptPatterns: [/datadog/, /dd-rum/, /datadoghq\.com/],
    },
  },
  {
    name: 'LogRocket',
    category: 'monitoring',
    url: 'https://logrocket.com',
    signals: {
      globalVars: ['LogRocket', '_lr_'],
      scriptPatterns: [/logrocket/, /cdn\.logrocket/],
    },
  },
  {
    name: 'FullStory',
    category: 'monitoring',
    signals: {
      globalVars: ['FS', '_fs_org'],
      scriptPatterns: [/fullstory\.com/, /fs\.js/],
    },
  },
  {
    name: 'New Relic',
    category: 'monitoring',
    signals: {
      globalVars: ['NREUM', 'newrelic'],
      scriptPatterns: [/newrelic/, /nr-data\.net/],
    },
  },

  // ─── Feature Flags ───────────────────────────────────────
  {
    name: 'LaunchDarkly',
    category: 'feature-flags',
    url: 'https://launchdarkly.com',
    signals: {
      globalVars: ['LaunchDarkly', 'ldclient'],
      scriptPatterns: [/launchdarkly/, /ld-client-sdk/, /app\.launchdarkly/],
    },
  },
  {
    name: 'Statsig',
    category: 'feature-flags',
    url: 'https://statsig.com',
    signals: {
      globalVars: ['statsig'],
      scriptPatterns: [/statsig/, /statsigapi/],
    },
  },
  {
    name: 'Split.io',
    category: 'feature-flags',
    signals: {
      globalVars: ['split'],
      scriptPatterns: [/split\.io/, /splitio/],
    },
  },
  {
    name: 'Optimizely',
    category: 'feature-flags',
    signals: {
      globalVars: ['optimizely'],
      scriptPatterns: [/optimizely\.com/, /cdn-pci\.optimizely/],
    },
  },

  // ─── Auth ────────────────────────────────────────────────
  {
    name: 'Auth0',
    category: 'auth',
    url: 'https://auth0.com',
    signals: {
      globalVars: ['auth0'],
      scriptPatterns: [/auth0/, /cdn\.auth0\.com/],
    },
  },
  {
    name: 'Clerk',
    category: 'auth',
    url: 'https://clerk.com',
    signals: {
      globalVars: ['clerk', 'Clerk'],
      scriptPatterns: [/clerk\.com/, /@clerk\//],
    },
  },
  {
    name: 'Firebase Auth',
    category: 'auth',
    signals: {
      globalVars: ['firebase'],
      scriptPatterns: [/firebase/, /firebaseapp\.com/, /__firebase/],
    },
  },
  {
    name: 'Supabase',
    category: 'auth',
    url: 'https://supabase.com',
    signals: {
      globalVars: ['supabase'],
      scriptPatterns: [/supabase/, /supabase\.co/],
    },
  },

  // ─── Payments ────────────────────────────────────────────
  {
    name: 'Stripe',
    category: 'payment',
    url: 'https://stripe.com',
    signals: {
      globalVars: ['Stripe'],
      scriptPatterns: [/js\.stripe\.com/, /stripe\.js/],
    },
  },
  {
    name: 'PayPal',
    category: 'payment',
    signals: {
      globalVars: ['paypal', 'PayPal'],
      scriptPatterns: [/paypal\.com\/sdk/, /paypalobjects/],
    },
  },

  // ─── CDN / Hosting ───────────────────────────────────────
  {
    name: 'Vercel',
    category: 'cdn-hosting',
    url: 'https://vercel.com',
    signals: {
      headerPatterns: { 'x-vercel-id': /.*/ },
      scriptPatterns: [/vercel-insights/, /vercel-analytics/, /_vercel\//],
      pathPatterns: [/_next\/static/],
    },
  },
  {
    name: 'Netlify',
    category: 'cdn-hosting',
    url: 'https://netlify.com',
    signals: {
      headerPatterns: { 'x-nf-request-id': /.*/ },
      scriptPatterns: [/netlify/, /netlify-identity/],
    },
  },
  {
    name: 'Cloudflare',
    category: 'cdn-hosting',
    url: 'https://cloudflare.com',
    signals: {
      headerPatterns: { 'cf-ray': /.*/ },
      scriptPatterns: [/cloudflare/, /cdnjs\.cloudflare/],
    },
  },
  {
    name: 'AWS CloudFront',
    category: 'cdn-hosting',
    signals: {
      headerPatterns: { 'x-amz-cf-id': /.*/, 'x-amz-cf-pop': /.*/ },
    },
  },
  {
    name: 'Shopify',
    category: 'cdn-hosting',
    signals: {
      globalVars: ['Shopify'],
      scriptPatterns: [/shopify\.com/, /cdn\.shopify/],
    },
  },
  {
    name: 'Webflow',
    category: 'cms',
    url: 'https://webflow.com',
    signals: {
      metaPatterns: [{ name: 'generator', pattern: /webflow/i }],
      scriptPatterns: [/webflow\.js/, /assets\.website-files\.com/],
    },
  },
  {
    name: 'WordPress',
    category: 'cms',
    signals: {
      metaPatterns: [{ name: 'generator', pattern: /wordpress/i }],
      scriptPatterns: [/wp-content/, /wp-includes/, /wp-json/],
    },
  },

  // ─── Chat / Support ──────────────────────────────────────
  {
    name: 'Intercom',
    category: 'third-party',
    subcategory: 'Chat',
    signals: {
      globalVars: ['Intercom'],
      scriptPatterns: [/intercom/, /widget\.intercom\.io/],
    },
  },
  {
    name: 'Drift',
    category: 'third-party',
    subcategory: 'Chat',
    signals: {
      globalVars: ['drift'],
      scriptPatterns: [/drift\.com/, /js\.driftt\.com/],
    },
  },
  {
    name: 'Crisp',
    category: 'third-party',
    subcategory: 'Chat',
    signals: {
      globalVars: ['$crisp', 'CRISP_WEBSITE_ID'],
      scriptPatterns: [/client\.crisp\.chat/],
    },
  },
  {
    name: 'HubSpot',
    category: 'third-party',
    subcategory: 'Marketing',
    signals: {
      globalVars: ['HubSpotConversations', '_hsq'],
      scriptPatterns: [/hubspot\.com/, /js\.hs-scripts/, /hs-banner/],
    },
  },
  {
    name: 'Zendesk',
    category: 'third-party',
    subcategory: 'Support',
    signals: {
      globalVars: ['zE', 'zESettings'],
      scriptPatterns: [/zendesk/, /zdassets\.com/],
    },
  },
];

// ─── Detection Engine ──────────────────────────────────────────

export function runDetection(rawData: {
  globalVariables: string[];
  scripts: { src: string }[];
  domSignals: string[];
  metaTags: { name: string; content: string }[];
  responseHeaders: Record<string, string>;
  allPaths: string[];
  inlineScriptSnippets: string[];
}): Detection[] {
  const detections: Detection[] = [];
  const allScriptSrcs = rawData.scripts.map(s => s.src).filter(Boolean);
  const allText = [
    ...allScriptSrcs,
    ...rawData.inlineScriptSnippets,
    ...rawData.allPaths,
  ].join(' ');

  for (const sig of SIGNATURES) {
    const evidence: string[] = [];
    let matchCount = 0;

    // Check global variables
    if (sig.signals.globalVars) {
      for (const gv of sig.signals.globalVars) {
        if (rawData.globalVariables.includes(gv)) {
          evidence.push(`Global: window.${gv}`);
          matchCount += 2; // Strong signal
        }
      }
    }

    // Check script patterns
    if (sig.signals.scriptPatterns) {
      for (const pat of sig.signals.scriptPatterns) {
        if (pat.test(allText)) {
          const match = allText.match(pat);
          evidence.push(`Script: ${match?.[0]?.slice(0, 60)}`);
          matchCount += 1;
        }
      }
    }

    // Check DOM signals
    if (sig.signals.domSignals) {
      for (const ds of sig.signals.domSignals) {
        if (rawData.domSignals.some(d => d.includes(ds))) {
          evidence.push(`DOM: ${ds}`);
          matchCount += 1;
        }
      }
    }

    // Check meta patterns
    if (sig.signals.metaPatterns) {
      for (const mp of sig.signals.metaPatterns) {
        const meta = rawData.metaTags.find(m => m.name === mp.name && mp.pattern.test(m.content));
        if (meta) {
          evidence.push(`Meta: ${meta.name}="${meta.content}"`);
          matchCount += 2;
        }
      }
    }

    // Check header patterns
    if (sig.signals.headerPatterns) {
      for (const [header, pattern] of Object.entries(sig.signals.headerPatterns)) {
        const val = rawData.responseHeaders[header];
        if (val && pattern.test(val)) {
          evidence.push(`Header: ${header}: ${val.slice(0, 40)}`);
          matchCount += 2;
        }
      }
    }

    // Check path patterns
    if (sig.signals.pathPatterns) {
      for (const pat of sig.signals.pathPatterns) {
        if (rawData.allPaths.some(p => pat.test(p))) {
          evidence.push(`Path: ${rawData.allPaths.find(p => pat.test(p))?.slice(0, 60)}`);
          matchCount += 1;
        }
      }
    }

    // Determine confidence and add detection
    if (matchCount > 0) {
      let confidence: Confidence = 'low';
      if (matchCount >= 3) confidence = 'high';
      else if (matchCount >= 2) confidence = 'medium';

      const version = sig.versionExtractor?.(evidence);

      detections.push({
        name: sig.name,
        version,
        confidence,
        evidence: evidence.join(' | '),
        category: sig.category,
        subcategory: sig.subcategory,
        url: sig.url,
      });
    }
  }

  return detections;
}
