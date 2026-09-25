import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Harris Data Deals M-PESA callback is online",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "M-PESA CALLBACK:",
      JSON.stringify(body, null, 2)
    );

    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Callback received",
      });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const resultCode = Number(stkCallback.ResultCode);
    const resultDesc = stkCallback.ResultDesc || "";

    console.log("M-PESA RESULT CODE:", resultCode);
    console.log("M-PESA RESULT DESCRIPTION:", resultDesc);
    console.log("CHECKOUT REQUEST ID:", checkoutRequestId);

    if (!checkoutRequestId) {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Callback received without CheckoutRequestID",
      });
    }

    /*
     * Extract callback metadata.
     */
    const metadataItems = stkCallback.CallbackMetadata?.Item || [];

    const getMetadata = (name: string) => {
      const item = metadataItems.find(
        (entry: any) => entry.Name === name
      );

      return item?.Value ?? null;
    };

    const amount = getMetadata("Amount");
    const mpesaReceipt = getMetadata("MpesaReceiptNumber");
    const transactionDate = getMetadata("TransactionDate");
    const phoneNumber = getMetadata("PhoneNumber");

    /*
     * Successful payment
     */
    if (resultCode === 0) {
      const updatedOrders = await sql`
        UPDATE orders
        SET
          status = 'PAID',
          merchant_request_id = ${merchantRequestId || null},
          mpesa_receipt = ${mpesaReceipt ? String(mpesaReceipt) : null},
          result_code = ${resultCode},
          result_desc = ${resultDesc},
          transaction_date = ${transactionDate ? String(transactionDate) : null},
          callback_metadata = ${JSON.stringify({
            Amount: amount,
            MpesaReceiptNumber: mpesaReceipt,
            TransactionDate: transactionDate,
            PhoneNumber: phoneNumber,
          })}::jsonb,
          updated_at = NOW()
        WHERE checkout_request_id = ${checkoutRequestId}
        RETURNING id, status
      `;

      if (updatedOrders.length === 0) {
        console.warn(
          "No order found for CheckoutRequestID:",
          checkoutRequestId
        );
      } else {
        console.log(
          "PAYMENT SUCCESSFUL - ORDER UPDATED:",
          updatedOrders[0]
        );
      }
    } else {
      /*
       * Failed, cancelled, or timed-out payment.
       */
      const updatedOrders = await sql`
        UPDATE orders
        SET
          status = 'FAILED',
          merchant_request_id = ${merchantRequestId || null},
          result_code = ${resultCode},
          result_desc = ${resultDesc},
          callback_metadata = ${JSON.stringify(
            stkCallback.CallbackMetadata || {}
          )}::jsonb,
          updated_at = NOW()
        WHERE checkout_request_id = ${checkoutRequestId}
        RETURNING id, status
      `;

      if (updatedOrders.length === 0) {
        console.warn(
          "No order found for CheckoutRequestID:",
          checkoutRequestId
        );
      } else {
        console.log(
          "PAYMENT NOT COMPLETED - ORDER UPDATED:",
          updatedOrders[0]
        );
      }
    }

    /*
     * Safaricom expects a successful acknowledgement.
     */
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Callback received successfully",
    });
  } catch (error) {
    console.error("CALLBACK ERROR:", error);

    /*
     * Return HTTP 200 with ResultCode 0 so Safaricom
     * receives the callback acknowledgement.
     */
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Callback received",
    });
  }
}