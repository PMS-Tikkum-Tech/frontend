"use client";

import { RevenueData } from "@/types/dashboard";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentRow {
  name: string;
  sudah: number;
  menunggu: number;
  terlambat: number;
}

interface NamedValueRow {
  name: string;
  value: number;
}

interface Props {
  period: string;
  stats: { title: string; value: string }[];
  revenueData: RevenueData[];
  paymentData?: PaymentRow[];
  occupancyData: NamedValueRow[];
  maintenanceData: NamedValueRow[];
  sourceData?: NamedValueRow[];
}

export default function ExportButton({
  period,
  stats,
  revenueData,
  paymentData = [],
  occupancyData,
  maintenanceData,
  sourceData = [],
}: Props) {
  const getPeriodLabel = (value: string) => {
    const labels: Record<string, string> = {
      month: "Bulan Ini",
      quarter: "Kuartal Ini",
      year: "Tahun Ini",
      lastYear: "Tahun Lalu",
    };

    return labels[value] || value;
  };

  const formatCurrency = (value: number) => {
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const toSafeBody = (rows: Array<Array<string | number>>, colCount: number) => {
    if (rows.length > 0) {
      return rows;
    }

    return [Array.from({ length: colCount }, (_, index) => (index === 0 ? "Tidak ada data" : "-"))];
  };

  const getLastTableY = (doc: jsPDF) => {
    const tableState = doc as unknown as { lastAutoTable?: { finalY: number } };
    return tableState.lastAutoTable?.finalY ?? 0;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    const today = new Date();
    const generatedAt = today.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let currentY = 18;

    const ensureSpace = (neededHeight: number) => {
      if (currentY + neededHeight <= pageHeight - 18) {
        return;
      }

      doc.addPage();
      currentY = 18;
    };

    const drawSectionTitle = (title: string, subtitle?: string) => {
      ensureSpace(14);
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.line(marginX, currentY, pageWidth - marginX, currentY);
      currentY += 6;

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, marginX, currentY);

      if (subtitle) {
        currentY += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(subtitle, marginX, currentY);
      }

      currentY += 6;
    };

    const drawHeader = () => {
      doc.setFillColor(30, 39, 70);
      doc.roundedRect(marginX, currentY - 8, contentWidth, 28, 3, 3, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("LAPORAN DASHBOARD ADMIN", marginX + 4, currentY + 1);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("KIKOST", marginX + 4, currentY + 7);

      doc.setFontSize(9);
      doc.text(`Periode: ${getPeriodLabel(period)}`, marginX + 4, currentY + 13);
      doc.text(`Tanggal cetak: ${generatedAt}`, marginX + 4, currentY + 18.5);

      currentY += 26;
    };

    drawHeader();

    drawSectionTitle(
      "Ringkasan Eksekutif",
      "Indikator utama operasional dan keuangan."
    );

    const cardWidth = (contentWidth - 6) / 2;
    const cardHeight = 14;
    stats.slice(0, 4).forEach((item, index) => {
      ensureSpace(cardHeight + 4);

      const x = marginX + (index % 2) * (cardWidth + 6);
      const y = currentY + Math.floor(index / 2) * (cardHeight + 4);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(item.title, x + 3, y + 5);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(item.value, x + 3, y + 10.5);
    });

    currentY += 2 * (cardHeight + 4) + 3;

    drawSectionTitle("Tabel Ringkasan KPI");

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Indikator", "Nilai"]],
      body: toSafeBody(
        stats.map((item) => [item.title, item.value]),
        2
      ),
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 2.4,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [30, 39, 70],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
    currentY = getLastTableY(doc) + 8;

    drawSectionTitle("Ringkasan Keuangan Bulanan");

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Bulan", "Pendapatan", "Pengeluaran", "Selisih"]],
      body: toSafeBody(
        revenueData.map((item) => [
          item.month,
          formatCurrency(item.pemasukan),
          formatCurrency(item.pengeluaran),
          formatCurrency(item.pemasukan - item.pengeluaran),
        ]),
        4
      ),
      theme: "grid",
      styles: {
        fontSize: 8.8,
        cellPadding: 2.3,
      },
      headStyles: {
        fillColor: [14, 79, 148],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    currentY = getLastTableY(doc) + 8;

    drawSectionTitle("Status Pembayaran");
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Kategori", "Sudah Bayar", "Menunggu", "Terlambat"]],
      body: toSafeBody(
        paymentData.map((item) => [
          item.name,
          item.sudah.toLocaleString("id-ID"),
          item.menunggu.toLocaleString("id-ID"),
          item.terlambat.toLocaleString("id-ID"),
        ]),
        4
      ),
      theme: "grid",
      styles: {
        fontSize: 8.8,
        cellPadding: 2.3,
      },
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    currentY = getLastTableY(doc) + 8;

    drawSectionTitle("Okupansi Unit");
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Kategori", "Nilai (%)"]],
      body: toSafeBody(
        occupancyData.map((item) => [item.name, `${item.value.toLocaleString("id-ID")} %`]),
        2
      ),
      theme: "grid",
      styles: {
        fontSize: 8.8,
        cellPadding: 2.3,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: "right" },
      },
    });
    currentY = getLastTableY(doc) + 8;

    drawSectionTitle("Laporan Perawatan");
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Jenis Masalah", "Jumlah"]],
      body: toSafeBody(
        maintenanceData.map((item) => [item.name, item.value.toLocaleString("id-ID")]),
        2
      ),
      theme: "grid",
      styles: {
        fontSize: 8.8,
        cellPadding: 2.3,
      },
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: "right" },
      },
    });
    currentY = getLastTableY(doc) + 8;

    drawSectionTitle("Sumber Penyewa");
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Sumber", "Jumlah"]],
      body: toSafeBody(
        sourceData.map((item) => [item.name, item.value.toLocaleString("id-ID")]),
        2
      ),
      theme: "grid",
      styles: {
        fontSize: 8.8,
        cellPadding: 2.3,
      },
      headStyles: {
        fillColor: [30, 39, 70],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: "right" },
      },
    });

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Dokumen internal KIKOST - Dasbor Administrator",
        marginX,
        pageHeight - 9.5
      );
      doc.text(
        `Halaman ${page} dari ${totalPages}`,
        pageWidth - marginX,
        pageHeight - 9.5,
        { align: "right" }
      );
    }

    const datePart = today.toISOString().slice(0, 10);
    doc.save(`Laporan-Dasbor-Administrator-KIKOST-${datePart}.pdf`);
  };

  return (
    <button
      onClick={handleExportPDF}
      className="px-5 py-2 bg-[#1E2746] text-white rounded-lg text-sm hover:bg-[#111827] transition"
    >
      Ekspor PDF
    </button>
  );
}
