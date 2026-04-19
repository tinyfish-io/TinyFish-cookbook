import { NextResponse } from "next/server";

const DEFAULT_LINKS = [
  { url: "https://www.gebiz.gov.sg/", name: "GeBIZ" },
  { url: "https://www.tendersontime.com/singapore-tenders/", name: "Tenders On Time" },
  { url: "https://www.biddetail.com/singapore-tenders", name: "Bid Detail" },
  { url: "https://www.tendersinfo.com/global-singapore-tenders.php", name: "Tenders Info" },
  { url: "https://www.globaltenders.com/government-tenders-singapore", name: "Global Tenders" },
  { url: "https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=menu", name: "GeBIZ Opportunities" },
  { url: "https://www.tenderboard.biz/vendor/tender-opportunities/", name: "Tender Board" },
];

export async function GET() {
  return NextResponse.json({ links: DEFAULT_LINKS });
}

export async function POST() {
  return NextResponse.json({ links: DEFAULT_LINKS });
}
