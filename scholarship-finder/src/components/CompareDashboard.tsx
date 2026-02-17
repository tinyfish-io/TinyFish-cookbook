import { X, Calendar, DollarSign, CheckCircle2, FileText, Building2, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scholarship } from "@/types/scholarship";

interface CompareDashboardProps {
  scholarships: Scholarship[];
  onClose: () => void;
}

export function CompareDashboard({ scholarships, onClose }: CompareDashboardProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-orange-500 text-white p-4 shadow-lg z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Scholarship Comparison</h2>
            <p className="text-orange-100 text-sm">Comparing {scholarships.length} scholarships</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-orange-600"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Comparison Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="container mx-auto px-4 py-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  <th className="p-4 text-left font-bold text-orange-900 border-b-2 border-orange-200 min-w-[150px]">
                    Feature
                  </th>
                  {scholarships.map((s) => (
                    <th key={s.id} className="p-4 text-left font-bold text-foreground border-b-2 border-orange-200 min-w-[280px]">
                      <div className="space-y-1">
                        <span className="text-lg">{s.name}</span>
                        <Badge className="bg-orange-100 text-orange-700 border-0 block w-fit">
                          {s.type}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Provider */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Provider
                    </div>
                  </td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-foreground">{s.provider}</td>
                  ))}
                </tr>

                {/* Amount */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Amount
                    </div>
                  </td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <span className="font-bold text-green-600">{s.amount}</span>
                    </td>
                  ))}
                </tr>

                {/* Deadline */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Deadline
                    </div>
                  </td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <span className="font-bold text-amber-600">{s.deadline}</span>
                    </td>
                  ))}
                </tr>

                {/* Region */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Region
                    </div>
                  </td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-foreground">{s.region || "N/A"}</td>
                  ))}
                </tr>

                {/* Description */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">Description</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-muted-foreground text-sm">
                      {s.description}
                    </td>
                  ))}
                </tr>

                {/* Eligibility */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Eligibility
                    </div>
                  </td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <ul className="space-y-1">
                        {s.eligibility.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Application Requirements */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Application Req.
                    </div>
                  </td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <ul className="space-y-1">
                        {s.applicationRequirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Additional Info */}
                <tr className="border-b border-muted">
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">Additional Info</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-muted-foreground text-sm">
                      {s.additionalInfo || "N/A"}
                    </td>
                  ))}
                </tr>

                {/* Apply Links */}
                <tr>
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">Apply</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <Button
                        asChild
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <a href={s.applicationLink} target="_blank" rel="noopener noreferrer">
                          Apply Now
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-200 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-bold text-orange-500">mino.ai</span>
          </p>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            Close Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
