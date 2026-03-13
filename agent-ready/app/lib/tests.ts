/**
 * AgentReady Test Suites
 *
 * Each test defines:
 * - name/description for display
 * - TinyFish goal prompt
 * - scoring function to convert raw results to 0-100 subscore
 * - fix recommendations based on failures
 */

export interface TestDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  weight: number; // Weight in final score (all weights sum to 1.0)
  buildGoal: (url: string) => string;
  score: (data: Record<string, unknown>) => TestResult;
}

export interface TestResult {
  subscore: number; // 0-100
  passed: string[];
  failed: string[];
  issues: string[];
  fixes: string[];
}

export interface AuditResult {
  url: string;
  domain: string;
  score: number;
  grade: string;
  gradeColor: string;
  tests: Record<string, TestResult & { name: string; description: string; icon: string }>;
  topFixes: string[];
  timestamp: string;
}

// Helper: safely extract a boolean from raw agent data
function getBool(data: Record<string, unknown>, key: string): boolean {
  const val = data[key];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true" || val === "yes";
  return false;
}

function getNumber(data: Record<string, unknown>, key: string): number {
  const val = data[key];
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseInt(val, 10) || 0;
  return 0;
}

function getStringArray(data: Record<string, unknown>, key: string): string[] {
  const val = data[key];
  if (Array.isArray(val)) return val.map(String);
  return [];
}

// =============================================================================
// TEST 1: DISCOVERY — Can an agent find products on this site?
// =============================================================================

const discoveryTest: TestDefinition = {
  id: "discovery",
  name: "Product Discovery",
  description: "Can an AI agent find products through search and navigation?",
  icon: "🔍",
  weight: 0.25,

  buildGoal: (url: string) => `
Navigate to ${url}. You are testing whether an AI shopping agent can discover products on this e-commerce site.

Do the following:
1. Look for a search bar. If found, try searching for a generic term like "shirt" or "product" or whatever seems appropriate for this store.
2. Look for category navigation (menus, sidebars, category links).
3. Check if product listing pages show products with visible names and prices.
4. Check if there are filter/sort options on listing pages.

Return your findings as JSON only, no other text:
{
  "search_bar_found": true/false,
  "search_functional": true/false,
  "categories_navigable": true/false,
  "products_visible": true/false,
  "product_count_on_page": number,
  "filters_available": true/false,
  "prices_visible_in_listing": true/false,
  "issues": ["list any problems encountered"]
}`,

  score: (data) => {
    const passed: string[] = [];
    const failed: string[] = [];
    const fixes: string[] = [];
    let points = 0;

    if (getBool(data, "search_bar_found")) {
      passed.push("Search bar found");
      points += 15;
    } else {
      failed.push("No search bar found");
      fixes.push("Add a prominent search bar — AI agents rely on search to find products quickly.");
    }

    if (getBool(data, "search_functional")) {
      passed.push("Search returns results");
      points += 20;
    } else if (getBool(data, "search_bar_found")) {
      failed.push("Search bar found but not functional");
      fixes.push("Ensure search returns relevant results and doesn't require JavaScript that agents can't execute.");
    }

    if (getBool(data, "categories_navigable")) {
      passed.push("Category navigation works");
      points += 20;
    } else {
      failed.push("Category navigation not accessible");
      fixes.push("Use semantic HTML for navigation menus. AI agents need clear category links, not JavaScript-only dropdowns.");
    }

    if (getBool(data, "products_visible")) {
      passed.push("Products displayed on listing pages");
      points += 20;
    } else {
      failed.push("Products not visible on listing pages");
      fixes.push("Ensure product grids render in HTML, not purely via client-side JavaScript after page load.");
    }

    if (getBool(data, "filters_available")) {
      passed.push("Filter/sort options available");
      points += 10;
    } else {
      failed.push("No product filters available");
      fixes.push("Add filter and sort controls that work with standard form elements.");
    }

    if (getBool(data, "prices_visible_in_listing")) {
      passed.push("Prices visible in product listings");
      points += 15;
    } else {
      failed.push("Prices not visible in listings");
      fixes.push("Display prices in product listing cards — agents need to compare prices without clicking into every product.");
    }

    return {
      subscore: Math.min(points, 100),
      passed,
      failed,
      issues: getStringArray(data, "issues"),
      fixes,
    };
  },
};

// =============================================================================
// TEST 2: PRODUCT UNDERSTANDING — Can an agent extract product info?
// =============================================================================

const productTest: TestDefinition = {
  id: "product",
  name: "Product Understanding",
  description: "Can an AI agent extract product details like price, variants, and availability?",
  icon: "📦",
  weight: 0.25,

  buildGoal: (url: string) => `
Navigate to ${url} and find a product page (click on any product from the main page or a category page).

Once on a product detail page, extract all available product information.

Return your findings as JSON only, no other text:
{
  "reached_product_page": true/false,
  "product_name": "name or null",
  "price_found": true/false,
  "price_value": "price string or null",
  "has_variants": true/false,
  "variant_types": ["e.g. Size, Color"],
  "availability_clear": true/false,
  "availability_text": "e.g. In Stock, or null",
  "description_found": true/false,
  "description_length": number,
  "images_count": number,
  "reviews_visible": true/false,
  "rating_found": true/false,
  "rating_value": "e.g. 4.5/5 or null",
  "issues": ["list any problems encountered"]
}`,

  score: (data) => {
    const passed: string[] = [];
    const failed: string[] = [];
    const fixes: string[] = [];
    let points = 0;

    if (!getBool(data, "reached_product_page")) {
      return {
        subscore: 0,
        passed: [],
        failed: ["Could not reach a product page"],
        issues: getStringArray(data, "issues"),
        fixes: ["Ensure product links on listing pages are standard <a> tags, not JavaScript-only click handlers."],
      };
    }

    passed.push("Product page accessible");
    points += 5;

    if (getBool(data, "price_found")) {
      passed.push("Price extractable");
      points += 25;
    } else {
      failed.push("Price not extractable");
      fixes.push("Render prices in HTML text, not as images or purely JS-calculated values. Use schema.org/Product markup with price.");
    }

    if (getBool(data, "has_variants") && (data["variant_types"] as string[] || []).length > 0) {
      passed.push("Variants detected and typed");
      points += 15;
    } else if (!getBool(data, "has_variants")) {
      passed.push("No variants needed (single-variant product)");
      points += 15;
    } else {
      failed.push("Variants exist but types not extractable");
      fixes.push("Label variant selectors clearly (e.g., 'Size:', 'Color:') and use standard <select> or <input> elements.");
    }

    if (getBool(data, "availability_clear")) {
      passed.push("Stock availability clear");
      points += 15;
    } else {
      failed.push("Stock availability not clear");
      fixes.push("Display availability status ('In Stock', 'Out of Stock') in visible text, not just via color coding.");
    }

    if (getBool(data, "description_found")) {
      passed.push("Product description found");
      points += 10;
      if (getNumber(data, "description_length") > 50) {
        points += 5;
      }
    } else {
      failed.push("No product description found");
      fixes.push("Include a text product description that AI agents can parse for product understanding.");
    }

    if (getNumber(data, "images_count") > 0) {
      passed.push(`${getNumber(data, "images_count")} product images found`);
      points += 10;
    } else {
      failed.push("No product images found");
      fixes.push("Add alt text to all product images so AI agents can understand what they show.");
    }

    if (getBool(data, "reviews_visible")) {
      passed.push("Customer reviews visible");
      points += 10;
    }

    if (getBool(data, "rating_found")) {
      passed.push("Rating extractable");
      points += 5;
    }

    return {
      subscore: Math.min(points, 100),
      passed,
      failed,
      issues: getStringArray(data, "issues"),
      fixes,
    };
  },
};

// =============================================================================
// TEST 3: INTERACTION — Can an agent add items to cart?
// =============================================================================

const interactionTest: TestDefinition = {
  id: "interaction",
  name: "Cart Interaction",
  description: "Can an AI agent select product options and add items to cart?",
  icon: "🛒",
  weight: 0.25,

  buildGoal: (url: string) => `
Navigate to ${url} and find a product page. Once there:

1. If there are variant options (size, color, etc.), try to select the first available option for each variant type.
2. Find and click the "Add to Cart" or "Add to Bag" or similar button.
3. Observe what happens after clicking — does the cart update? Does a modal appear? Does it redirect?

IMPORTANT: Do NOT proceed to checkout or enter any payment or personal information.

Return your findings as JSON only, no other text:
{
  "reached_product_page": true/false,
  "variants_present": true/false,
  "variant_selectable": true/false,
  "variant_selection_method": "dropdown/buttons/swatches/other/none",
  "add_to_cart_found": true/false,
  "add_to_cart_clickable": true/false,
  "cart_updated_after_click": true/false,
  "popup_appeared": true/false,
  "popup_type": "upsell/cart_preview/size_guide/cookie/login/none",
  "popup_blocked_flow": true/false,
  "error_message_shown": true/false,
  "error_text": "text or null",
  "issues": ["list any problems encountered"]
}`,

  score: (data) => {
    const passed: string[] = [];
    const failed: string[] = [];
    const fixes: string[] = [];
    let points = 0;

    if (!getBool(data, "reached_product_page")) {
      return {
        subscore: 0,
        passed: [],
        failed: ["Could not reach a product page for interaction testing"],
        issues: getStringArray(data, "issues"),
        fixes: ["Ensure product pages are accessible via standard navigation."],
      };
    }

    if (getBool(data, "variants_present")) {
      if (getBool(data, "variant_selectable")) {
        passed.push("Variant options selectable");
        points += 30;
      } else {
        failed.push("Variant options present but not selectable");
        const method = (data["variant_selection_method"] as string) || "unknown";
        fixes.push(
          `Variant selector (${method}) not interactive for AI agents. Use standard <select> dropdowns or <button> elements with aria labels instead of custom JavaScript-only components.`
        );
      }
    } else {
      passed.push("No variant selection needed");
      points += 30;
    }

    if (getBool(data, "add_to_cart_found")) {
      passed.push("Add to Cart button found");
      points += 10;

      if (getBool(data, "add_to_cart_clickable")) {
        passed.push("Add to Cart button clickable");
        points += 25;
      } else {
        failed.push("Add to Cart button found but not clickable");
        fixes.push("Ensure the Add to Cart button is a standard <button> element, not a styled <div> with JavaScript click handlers.");
      }
    } else {
      failed.push("Add to Cart button not found");
      fixes.push("Use clear, labeled Add to Cart buttons. Avoid icon-only buttons without text or aria-label.");
    }

    if (getBool(data, "cart_updated_after_click")) {
      passed.push("Cart successfully updated");
      points += 25;
    } else if (getBool(data, "add_to_cart_clickable")) {
      failed.push("Cart did not update after clicking Add to Cart");
      fixes.push("Provide visible cart feedback (count update, confirmation message) that agents can verify the action succeeded.");
    }

    if (getBool(data, "popup_appeared") && getBool(data, "popup_blocked_flow")) {
      const popupType = (data["popup_type"] as string) || "unknown";
      failed.push(`${popupType} popup blocked the shopping flow`);
      points -= 10;
      fixes.push(`A ${popupType} popup interrupted the Add to Cart flow. Ensure popups have clear close buttons and don't prevent cart updates.`);
    } else if (getBool(data, "popup_appeared") && !getBool(data, "popup_blocked_flow")) {
      passed.push("Popup appeared but did not block flow");
      points += 5;
    } else {
      points += 5;
    }

    if (getBool(data, "error_message_shown")) {
      const errorText = (data["error_text"] as string) || "Unknown error";
      failed.push(`Error shown: ${errorText}`);
      points -= 5;
    }

    return {
      subscore: Math.max(0, Math.min(points, 100)),
      passed,
      failed,
      issues: getStringArray(data, "issues"),
      fixes,
    };
  },
};

// =============================================================================
// TEST 4: CHECKOUT NAVIGATION — Can an agent reach checkout?
// =============================================================================

const checkoutTest: TestDefinition = {
  id: "checkout",
  name: "Checkout Navigation",
  description: "Can an AI agent navigate from cart to the checkout page?",
  icon: "💳",
  weight: 0.15,

  buildGoal: (url: string) => `
Navigate to ${url}. Find a product, add it to cart, then try to navigate to the checkout page.

IMPORTANT: Do NOT enter any payment information, personal information, or complete any purchase. Just try to reach the checkout form.

Check for:
1. Can you find and access the cart page?
2. From the cart, can you find a "Checkout" or "Proceed to Checkout" button?
3. Does it require login/account creation to proceed?
4. Is guest checkout available?
5. How many steps/pages does it take to get from cart to the checkout form?
6. Are there any CAPTCHAs or verification steps?

Return your findings as JSON only, no other text:
{
  "cart_accessible": true/false,
  "cart_shows_items": true/false,
  "checkout_button_found": true/false,
  "checkout_page_reached": true/false,
  "login_required": true/false,
  "guest_checkout_available": true/false,
  "steps_to_checkout": number,
  "captcha_present": true/false,
  "distracting_upsells": true/false,
  "issues": ["list any problems encountered"]
}`,

  score: (data) => {
    const passed: string[] = [];
    const failed: string[] = [];
    const fixes: string[] = [];
    let points = 0;

    if (getBool(data, "cart_accessible")) {
      passed.push("Cart page accessible");
      points += 15;
    } else {
      failed.push("Cart page not accessible");
      fixes.push("Make the cart page accessible via a standard link/URL, not just a JavaScript sidebar widget.");
    }

    if (getBool(data, "cart_shows_items")) {
      passed.push("Cart displays items");
      points += 10;
    }

    if (getBool(data, "checkout_button_found")) {
      passed.push("Checkout button found");
      points += 10;
    } else {
      failed.push("No checkout button found");
      fixes.push("Add a clearly labeled 'Checkout' or 'Proceed to Checkout' button in the cart.");
    }

    if (getBool(data, "checkout_page_reached")) {
      passed.push("Checkout page reachable");
      points += 25;
    } else {
      failed.push("Could not reach checkout page");
      fixes.push("Ensure the checkout flow is reachable without requiring human-only interaction (e.g., drag-to-verify, visual puzzles).");
    }

    if (getBool(data, "guest_checkout_available")) {
      passed.push("Guest checkout available");
      points += 20;
    } else if (getBool(data, "login_required")) {
      failed.push("Login required — no guest checkout");
      fixes.push("Enable guest checkout. AI agents cannot create accounts — login walls completely block agent purchases.");
    }

    const steps = getNumber(data, "steps_to_checkout");
    if (steps > 0 && steps <= 2) {
      passed.push(`Checkout reached in ${steps} step(s)`);
      points += 15;
    } else if (steps > 2) {
      failed.push(`Checkout requires ${steps} steps`);
      points += 5;
      fixes.push(`Reduce checkout steps from ${steps} to 1-2. Each extra step is a point where an AI agent can fail.`);
    }

    if (getBool(data, "captcha_present")) {
      failed.push("CAPTCHA blocks checkout");
      points -= 10;
      fixes.push("CAPTCHAs completely block AI agents. Consider alternative fraud prevention that doesn't require visual puzzles.");
    } else {
      points += 5;
    }

    return {
      subscore: Math.max(0, Math.min(points, 100)),
      passed,
      failed,
      issues: getStringArray(data, "issues"),
      fixes,
    };
  },
};

// =============================================================================
// TEST 5: POLICY EXTRACTION — Can an agent find store policies?
// =============================================================================

const policyTest: TestDefinition = {
  id: "policies",
  name: "Policy Extraction",
  description: "Can an AI agent find return, shipping, and warranty policies?",
  icon: "📋",
  weight: 0.10,

  buildGoal: (url: string) => `
Navigate to ${url} and find the store's policies. Check the footer links, help/FAQ pages, or dedicated policy pages.

Look for:
1. Return/refund policy
2. Shipping information (costs, delivery times, free shipping threshold)
3. Warranty or guarantee information

Return your findings as JSON only, no other text:
{
  "return_policy_found": true/false,
  "return_policy_url": "url or null",
  "return_summary": "brief summary or null",
  "shipping_info_found": true/false,
  "shipping_summary": "brief summary or null",
  "free_shipping_mentioned": true/false,
  "warranty_found": true/false,
  "warranty_summary": "brief summary or null",
  "policies_easily_accessible": true/false,
  "issues": ["list any problems encountered"]
}`,

  score: (data) => {
    const passed: string[] = [];
    const failed: string[] = [];
    const fixes: string[] = [];
    let points = 0;

    if (getBool(data, "return_policy_found")) {
      passed.push("Return policy found");
      points += 35;
    } else {
      failed.push("Return policy not found");
      fixes.push("Add a clearly linked return policy page. AI agents need to communicate return terms to shoppers before purchase.");
    }

    if (getBool(data, "shipping_info_found")) {
      passed.push("Shipping information found");
      points += 30;
    } else {
      failed.push("Shipping information not found");
      fixes.push("Add a shipping info page with costs and delivery times. Link it from the footer and product pages.");
    }

    if (getBool(data, "free_shipping_mentioned")) {
      passed.push("Free shipping threshold mentioned");
      points += 5;
    }

    if (getBool(data, "warranty_found")) {
      passed.push("Warranty/guarantee information found");
      points += 20;
    } else {
      failed.push("No warranty information found");
      fixes.push("Add warranty or satisfaction guarantee information — this builds agent confidence in recommending your products.");
    }

    if (getBool(data, "policies_easily_accessible")) {
      passed.push("Policies easily accessible from main navigation/footer");
      points += 10;
    } else {
      failed.push("Policies hard to find");
      fixes.push("Link all policies from your site footer. AI agents check footer links first for policy information.");
    }

    return {
      subscore: Math.min(points, 100),
      passed,
      failed,
      issues: getStringArray(data, "issues"),
      fixes,
    };
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export const TEST_SUITES: TestDefinition[] = [
  discoveryTest,
  productTest,
  interactionTest,
  checkoutTest,
  policyTest,
];

export function getTestById(id: string): TestDefinition | undefined {
  return TEST_SUITES.find((t) => t.id === id);
}

/**
 * Calculate the final Agent Readiness Score from individual test results.
 */
export function calculateFinalScore(
  testResults: Record<string, TestResult>
): { score: number; grade: string; gradeColor: string } {
  let totalScore = 0;

  for (const test of TEST_SUITES) {
    const result = testResults[test.id];
    if (result) {
      totalScore += result.subscore * test.weight;
    }
  }

  const score = Math.round(totalScore);

  let grade: string;
  let gradeColor: string;

  if (score >= 81) {
    grade = "Agent-Ready";
    gradeColor = "#00E676";
  } else if (score >= 61) {
    grade = "Mostly Ready";
    gradeColor = "#FFAB00";
  } else if (score >= 31) {
    grade = "Needs Work";
    gradeColor = "#FF9100";
  } else {
    grade = "Not Agent-Ready";
    gradeColor = "#FF1744";
  }

  return { score, grade, gradeColor };
}

/**
 * Compile all fixes from test results, sorted by test weight (most impactful first).
 */
export function compileTopFixes(
  testResults: Record<string, TestResult>
): string[] {
  const allFixes: { fix: string; weight: number }[] = [];

  for (const test of TEST_SUITES) {
    const result = testResults[test.id];
    if (result) {
      for (const fix of result.fixes) {
        allFixes.push({ fix, weight: test.weight });
      }
    }
  }

  // Sort by weight descending (most impactful tests first)
  allFixes.sort((a, b) => b.weight - a.weight);

  return allFixes.map((f) => f.fix);
}
