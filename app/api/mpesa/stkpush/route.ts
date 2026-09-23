import { NextResponse } from "next/server";

function normalizePhone(phone: string) {
  const cleaned = phone.replace(/\s+/g, "");

  if (cleaned.startsWith("07")) {
    return "254" + cleaned.substring(1);
  }

  if (cleaned.startsWith("01")) {
    return "254" + cleaned.substring(1);
  }

  if (cleaned.startsWith("+254")) {
    return cleaned.substring(1);
  }

  if (cleaned.startsWith("254")) {
    return cleaned;
  }

  return cleaned;
}

async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-PESA Consumer Key or Secret is missing");
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
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.errorMessage || "Unable to obtain M-PESA access token"
    );
  }

  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = body.phone;
    const amount = Number(body.amount);
    const packageName = body.package || "Harris Data Package";
    const validity = body.validity || "";

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid payment amount is required.",
        },
        { status: 400 }
      );
    }

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (!shortcode || !passkey || !callbackUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "M-PESA shortcode, passkey, or callback URL is missing.",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .substring(0, 14);

    const password = Buffer.from(
      `${shortcode}${passkey}${timestamp}`
    ).toString("base64");

    const phoneNumber = normalizePhone(phone);

    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.round(amount),
          PartyA: phoneNumber,
          PartyB: shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: callbackUrl,
          AccountReference: "HarrisDataDeals",
          TransactionDesc: `${packageName} ${validity}`.trim(),
        }),
      }
    );

    const data = await stkResponse.json();

    console.log(
      "STK PUSH RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    if (!stkResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data.errorMessage ||
            data.ResponseDescription ||
            "M-PESA STK Push failed.",
          response: data,
        },
        { status: stkResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        data.CustomerMessage ||
        data.ResponseDescription ||
        "M-PESA payment request sent successfully.",
      checkoutRequestID: data.CheckoutRequestID,
      merchantRequestID: data.MerchantRequestID,
      response: data,
    });
  } catch (error) {
    console.error("STK PUSH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected M-PESA error occurred.",
      },
      { status: 500 }
    );
  }
}