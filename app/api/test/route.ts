import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Harris Data Deals M-PESA STK Push endpoint is working!",
  });
}