import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  Link as LinkIcon,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sector } from '@/types/tender';
import { supabase } from '@/integrations/supabase/client';

interface LinkConfigPageProps {
  sector: Sector;
  onBack: () => void;
  onStartSearch: (links: string[]) => void;
}

export function LinkConfigPage({ sector, onBack, onStartSearch }: LinkConfigPageProps) {
  const [customLinks, setCustomLinks] = useState<string[]>(['']);
  const [isSearchingCustom, setIsSearchingCustom] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  const addCustomLink = () => {
    setCustomLinks([...customLinks, '']);
  };

  const updateCustomLink = (index: number, value: string) => {
    const updated = [...customLinks];
    updated[index] = value;
    setCustomLinks(updated);
  };

  const removeCustomLink = (index: number) => {
    if (customLinks.length > 1) {
      setCustomLinks(customLinks.filter((_, i) => i !== index));
    }
  };

  const fetchAILinks = async (count: number = 5): Promise<string[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('discover-tender-links', {
        body: { sector, limit: count }
      });
      
      if (error) throw error;
      
      if (data?.links) {
        return data.links.map((link: any) => link.url);
      }
      return [];
    } catch (error) {
      console.error('Error fetching AI links:', error);
      return [
        'https://www.gebiz.gov.sg/',
        'https://www.tendersontime.com/singapore-tenders/',
        'https://www.biddetail.com/singapore-tenders',
        'https://www.tendersinfo.com/global-singapore-tenders.php',
        'https://www.globaltenders.com/government-tenders-singapore',
      ];
    }
  };

  const handleSearchWithCustomLinks = async () => {
    const validCustomLinks = customLinks.filter(link => link.trim() !== '');
    
    if (validCustomLinks.length === 0) {
      return;
    }
    
    setIsSearchingCustom(true);
    try {
      // Fetch 5 AI links and combine with user links
      const aiLinks = await fetchAILinks();
      const allLinks = [...new Set([...validCustomLinks, ...aiLinks])];
      onStartSearch(allLinks);
    } catch (error) {
      console.error('Error starting search:', error);
      const fallbackLinks = [
        'https://www.gebiz.gov.sg/',
        'https://www.tendersontime.com/singapore-tenders/',
        'https://www.biddetail.com/singapore-tenders',
        'https://www.tendersinfo.com/global-singapore-tenders.php',
        'https://www.globaltenders.com/government-tenders-singapore',
      ];
      const allLinks = [...new Set([...validCustomLinks, ...fallbackLinks])];
      onStartSearch(allLinks);
    } finally {
      setIsSearchingCustom(false);
    }
  };

  const handleSearchWithAIOnly = async () => {
    setIsSearchingAI(true);
    try {
      const aiLinks = await fetchAILinks(7);
      onStartSearch(aiLinks);
    } catch (error) {
      console.error('Error starting AI search:', error);
      const fallbackLinks = [
        'https://www.gebiz.gov.sg/',
        'https://www.tendersontime.com/singapore-tenders/',
        'https://www.biddetail.com/singapore-tenders',
        'https://www.tendersinfo.com/global-singapore-tenders.php',
        'https://www.globaltenders.com/government-tenders-singapore',
      ];
      onStartSearch(fallbackLinks);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const validLinksCount = customLinks.filter(l => l.trim()).length;
  const isLoading = isSearchingCustom || isSearchingAI;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-3xl mx-auto px-4 py-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configure Search</h2>
          <p className="text-muted-foreground">
            Search tender sources for <span className="text-primary font-medium">{sector}</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Option 1: Custom Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LinkIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Search with Your Links</h3>
              <p className="text-sm text-muted-foreground">Add your tender websites + 5 AI-discovered links</p>
            </div>
          </div>

          <div className="space-y-3">
            {customLinks.map((link, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-2"
              >
                <Input
                  placeholder="https://example.com/tenders"
                  value={link}
                  onChange={(e) => updateCustomLink(index, e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomLink(index)}
                  disabled={customLinks.length === 1 && !link || isLoading}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={addCustomLink}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
            
            <Button
              onClick={handleSearchWithCustomLinks}
              disabled={validLinksCount === 0 || isLoading}
              className="ml-auto"
            >
              {isSearchingCustom ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-sm font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Option 2: AI Only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Search with AI Links</h3>
              </div>
            </div>
            
            <Button
              onClick={handleSearchWithAIOnly}
              disabled={isLoading}
              variant="default"
              className="bg-primary hover:bg-primary/90"
            >
              {isSearchingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Search with AI
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
