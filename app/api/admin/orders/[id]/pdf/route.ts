import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { generateOrderPDF } from '@/lib/pdf-generator';

/**
 * GET /api/admin/orders/[id]/pdf
 * Generate and download PDF for order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(user);

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new ValidationError('Order not found');
    }

    // Check permissions
    if (user.role === UserRole.STORE_MANAGER && user.storeId !== order.storeId) {
      throw new ValidationError('You can only view orders from your store');
    }

    // Fetch store separately (no relation in schema)
    const store = await prisma.store.findUnique({
      where: { id: order.storeId },
    });

    // Barcode will be generated client-side if needed
    // For now, we'll include order ID as text barcode
    const barcodeBase64: string | undefined = undefined;

    // Generate order number (format: ORD-YYYYMMDD-XXXX)
    const orderNumber = `ORD-${new Date(order.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${order.id.slice(-4).toUpperCase()}`;

    // Prepare PDF data
    const pdfData = {
      orderId: order.id,
      orderNumber,
      storeName: store?.name || 'Unknown Store',
      storeCode: store?.code || 'UNKNOWN',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,
      frameData: typeof order.frameData === 'object' ? order.frameData : {},
      lensData: typeof order.lensData === 'object' ? order.lensData : {},
      offerData: typeof order.offerData === 'object' ? order.offerData : {},
      finalPrice: order.finalPrice,
      status: order.status,
      barcode: barcodeBase64,
    };

    // Generate PDF
    const pdf = generateOrderPDF(pdfData);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF as response
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="order-${orderNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[admin/orders/[id]/pdf] Error:', error);
    return handleApiError(error);
  }
}

