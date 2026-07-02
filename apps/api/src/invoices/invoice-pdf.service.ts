import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

interface InvoicePdfData {
  business: { name: string; kraPin?: string | null; currency: string };
  client: { fullName: string; email?: string | null; phone: string };
  number: string;
  dueDate: Date;
  items: { description: string; quantity: unknown; unitPrice: unknown; taxRate: unknown; lineTotal: unknown }[];
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  total: unknown;
  amountPaid: unknown;
  balanceDue: unknown;
  notes?: string | null;
}

@Injectable()
export class InvoicePdfService {
  generate(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text(data.business.name, { continued: false });
      if (data.business.kraPin) {
        doc.fontSize(9).fillColor("#555").text(`KRA PIN: ${data.business.kraPin}`);
      }
      doc.moveDown();

      doc.fontSize(16).fillColor("#000").text(`Invoice ${data.number}`);
      doc.fontSize(10).fillColor("#555").text(`Due: ${data.dueDate.toDateString()}`);
      doc.moveDown();

      doc.fontSize(11).fillColor("#000").text(`Bill to: ${data.client.fullName}`);
      if (data.client.email) doc.text(data.client.email);
      doc.text(data.client.phone);
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(10).fillColor("#000");
      doc.text("Description", 50, tableTop, { width: 220 });
      doc.text("Qty", 270, tableTop, { width: 50 });
      doc.text("Unit Price", 320, tableTop, { width: 80 });
      doc.text("Tax %", 400, tableTop, { width: 50 });
      doc.text("Total", 460, tableTop, { width: 90 });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ccc").stroke();

      for (const item of data.items) {
        const y = doc.y + 4;
        doc.text(item.description, 50, y, { width: 220 });
        doc.text(String(item.quantity), 270, y, { width: 50 });
        doc.text(`${data.business.currency} ${Number(item.unitPrice).toFixed(2)}`, 320, y, { width: 80 });
        doc.text(`${Number(item.taxRate)}%`, 400, y, { width: 50 });
        doc.text(`${data.business.currency} ${Number(item.lineTotal).toFixed(2)}`, 460, y, { width: 90 });
        doc.moveDown();
      }

      doc.moveDown();
      const summaryX = 380;
      this.summaryLine(doc, summaryX, "Subtotal", data.business.currency, data.subtotal);
      this.summaryLine(doc, summaryX, "Discount", data.business.currency, data.discountAmount);
      this.summaryLine(doc, summaryX, "Tax (VAT)", data.business.currency, data.taxAmount);
      this.summaryLine(doc, summaryX, "Total", data.business.currency, data.total, true);
      this.summaryLine(doc, summaryX, "Amount Paid", data.business.currency, data.amountPaid);
      this.summaryLine(doc, summaryX, "Balance Due", data.business.currency, data.balanceDue, true);

      if (data.notes) {
        doc.moveDown();
        doc.fontSize(9).fillColor("#555").text(`Notes: ${data.notes}`);
      }

      doc.end();
    });
  }

  private summaryLine(doc: PDFKit.PDFDocument, x: number, label: string, currency: string, value: unknown, bold = false) {
    doc.fontSize(bold ? 11 : 10).fillColor("#000");
    if (bold) doc.font("Helvetica-Bold");
    doc.text(`${label}: ${currency} ${Number(value).toFixed(2)}`, x, doc.y, { width: 170 });
    if (bold) doc.font("Helvetica");
  }
}
