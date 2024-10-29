const Order = require('../models/Order')
const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')

const getSalesReport = async (req, res) => {
    const { startDate, endDate, period } = req.query;

    let query = {};

    // Date filters based on the period or custom date range
    if (period) {
        const now = new Date();
        if (period === 'day') {
            query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lt: new Date(now.setHours(23, 59, 59, 999)) };
        } else if (period === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            query.createdAt = { $gte: startOfWeek, $lt: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            query.createdAt = { $gte: startOfMonth, $lt: new Date(endOfMonth.setHours(23, 59, 59, 999)) };
        }
    } else if (startDate && endDate) {
        query.createdAt = { $gte: new Date(startDate), $lt: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
    }

    try {
        const orders = await Order.find(query);
        req.session.salesReportData = orders;
        // Calculate the required metrics
        const totalSalesCount = orders.length;
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

        // // If it's an AJAX request (for charts), return JSON data
        //  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        //     res.json({
        //         totalSalesCount,
        //         totalOrderAmount,
        //         totalDiscount,
        //         period,
        //         startDate,
        //         endDate
        //     });
        // }else{
            // Render the report
            res.render('salesReport', {
                orders,
                totalSalesCount,
                totalOrderAmount,
                totalDiscount,
                startDate,
                endDate,
                period
            });
        // }

        
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).send('Server Error');
    }
};

const downloadPdf = async(req,res)=>{
    const orders = req.session.salesReportData; // Retrieve the stored data

    if (!orders) {
        return res.status(400).send('No sales report data found. Please generate the report first.');
    }

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 30 });
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

    // Pipe the document to a response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown(1);

    // Create a table-like structure for sales data
    doc.fontSize(11).text('Order ID', 100, 100);
    doc.text('Date', 270,100);
    doc.text('Discount',350,100);
    doc.text('Total Amount', 450, 100);

    // Draw lines for header
    doc.moveTo(80, 120).lineTo(530, 120).stroke();

    let positionY = 150;
    const pageHeight = 720; // Define the page height limit (considering margins)

    orders.forEach(order => {
        if (positionY > pageHeight) { // Check if current position exceeds page height
            doc.addPage(); // Add a new page
            positionY = 50; // Reset position for new page
            //Re-add headers
            doc.fontSize(11).text('Order ID', 100, 50);
            doc.text('Date', 270,50);
            doc.text('Discount',350,50);
            doc.text('Total Amount', 450, 50);
            doc.moveTo(80, positionY + 20).lineTo(530, positionY + 20).stroke();
            positionY += 30; // Adjust for next row
        }
        doc.fontSize(8).text(order.orderId,100,positionY);
        // doc.text(`User ID: ${order.userId}`);
        doc.text(new Date(order.createdAt).toISOString().slice(0, 10),270,positionY);
        doc.text(order.discount,370,positionY);
        doc.text(order.totalAmount,480,positionY);
        positionY += 20;
    });
    // Check if there's enough space for the total, otherwise add a new page
    if (positionY > pageHeight - 40) {
        doc.addPage(); // Add a new page for totals if needed
        positionY = 50; // Reset position for new page
    }
    doc.moveDown(2);

   const totalSales = orders.length
   const totalOrderAmount = orders.reduce((sum,order)=> sum + order.totalAmount,0)
   const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    const netProfit =  (totalOrderAmount - totalDiscount).toFixed(2)
    //Total sales
    doc.fontSize(12).text(`Total sales count: ${totalSales}`,100,positionY);
    doc.fontSize(12).text(`Total order amount: ${totalOrderAmount.toFixed(2)}`,100,positionY+20);
    doc.fontSize(12).text(`Total discount: ${totalDiscount.toFixed(2)}`,100,positionY+40);
    doc.fontSize(13).text(`Net profit: ${netProfit}`,100,positionY+60);
    // Draw a line before the totals
    doc.moveTo(80, positionY - 10).lineTo(530, positionY - 10).stroke();

    // Finalize the PDF and end the stream
    doc.end();
}

const downloadExcel = async(req,res)=>{
    const orders = req.session.salesReportData; // Retrieve the stored data

    if (!orders) {
        return res.status(400).send('No sales report data found. Please generate the report first.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add columns
    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 10 },
        { header: 'User ID', key: 'userId', width: 32 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Date', key: 'createdAt', width: 20 }
    ];

    // Add rows
    orders.forEach(order => {
        worksheet.addRow({
            orderId: order.orderId,
            userId: order.userId,
            totalAmount: order.totalAmount,
            discount: order.discount,
            createdAt: new Date(order.createdAt).toISOString().slice(0, 10)
        });
    });

    const totalSales = orders.length
    const totalOrderAmount = orders.reduce((sum,order)=> sum + order.totalAmount,0)
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    const netProfit =  (totalOrderAmount - totalDiscount).toFixed(2)

    
    worksheet.addRow({})
    worksheet.addRow({
        orderId:totalSales,
        totalAmount:totalOrderAmount,
        discount:totalDiscount

    })

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
}

const paginateReports = async(req,res) =>{
    const { page = 1, period, startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 10; // Items per page, default is 10
    let filter = {};

    try{
        // Calculate the date range based on `period` if specified
        if (period) {
            const today = new Date();
            switch (period) {
                case 'day':
                    filter.createdAt = {
                        $gte: new Date(today.setDate(today.getDate() - 1)),
                    };
                    break;
                case 'week':
                    filter.createdAt = {
                        $gte: new Date(today.setDate(today.getDate() - 7)),
                    };
                    break;
                case 'month':
                    filter.createdAt = {
                        $gte: new Date(today.setMonth(today.getMonth() - 1)),
                    };
                    break;
            }
        } else if (startDate && endDate) {
            // Custom date range
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Fetch reports with pagination
        const reports = await Order.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 }); // Sort by latest orders

        // Count total documents for pagination
        const totalReports = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalReports / limit);
        const totalOrderAmount = (reports.reduce((sum, order) => sum + order.totalAmount, 0)).toFixed(2);
        const totalDiscount = (reports.reduce((sum, order) => sum + (order.discount || 0), 0)).toFixed(2);

        res.json({
            reports,
            totalReports,
            currentPage: parseInt(page),
            totalPages,
            totalOrderAmount,
            totalDiscount
        });
} catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
}
}

module.exports = {

    getSalesReport,
    downloadPdf,
    downloadExcel,
    paginateReports
}