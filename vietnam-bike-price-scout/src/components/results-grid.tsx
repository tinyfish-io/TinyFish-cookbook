import { BikeShop } from '@/hooks/use-bike-search';
import { ShopGroup } from './shop-group';

interface ResultsGridProps {
  shops: BikeShop[];
}

export function ResultsGrid({ shops }: ResultsGridProps) {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {shops.map((shop) => (
        <ShopGroup key={shop.website} shop={shop} />
      ))}
    </div>
  );
}
