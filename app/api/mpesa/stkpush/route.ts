import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  let orderId: string | null = null;

  try {
    const body = await request.json();

    const phone = body.phone;
    const amount = Number(body.amount);
    const packageName = body.package || "Harris Data Package";
    const validity = body.validity || "";

    if (!phone || !amount) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number and amount are required.",
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount must be greater than zero.",
        },
        { status: 400 }
      );
    }

    /*
     * Create the order first.
     * It starts as PENDING until Safaricom sends the callback.
     */
    const orders = await sql`
      INSERT INTO orders (
        phone,
        package_name,
        validity,
        amount,
        status
      )
      VALUES (
        ${phone},
        ${packageName},
        ${validity},
        ${amount},
        'PENDING'
      )
      RETURNING id
    `;

    orderId = orders[0]?.id || null;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not create the payment order.",
        },
        { status: 500 }
      );
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (
      !consumerKey ||
      !consumerSecret ||
      !shortcode ||
      !passkey ||
      !callbackUrl
    ) {
      await sql`
        UPDATE orders
        SET
          status = 'FAILED',
          result_desc = 'M-PESA configuration is incomplete.',
          updated_at = NOW()
        WHERE id = ${orderId}
      `;

      return NextResponse.json(
        {
          success: false,
          message: "M-PESA configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    // Get Daraja access token
    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const tokenText = await tokenResponse.text();

    let tokenData: any = {};

    try {
      tokenData = tokenText ? JSON.parse(tokenText) : {};
    } catch {
      await sql`
        UPDATE orders
        SET
          status = 'FAILED',
          result_desc = 'Daraja returned an invalid token response.',
          updated_at = NOW()
        WHERE id = ${orderId}
      `;

      return NextResponse.json(
        {
          success: false,
          message: "Daraja returned an invalid token response.",
          details: tokenText || "Empty response from Daraja.",
        },
        { status: 502 }
      );
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      await sql`
        UPDATE orders
        SET
          status = 'FAILED',
          result_desc = 'Could not obtain Daraja access token.',
          updated_at = NOW()
        WHERE id = ${orderId}
      `;

      return NextResponse.json(
        {
          success: false,
          message: "Could not obtain Daraja access token.",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    // Generate timestamp
    const now = new Date();

    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    // Generate password
    const password = Buffer.from(
      `${shortcode}${passkey}${timestamp}`
    ).toString("base64");

    // STK Push request
    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: "HarrisData",
          TransactionDesc: "Harris Data Deals",
        }),
      }
    );

    const stkText = await stkResponse.text();

    let stkData: any = {};

    try {
      stkData = stkText ? JSON.parse(stkText) : {};
    } catch {
      await sql`
        UPDATE orders
        SET
          status = 'FAILED',
          result_desc = 'Daraja returned an invalid STK response.',
          updated_at = NOW()
        WHERE id = ${orderId}
      `;

      return NextResponse.json(
        {
          success: false,
          message: "Daraja returned an invalid STK Push response.",
          details: stkText || "Empty response from Daraja.",
        },
        { status: 502 }
      );
    }

    if (!stkResponse.ok) {
      await sql`
        UPDATE orders
        SET
          status = 'FAILED',
          result_code = ${Number(stkData.ResponseCode ?? -1)},
          result_desc = ${stkData.errorMessage || stkData.ResponseDescription || "STK Push request failed."},
          updated_at = NOW()
        WHERE id = ${orderId}
      `;

      return NextResponse.json(
        {
          success: false,
          message: "STK Push request failed.",
          details: stkData,
        },
        { status: stkResponse.status }
      );
    }

    // Save Safaricom's request IDs against this order.
    await sql`
      UPDATE orders
      SET
        checkout_request_id = ${stkData.CheckoutRequestID || null},
        merchant_request_id = ${stkData.MerchantRequestID || null},
        result_code = ${stkData.ResponseCode != null ? Number(stkData.ResponseCode) : null},
        result_desc = ${stkData.ResponseDescription || null},
        updated_at = NOW()
      WHERE id = ${orderId}
    `;

    return NextResponse.json({
      success: true,
      message: "STK Push sent successfully.",
      orderId,
      data: stkData,
    });
  } catch (error) {
    console.error("STK PUSH ERROR:", error);

    if (orderId) {
      try {
        await sql`
          UPDATE orders
          SET
            status = 'FAILED',
            result_desc = ${error instanceof Error ? error.message : String(error)},
            updated_at = NOW()
          WHERE id = ${orderId}
        `;
      } catch (dbError) {
        console.error("ORDER UPDATE ERROR:", dbError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while processing STK Push.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}