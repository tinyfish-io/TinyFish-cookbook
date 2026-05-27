/**
 * Vendor and SKU configuration
 */

export interface VendorConfig {
  name: string;
  url: string;
}

export interface SKUConfig {
  id: string;
  displayName: string;
  description: string;
  vendors: VendorConfig[];
}

export const VENDOR_CONFIGS: Record<string, SKUConfig> = {
  "pi5-8gb": {
    id: "pi5-8gb",
    displayName: "Raspberry Pi 5 8GB",
    description: "Quad-core Arm Cortex-A76 @ 2.4GHz, 8GB LPDDR4X RAM",
    vendors: [
      {
        name: "Raspberry Pi Official Store",
        url: "https://www.raspberrypi.com/products/raspberry-pi-5/",
      },
      {
        name: "Amazon UK",
        url: "https://www.amazon.co.uk/dp/B0CTQ3BQLS",
      },
      {
        name: "Pimoroni",
        url: "https://shop.pimoroni.com/products/raspberry-pi-5",
      },
      {
        name: "The Pi Hut",
        url: "https://thepihut.com/products/raspberry-pi-5",
      },
    ],
  },

  "jetson-orin-nano": {
    id: "jetson-orin-nano",
    displayName: "NVIDIA Jetson Orin Nano",
    description: "6-core Arm Cortex-A78AE CPU, 1024-core NVIDIA Ampere GPU",
    vendors: [
      {
        name: "NVIDIA Store",
        url: "https://store.nvidia.com/en-gb/jetson/store/",
      },
      {
        name: "Amazon UK",
        url: "https://www.amazon.co.uk/dp/B0BZJTQ5YP",
      },
    ],
  },
};

export function getSKUConfig(skuId: string): SKUConfig | null {
  return VENDOR_CONFIGS[skuId] || null;
}

export function getAllSKUIDs(): string[] {
  return Object.keys(VENDOR_CONFIGS);
}

export function getAllSKUs(): SKUConfig[] {
  return Object.values(VENDOR_CONFIGS);
}
