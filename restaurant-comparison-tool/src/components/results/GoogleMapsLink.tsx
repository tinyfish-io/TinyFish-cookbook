import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoogleMapsLinkProps {
  url: string;
}

export function GoogleMapsLink({ url }: GoogleMapsLinkProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      asChild
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MapPin className="w-4 h-4 mr-2" />
        View on Google Maps
        <ExternalLink className="w-3 h-3 ml-auto" />
      </a>
    </Button>
  );
}
