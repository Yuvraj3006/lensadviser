import jsPDF from 'jspdf';

export interface OrderPDFData {
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeCode: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: Date;
  frameData: any;
  lensData: any;
  offerData: any;
  finalPrice: number;
  status: string;
  barcode?: string; // Base64 barcode image
}

/**
 * Generate PDF for order slip
 */
export function generateOrderPDF(data: OrderPDFData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LensTrack Order Slip', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Order Number
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order #: ${data.orderNumber}`, margin, yPos);
  yPos += 8;

  // Store Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Store: ${data.storeName} (${data.storeCode})`, margin, yPos);
  yPos += 6;
  doc.text(`Date: ${new Date(data.createdAt).toLocaleString()}`, margin, yPos);
  yPos += 8;

  // Customer Info
  if (data.customerName || data.customerPhone) {
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Details:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    if (data.customerName) {
      doc.text(`Name: ${data.customerName}`, margin, yPos);
      yPos += 6;
    }
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, margin, yPos);
      yPos += 6;
    }
    yPos += 4;
  }

  // Frame Data
  if (data.frameData && Object.keys(data.frameData).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Frame:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    if (data.frameData.brand) {
      doc.text(`Brand: ${data.frameData.brand}`, margin, yPos);
      yPos += 6;
    }
    if (data.frameData.mrp) {
      doc.text(`Price: ₹${data.frameData.mrp.toLocaleString()}`, margin, yPos);
      yPos += 6;
    }
    if (data.frameData.frameType) {
      doc.text(`Type: ${data.frameData.frameType}`, margin, yPos);
      yPos += 6;
    }
    yPos += 4;
  }

  // Lens Data
  if (data.lensData && Object.keys(data.lensData).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Lens:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    if (data.lensData.name) {
      doc.text(`Product: ${data.lensData.name}`, margin, yPos);
      yPos += 6;
    }
    if (data.lensData.brand || data.lensData.brandLine) {
      doc.text(`Brand: ${data.lensData.brand || data.lensData.brandLine}`, margin, yPos);
      yPos += 6;
    }
    // Removed: IT Code (lens SKU) - Order slip should only track barcode
    if (data.lensData.price) {
      doc.text(`Price: ₹${data.lensData.price.toLocaleString()}`, margin, yPos);
      yPos += 6;
    }
    if (data.lensData.packType) {
      doc.text(`Pack Type: ${data.lensData.packType}`, margin, yPos);
      yPos += 6;
    }
    if (data.lensData.quantity) {
      doc.text(`Quantity: ${data.lensData.quantity}`, margin, yPos);
      yPos += 6;
    }
    yPos += 4;
  }

  // Offer Data
  if (data.offerData && data.offerData.offersApplied && data.offerData.offersApplied.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Offers Applied:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    data.offerData.offersApplied.forEach((offer: any) => {
      doc.text(`- ${offer.description || offer.ruleCode}`, margin, yPos);
      yPos += 6;
      if (offer.savings) {
        doc.text(`  Savings: ₹${offer.savings.toLocaleString()}`, margin + 5, yPos);
        yPos += 6;
      }
    });
    yPos += 4;
  }

  // Price Breakdown
  if (data.offerData && data.offerData.priceComponents) {
    doc.setFont('helvetica', 'bold');
    doc.text('Price Breakdown:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    data.offerData.priceComponents.forEach((component: any) => {
      doc.text(`${component.label}: ₹${component.amount.toLocaleString()}`, margin, yPos);
      yPos += 6;
    });
    yPos += 4;
  }

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Total: ₹${data.finalPrice.toLocaleString()}`, margin, yPos);
  yPos += 10;

  // Barcode (text representation)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order ID: ${data.orderId}`, margin, yPos);
  yPos += 8;
  
  // Barcode image if provided
  if (data.barcode) {
    try {
      // Add barcode image (base64 data URL)
      doc.addImage(data.barcode, 'PNG', margin, yPos, 60, 20);
      yPos += 25;
    } catch (error) {
      console.error('Error adding barcode image to PDF:', error);
      // Already have text barcode above
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${data.status}`, margin, doc.internal.pageSize.getHeight() - 10);
  doc.text(`Order ID: ${data.orderId}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  return doc;
}

/**
 * Generate PDF as blob
 */
export function generateOrderPDFBlob(data: OrderPDFData): Promise<Blob> {
  const doc = generateOrderPDF(data);
  return new Promise((resolve) => {
    const pdfBlob = doc.output('blob');
    resolve(pdfBlob);
  });
}

