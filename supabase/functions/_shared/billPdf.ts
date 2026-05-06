// Hindi A5 farmer bill PDF builder, runs in Deno via jsPDF.
// Returns Uint8Array of the PDF bytes.
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { NOTO_DEVA_REGULAR_B64, NOTO_DEVA_BOLD_B64 } from "./notoDevaB64.ts";

interface BillRow {
  collection_date: string;
  session: string;
  quantity: number;
  fat_percentage: number;
  snf_percentage: number;
  rate_per_liter: number;
  total_amount: number;
}

export interface BillData {
  bill_number: string;
  cycle_start: string;
  cycle_end: string;
  farmer: { name: string; farmer_code: string; phone_number?: string | null };
  org_name: string;
  payout: {
    total_quantity: number;
    total_amount: number;
    sessions_count: number;
    avg_fat: number | null;
    avg_snf: number | null;
    advances_deducted: number;
    carry_forward_in: number;
    other_deductions: number;
    net_payable: number;
  };
  rows: BillRow[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmt = (s: string) => {
  try { return new Date(s).toLocaleDateString("hi-IN", { day: "2-digit", month: "short", year: "2-digit" }); } catch { return s; }
};

export function buildFarmerBillPdf(d: BillData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  doc.addFileToVFS("NotoDeva.ttf", NOTO_DEVA_REGULAR_B64);
  doc.addFont("NotoDeva.ttf", "NotoDeva", "normal");
  doc.addFileToVFS("NotoDevaB.ttf", NOTO_DEVA_BOLD_B64);
  doc.addFont("NotoDevaB.ttf", "NotoDeva", "bold");
  doc.setFont("NotoDeva", "normal");

  const W = 148; // a5 width mm
  let y = 8;

  // Header
  doc.setFont("NotoDeva", "bold");
  doc.setFontSize(14);
  doc.text(d.org_name, W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(11);
  doc.text("दूध बिल / Milk Bill", W / 2, y, { align: "center" });
  y += 5;
  doc.setFont("NotoDeva", "normal");
  doc.setFontSize(8);
  doc.text(`बिल नं: ${d.bill_number}`, 8, y);
  doc.text(`अवधि: ${fmt(d.cycle_start)} – ${fmt(d.cycle_end)}`, W - 8, y, { align: "right" });
  y += 5;

  // Farmer box
  doc.setDrawColor(180);
  doc.rect(8, y, W - 16, 12);
  doc.setFontSize(9);
  doc.text(`किसान: ${d.farmer.name}`, 10, y + 5);
  doc.text(`कोड: ${d.farmer.farmer_code}`, W - 10, y + 5, { align: "right" });
  doc.text(`मोबाइल: ${d.farmer.phone_number ?? "—"}`, 10, y + 10);
  y += 16;

  // Summary box
  doc.setFont("NotoDeva", "bold");
  doc.setFontSize(9);
  doc.text("सारांश / Summary", 8, y);
  y += 3;
  doc.setFont("NotoDeva", "normal");
  doc.setFontSize(8);
  const lines: Array<[string, string]> = [
    ["कुल दूध / Total milk", `${Number(d.payout.total_quantity).toFixed(2)} L`],
    ["कुल बार / Sessions", String(d.payout.sessions_count)],
    ["औसत FAT / Avg FAT", d.payout.avg_fat != null ? Number(d.payout.avg_fat).toFixed(2) : "—"],
    ["औसत SNF / Avg SNF", d.payout.avg_snf != null ? Number(d.payout.avg_snf).toFixed(2) : "—"],
    ["दूध की राशि / Milk amount", inr(Number(d.payout.total_amount))],
  ];
  if (Number(d.payout.carry_forward_in) > 0) lines.push(["+ पिछला बकाया / Carry forward", inr(Number(d.payout.carry_forward_in))]);
  if (Number(d.payout.advances_deducted) > 0) lines.push(["− अग्रिम / Advance deducted", inr(Number(d.payout.advances_deducted))]);
  if (Number(d.payout.other_deductions) > 0) lines.push(["− अन्य कटौती / Other deductions", inr(Number(d.payout.other_deductions))]);

  for (const [k, v] of lines) {
    doc.text(k, 10, y + 4);
    doc.text(v, W - 10, y + 4, { align: "right" });
    y += 4;
  }
  y += 1;
  doc.setDrawColor(80);
  doc.line(8, y, W - 8, y);
  y += 4;
  doc.setFont("NotoDeva", "bold");
  doc.setFontSize(11);
  doc.text("कुल देय / Net Payable", 10, y);
  doc.text(inr(Number(d.payout.net_payable)), W - 10, y, { align: "right" });
  y += 5;
  doc.setDrawColor(80);
  doc.line(8, y, W - 8, y);
  y += 5;

  // Daily detail table
  doc.setFont("NotoDeva", "bold");
  doc.setFontSize(8);
  doc.text("दिनांक", 10, y);
  doc.text("बार", 32, y);
  doc.text("L", 50, y, { align: "right" });
  doc.text("FAT", 64, y, { align: "right" });
  doc.text("SNF", 78, y, { align: "right" });
  doc.text("दर", 100, y, { align: "right" });
  doc.text("राशि", W - 10, y, { align: "right" });
  y += 1.5;
  doc.line(8, y, W - 8, y);
  y += 3;

  doc.setFont("NotoDeva", "normal");
  for (const r of d.rows) {
    if (y > 200) { doc.addPage(); y = 10; }
    doc.text(fmt(r.collection_date), 10, y);
    doc.text(r.session === "morning" ? "सुबह" : "शाम", 32, y);
    doc.text(Number(r.quantity).toFixed(1), 50, y, { align: "right" });
    doc.text(Number(r.fat_percentage ?? 0).toFixed(1), 64, y, { align: "right" });
    doc.text(Number(r.snf_percentage ?? 0).toFixed(1), 78, y, { align: "right" });
    doc.text(Number(r.rate_per_liter ?? 0).toFixed(2), 100, y, { align: "right" });
    doc.text(inr(Number(r.total_amount ?? 0)), W - 10, y, { align: "right" });
    y += 4;
  }

  if (y > 195) { doc.addPage(); y = 10; }
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("किसी समस्या के लिए डेयरी कार्यालय से संपर्क करें।", W / 2, 205, { align: "center" });
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}`, W / 2, 209, { align: "center" });

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}
