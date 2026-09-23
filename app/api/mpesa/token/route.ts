import { NextResponse } from "next/server";

export async function GET() {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "M-PESA Consumer Key or Consumer Secret is missing.",
        },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Daraja authentication failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Daraja access token obtained successfully.",
      token_received: !!data.access_token,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Could not connect to Daraja.",
        error: String(error),
      },
      { status: 500 }
    );
  }
}