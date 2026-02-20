import { ExternalLink, Calendar, DollarSign, CheckCircle2, Info, FileText, Building2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Scholarship } from "@/types/scholarship";

interface ScholarshipCardProps {
  scholarship: Scholarship;
  index: number;
}

export function ScholarshipCard({ scholarship, index }: ScholarshipCardProps) {
  return (
    <Card 
      className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold text-foreground leading-tight">
              {scholarship.name}
            </CardTitle>
            <p className="text-muted-foreground font-medium">{scholarship.provider}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-0">
            {scholarship.type}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-3 pt-2">
          {scholarship.university && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              {scholarship.university}
            </div>
          )}
          {scholarship.region && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {scholarship.region}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Amount and Deadline */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <DollarSign className="w-5 h-5 text-success" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
              <p className="font-bold text-success">{scholarship.amount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Calendar className="w-5 h-5 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Deadline</p>
              <p className="font-bold text-warning">{scholarship.deadline}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {scholarship.description}
          </p>
        </div>

        <Separator />

        {/* Eligibility */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-semibold text-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Eligibility Requirements
          </h4>
          <ul className="space-y-2">
            {scholarship.eligibility.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Application Requirements */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-semibold text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            Application Requirements
          </h4>
          <ul className="space-y-2">
            {scholarship.applicationRequirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Additional Info */}
        {scholarship.additionalInfo && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-semibold text-foreground">
              <Info className="w-4 h-4 text-info" />
              Additional Information
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {scholarship.additionalInfo}
            </p>
          </div>
        )}

        {/* Apply Button */}
        <Button
          asChild
          className="w-full h-12 font-semibold gradient-primary hover:opacity-90 transition-opacity"
        >
          <a href={scholarship.applicationLink} target="_blank" rel="noopener noreferrer">
            Apply Now
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}