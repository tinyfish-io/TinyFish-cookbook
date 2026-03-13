// Auth removed - app is now fully public
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Check, ExternalLink, Bookmark, BookmarkCheck, LayoutList, LayoutGrid, Newspaper, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
// Auth removed
import { toast } from "sonner";

export default function Feed() {
  const [viewMode, setViewMode] = useState<"inbox" | "magazine" | "cards">("inbox");

  // Fetch content feed
  const { data: content, isLoading: contentLoading, refetch } = trpc.content.feed.useQuery(
    { limit: 50, offset: 0 }
  );

  // Mutations
  const markReadMutation = trpc.content.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const saveMutation = trpc.content.save.useMutation({
    onSuccess: () => refetch(),
  });



  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id });
  };

  const handleSave = (id: number, saved: boolean) => {
    saveMutation.mutate({ id, saved });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reflection</h1>
              <p className="text-sm text-muted-foreground">Tell Reflection what to follow</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const fetchMutation = trpc.jobs.fetchContent.useMutation({
                    onSuccess: () => {
                      refetch();
                      toast.success("Content refreshed!");
                    },
                  });
                  fetchMutation.mutate();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Link href="/sources">
                <Button variant="outline">Manage Sources</Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost">Settings</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* View Mode Tabs */}
      <div className="container py-6">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="inbox" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="magazine" className="gap-2">
              <Newspaper className="h-4 w-4" />
              Magazine
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Cards
            </TabsTrigger>
          </TabsList>

          {/* Inbox View */}
          <TabsContent value="inbox" className="mt-6">
            <div className="max-w-3xl mx-auto space-y-3">
              {contentLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : content && content.length > 0 ? (
                content.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 hover:shadow-md transition-all ${
                      item.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {item.category && (
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          {!item.isRead && (
                            <Badge variant="default" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {item.author && <span>{item.author}</span>}
                          <span>
                            {new Date(item.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkRead(item.id)}
                          disabled={!!item.isRead}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSave(item.id, !item.isSaved)}
                        >
                          {item.isSaved ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No content yet</p>
                  <Link href="/sources">
                    <Button>Add Your First Source</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Magazine View */}
          <TabsContent value="magazine" className="mt-6">
            <div className="max-w-4xl mx-auto space-y-8">
              {contentLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : content && content.length > 0 ? (
                content.map((item) => (
                  <article
                    key={item.id}
                    className={`border-b border-border pb-8 last:border-0 ${
                      item.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {item.category && (
                        <Badge variant="secondary">{item.category}</Badge>
                      )}
                      {!item.isRead && <Badge variant="default">New</Badge>}
                    </div>
                    <h2 className="text-3xl font-bold mb-4 leading-tight">
                      {item.title}
                    </h2>
                    {item.summary && (
                      <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {item.author && <span className="font-medium">{item.author}</span>}
                        <span>
                          {new Date(item.publishedAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkRead(item.id)}
                          disabled={!!item.isRead}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark Read
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(item.id, !item.isSaved)}
                        >
                          {item.isSaved ? (
                            <>
                              <BookmarkCheck className="h-4 w-4 mr-2" />
                              Saved
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-4 w-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="default" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            Read Article
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No content yet</p>
                  <Link href="/sources">
                    <Button>Add Your First Source</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Cards View */}
          <TabsContent value="cards" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contentLoading ? (
                <div className="col-span-full text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : content && content.length > 0 ? (
                content.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-6 hover:shadow-lg transition-all flex flex-col ${
                      item.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                      {!item.isRead && (
                        <Badge variant="default" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-xl mb-3 line-clamp-3 flex-1">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {item.summary}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mb-4">
                      {item.author && <div className="font-medium">{item.author}</div>}
                      <div>
                        {new Date(item.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleMarkRead(item.id)}
                        disabled={!!item.isRead}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSave(item.id, !item.isSaved)}
                      >
                        {item.isSaved ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="sm" variant="default" className="flex-1" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          Read
                        </a>
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground mb-4">No content yet</p>
                  <Link href="/sources">
                    <Button>Add Your First Source</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
