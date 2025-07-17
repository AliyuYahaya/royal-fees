import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { formatCurrency, formatDate, classLevelToDisplay } from './utils'
import type { InvoiceWithDetails, PaymentWithDetails } from '@/types'

export const generateInvoicePDF = async (invoice: InvoiceWithDetails): Promise<void> => {
  const htmlContent = generateInvoiceHTML(invoice)
  await generatePDFFromHTML(htmlContent, `Invoice_${invoice.invoice_number}`)
}

export const generatePaymentReceiptPDF = async (payment: PaymentWithDetails): Promise<void> => {
  const htmlContent = generatePaymentReceiptHTML(payment)
  await generatePDFFromHTML(htmlContent, `Receipt_${payment.payment_reference}`)
}

const generatePDFFromHTML = async (htmlContent: string, filename: string): Promise<void> => {
  // Create a temporary container
  const container = document.createElement('div')
  container.innerHTML = htmlContent
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.style.width = '800px'
  container.style.backgroundColor = 'white'
  container.style.padding = '20px'
  
  document.body.appendChild(container)

  try {
    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      background: '#ffffff',
      width: 800,
      height: container.scrollHeight
    })

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png')
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    
    // Calculate dimensions to fit A4
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const width = imgWidth * ratio
    const height = imgHeight * ratio
    
    // Center the image
    const x = (pdfWidth - width) / 2
    const y = (pdfHeight - height) / 2
    
    pdf.addImage(imgData, 'PNG', x, y, width, height)
    
    // Save the PDF
    pdf.save(`${filename}.pdf`)
  } finally {
    // Clean up
    document.body.removeChild(container)
  }
}

const generateInvoiceHTML = (invoice: InvoiceWithDetails): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white;
          font-size: 14px;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #2563eb; 
          margin: 0; 
          font-size: 24px;
        }
        .header h2 { 
          color: #64748b; 
          margin: 10px 0 0 0; 
          font-size: 18px;
        }
        .section { 
          margin-bottom: 25px; 
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 15px; 
        }
        th, td { 
          border: 1px solid #e5e7eb; 
          padding: 10px; 
          text-align: left; 
        }
        th { 
          background-color: #f8fafc; 
          font-weight: bold;
        }
        .total { 
          font-weight: bold; 
          font-size: 16px; 
          color: #1e40af;
        }
        .status { 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.paid { background: #d1fae5; color: #065f46; }
        .status.partial { background: #dbeafe; color: #1e40af; }
        .status.overdue { background: #fee2e2; color: #991b1b; }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
        .financial-summary {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .financial-summary table {
          margin: 0;
        }
        .financial-summary .total {
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ROYAL FEES MANAGEMENT SYSTEM</h1>
        <h2>INVOICE</h2>
      </div>
      
      <div class="section">
        <div class="section-title">Invoice Information</div>
        <table>
          <tr>
            <td><strong>Invoice Number:</strong></td>
            <td>${invoice.invoice_number}</td>
            <td><strong>Status:</strong></td>
            <td><span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span></td>
          </tr>
          <tr>
            <td><strong>Generated Date:</strong></td>
            <td>${formatDate(invoice.generated_at)}</td>
            <td><strong>Due Date:</strong></td>
            <td>${invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}</td>
          </tr>
          <tr>
            <td><strong>Academic Session:</strong></td>
            <td>${invoice.academic_session?.session_name || 'N/A'}</td>
            <td><strong>Term:</strong></td>
            <td>${invoice.term ? invoice.term.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Not specified'}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Student Information</div>
        <table>
          <tr>
            <td><strong>Student Name:</strong></td>
            <td>${invoice.student?.first_name} ${invoice.student?.last_name}</td>
            <td><strong>Student ID:</strong></td>
            <td>${invoice.student?.student_id}</td>
          </tr>
          <tr>
            <td><strong>Class:</strong></td>
            <td>${classLevelToDisplay(invoice.student?.class_level || '')}</td>
            <td><strong>Parent/Guardian:</strong></td>
            <td>${invoice.student?.parent_guardian_name || 'Not provided'}</td>
          </tr>
        </table>
      </div>

      <div class="financial-summary">
        <div class="section-title">Financial Summary</div>
        <table>
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td class="total">${formatCurrency(invoice.total_amount)}</td>
          </tr>
          <tr>
            <td><strong>Amount Paid:</strong></td>
            <td style="color: #059669; font-weight: bold;">${formatCurrency(invoice.paid_amount)}</td>
          </tr>
          <tr>
            <td><strong>Outstanding Balance:</strong></td>
            <td class="total" style="color: ${invoice.balance > 0 ? '#dc2626' : '#059669'};">
              ${formatCurrency(invoice.balance)}
            </td>
          </tr>
        </table>
      </div>

      ${invoice.payments && invoice.payments.length > 0 ? `
      <div class="section">
        <div class="section-title">Payment History</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.payments.map(payment => `
              <tr>
                <td>${formatDate(payment.payment_date)}</td>
                <td>${payment.payment_reference}</td>
                <td>${payment.payment_method.replace('_', ' ').toUpperCase()}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td><span class="status ${payment.status}">${payment.status.toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        Generated on ${formatDate(new Date().toISOString())} | Royal Fees Management System
      </div>
    </body>
    </html>
  `
}

const generatePaymentReceiptHTML = (payment: PaymentWithDetails): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt ${payment.payment_reference}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white;
          font-size: 14px;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #059669;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #059669; 
          margin: 0; 
          font-size: 24px;
        }
        .header h2 { 
          color: #64748b; 
          margin: 10px 0 0 0; 
          font-size: 18px;
        }
        .section { 
          margin-bottom: 25px; 
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #047857;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 15px; 
        }
        th, td { 
          border: 1px solid #e5e7eb; 
          padding: 10px; 
          text-align: left; 
        }
        th { 
          background-color: #f0fdf4; 
          font-weight: bold;
        }
        .total { 
          font-weight: bold; 
          font-size: 16px; 
          color: #047857;
        }
        .status { 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status.confirmed { background: #d1fae5; color: #065f46; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.failed { background: #fee2e2; color: #991b1b; }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
        .payment-summary {
          background: #f0fdf4;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .payment-summary table {
          margin: 0;
        }
        .payment-summary .total {
          font-size: 18px;
        }
        .receipt-header {
          background: #dcfce7;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }
        .receipt-header h3 {
          margin: 0;
          color: #047857;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ROYAL FEES MANAGEMENT SYSTEM</h1>
        <h2>PAYMENT RECEIPT</h2>
      </div>
      
      <div class="receipt-header">
        <h3>Payment Confirmation</h3>
        <p style="margin: 5px 0 0 0; color: #047857;">Receipt #${payment.payment_reference}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Payment Details</div>
        <table>
          <tr>
            <td><strong>Payment Reference:</strong></td>
            <td>${payment.payment_reference}</td>
            <td><strong>Status:</strong></td>
            <td><span class="status ${payment.status}">${payment.status.toUpperCase()}</span></td>
          </tr>
          <tr>
            <td><strong>Payment Date:</strong></td>
            <td>${formatDate(payment.payment_date)}</td>
            <td><strong>Payment Method:</strong></td>
            <td>${payment.payment_method.replace('_', ' ').toUpperCase()}</td>
          </tr>
          <tr>
            <td><strong>Transaction Reference:</strong></td>
            <td>${payment.transaction_reference || 'N/A'}</td>
            <td><strong>Bank:</strong></td>
            <td>${payment.bank_name || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Student Information</div>
        <table>
          <tr>
            <td><strong>Student Name:</strong></td>
            <td>${payment.invoice?.student?.first_name} ${payment.invoice?.student?.last_name}</td>
            <td><strong>Student ID:</strong></td>
            <td>${payment.invoice?.student?.student_id}</td>
          </tr>
          <tr>
            <td><strong>Class:</strong></td>
            <td>${classLevelToDisplay(payment.invoice?.student?.class_level || '')}</td>
            <td><strong>Invoice Number:</strong></td>
            <td>${payment.invoice?.invoice_number}</td>
          </tr>
        </table>
      </div>

      <div class="payment-summary">
        <div class="section-title">Payment Summary</div>
        <table>
          <tr>
            <td><strong>Amount Paid:</strong></td>
            <td class="total">${formatCurrency(payment.amount)}</td>
          </tr>
          <tr>
            <td><strong>Invoice Total:</strong></td>
            <td>${formatCurrency(payment.invoice?.total_amount || 0)}</td>
          </tr>
          <tr>
            <td><strong>Outstanding Balance:</strong></td>
            <td style="color: ${(payment.invoice?.balance || 0) > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
              ${formatCurrency(payment.invoice?.balance || 0)}
            </td>
          </tr>
        </table>
      </div>

      ${payment.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <p style="padding: 10px; background: #f9fafb; border-radius: 4px; margin: 0;">
          ${payment.notes}
        </p>
      </div>
      ` : ''}

      <div class="footer">
        Receipt generated on ${formatDate(new Date().toISOString())} | Royal Fees Management System
        <br>
        <em>This is a computer generated receipt and does not require signature.</em>
      </div>
    </body>
    </html>
  `
}

// Print functionality
export const printInvoice = (invoice: InvoiceWithDetails): void => {
  const htmlContent = generateInvoiceHTML(invoice)
  printHTML(htmlContent)
}

export const printPaymentReceipt = (payment: PaymentWithDetails): void => {
  const htmlContent = generatePaymentReceiptHTML(payment)
  printHTML(htmlContent)
}

const printHTML = (htmlContent: string): void => {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }
}
