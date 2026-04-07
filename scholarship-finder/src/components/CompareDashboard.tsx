"use client";
import { X, Calendar, DollarSign, CheckCircle2, FileText, Building2, MapPin, ExternalLink } from "lucide-react";
import type { Scholarship } from "@/types/scholarship";

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
          <button onClick={onClose} className="p-2 hover:bg-orange-600 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto h-[calc(100vh-80px)]">
        <div className="container mx-auto px-4 py-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  <th className="p-4 text-left font-bold text-orange-900 border-b-2 border-orange-200 min-w-[150px]">Feature</th>
                  {scholarships.map((s) => (
                    <th key={s.id} className="p-4 text-left font-bold text-foreground border-b-2 border-orange-200 min-w-[280px]">
                      <div className="space-y-1">
                        <span className="text-lg">{s.name}</span>
                        <span className="block text-xs font-normal px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full w-fit">{s.type}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Provider", icon: <Building2 className="w-4 h-4" />, render: (s: Scholarship) => s.provider },
                  { label: "Amount", icon: <DollarSign className="w-4 h-4" />, render: (s: Scholarship) => <span className="font-bold text-green-600">{s.amount}</span> },
                  { label: "Deadline", icon: <Calendar className="w-4 h-4" />, render: (s: Scholarship) => <span className="font-bold text-amber-600">{s.deadline}</span> },
                  { label: "Region", icon: <MapPin className="w-4 h-4" />, render: (s: Scholarship) => s.region || "N/A" },
                  { label: "Description", icon: null, render: (s: Scholarship) => <span className="text-sm text-muted-foreground">{s.description}</span> },
                  {
                    label: "Eligibility", icon: <CheckCircle2 className="w-4 h-4" />,
                    render: (s: Scholarship) => (
                      <ul className="space-y-1">
                        {s.eligibility?.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />{req}
                          </li>
                        ))}
                      </ul>
                    )
                  },
                  {
                    label: "Application Req.", icon: <FileText className="w-4 h-4" />,
                    render: (s: Scholarship) => (
                      <ul className="space-y-1">
                        {s.applicationRequirements?.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />{req}
                          </li>
                        ))}
                      </ul>
                    )
                  },
                  { label: "Additional Info", icon: null, render: (s: Scholarship) => <span className="text-sm text-muted-foreground">{s.additionalInfo || "N/A"}</span> },
                ].map(({ label, icon, render }, idx) => (
                  <tr key={label} className="border-b border-muted">
                    <td className="p-4 font-semibold bg-orange-50 text-orange-900">
                      <div className="flex items-center gap-2">{icon}{label}</div>
                    </td>
                    {scholarships.map((s) => <td key={s.id} className="p-4">{render(s)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td className="p-4 font-semibold bg-orange-50 text-orange-900">Apply</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <a href={s.applicationLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                        Apply Now <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
