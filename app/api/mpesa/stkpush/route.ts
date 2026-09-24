import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = body.phone;
    const amount = body.amount;

    if (!phone || !amount) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number and amount are required.",
        },
        { status: 400 }
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
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
          Amount: Number(amount),
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: "HarrisData",
          TransactionDesc: "Harris Data Deals",
        }),
      }
    );

    const stkData = await stkResponse.json();

    if (!stkResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "STK Push request failed.",
          details: stkData,
        },
        { status: stkResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "STK Push sent successfully.",
      data: stkData,
    });
  } catch (error) {
    console.error("STK PUSH ERROR:", error);

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