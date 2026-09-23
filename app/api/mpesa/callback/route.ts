import { NextResponse } from "next/server";

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

    console.log(
      "M-PESA RESULT CODE:",
      stkCallback.ResultCode
    );

    console.log(
      "M-PESA RESULT DESCRIPTION:",
      stkCallback.ResultDesc
    );

    if (stkCallback.ResultCode === 0) {
      console.log("PAYMENT SUCCESSFUL");
    } else {
      console.log("PAYMENT NOT COMPLETED");
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Callback received successfully",
    });
  } catch (error) {
    console.error("CALLBACK ERROR:", error);

    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: "Callback processing failed",
      },
      { status: 400 }
    );
  }
}