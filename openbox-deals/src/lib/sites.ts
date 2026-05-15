import type { ProxyCountryCode } from '@tiny-fish/sdk';

export interface SiteConfig {
  name: string;
  searchUrl: string;
  goal: string;
  browserProfile?: 'lite' | 'stealth';
  proxyConfig?: { enabled: boolean; country_code?: ProxyCountryCode };
}

export const SITES: Record<string, SiteConfig> = {
  amazon: {
    name: 'Amazon Warehouse',
    searchUrl: 'https://www.amazon.com/s?k={query}&i=specialty-aps&srs=12653393011',
    goal: "Extract the first 5 Renewed/Used/Refurbished '{query}' products only. Skip NEW items and accessories. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
    browserProfile: 'stealth',
    proxyConfig: { enabled: true, country_code: 'US' },
  },
  bestbuy: {
    name: 'Best Buy Outlet',
    searchUrl: 'https://www.bestbuy.com/site/searchpage.jsp?st={query}&qp=condition_facet%3DCondition~Open-Box',
    goal: "Extract the first 5 Open-Box '{query}' products. Only include main devices, NOT accessories. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
    browserProfile: 'stealth',
  },
  newegg: {
    name: 'Newegg Open Box',
    searchUrl: 'https://www.newegg.com/p/pl?d={query}&N=4814',
    goal: "Extract the first 5 Open Box products that match '{query}'. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields. Skip sponsored items.",
  },
  backmarket: {
    name: 'BackMarket',
    searchUrl: 'https://www.backmarket.com/en-us/search?q={query}',
    goal: "Extract the first 5 refurbished products that match '{query}'. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
  },
  swappa: {
    name: 'Swappa',
    searchUrl: 'https://swappa.com/search?q={query}',
    goal: "Extract the first 5 '{query}' listings with complete data. Skip any listing without a price. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
    browserProfile: 'stealth',
  },
  walmart: {
    name: 'Walmart Renewed',
    searchUrl: 'https://www.walmart.com/search?q={query}+renewed',
    goal: "Extract the first 5 Renewed/Refurbished products that match '{query}'. Only include actual devices. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
    browserProfile: 'stealth',
  },
  target: {
    name: 'Target Clearance',
    searchUrl: 'https://www.target.com/s?searchTerm={query}&facetedValue=5zja2',
    goal: "Extract the first 5 Clearance products that match '{query}'. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
  },
  microcenter: {
    name: 'Micro Center',
    searchUrl: 'https://www.microcenter.com/search/search_results.aspx?Ntt={query}&Ntk=all&N=4294966998',
    goal: "Extract the first 5 Open Box products that match '{query}'. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}]. Use null for missing fields.",
  },
};
