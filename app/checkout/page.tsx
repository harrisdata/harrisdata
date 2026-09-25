"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect, useRef } from "react";

function CheckoutContent() {
  const searchParams = useSearchParams();

  const packageName = searchParams.get("package") || "1GB";
  const price = searchParams.get("price") || "19";
  const validity = searchParams.get("validity") || "1 Hour";

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  function startOrderPolling(id: string) {
    setOrderId(id);
    setPaymentStatus("PENDING");

    let attempts = 0;
    const maxAttempts = 60;

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/orders/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const status = data?.order?.status;

        if (status === "PAID") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setPaymentStatus("PAID");
          setMessage(
            "Payment received successfully. Your package will be delivered shortly."
          );
          setLoading(false);
          return;
        }

        if (status === "FAILED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setPaymentStatus("FAILED");
          setMessage(
            data?.order?.result_desc ||
              "Payment was not completed. Please try again."
          );
          setLoading(false);
          return;
        }

        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setPaymentStatus("PENDING");
          setMessage(
            "Payment is still being processed. Please wait or check your M-PESA messages."
          );
          setLoading(false);
        }
      } catch (error) {
        console.error("ORDER STATUS ERROR:", error);
      }
    }, 3000);
  }

  async function handlePayNow() {
    setMessage("");
    setPaymentStatus("");

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!phone.trim()) {
      setMessage("Please enter your M-PESA phone number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          amount: Number(price),
          package: packageName,
          validity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Payment request failed.");
        setLoading(false);
        return;
      }

      if (!data.orderId) {
        setMessage(
          "M-PESA request was sent, but the order could not be tracked."
        );
        setLoading(false);
        return;
      }

      setMessage(
        "M-PESA prompt sent. Please check your phone and enter your PIN."
      );

      startOrderPolling(data.orderId);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the payment server.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Harris Data Deals
        </h1>

        <p className="mb-6 text-gray-600">
          Fast • Reliable • Affordable
        </p>

        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Checkout
        </h2>

        <div className="mb-6 rounded-lg bg-gray-100 p-4 text-gray-900">
          <p className="mb-2">
            <strong>Package:</strong> {packageName}
          </p>

          <p className="mb-2">
            <strong>Validity:</strong> {validity}
          </p>

          <p className="text-lg font-bold">
            <strong>Price:</strong> KSh {price}
          </p>
        </div>

        <label className="mb-2 block font-medium text-gray-900">
          M-PESA Phone Number
        </label>

        <input
          type="tel"
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 outline-none focus:border-green-600 disabled:bg-gray-100"
        />

        <button
          onClick={handlePayNow}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 p-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Waiting for Payment..." : "PAY NOW"}
        </button>

        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-center ${
              paymentStatus === "PAID"
                ? "bg-green-100 text-green-800"
                : paymentStatus === "FAILED"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-900"
            }`}
          >
            {message}
          </div>
        )}

        {orderId && (
          <p className="mt-3 text-center text-xs text-gray-500">
            Order: {orderId}
          </p>
        )}

        {paymentStatus === "PENDING" && (
          <p className="mt-3 text-center text-sm font-medium text-gray-700">
            Payment status: Waiting for M-PESA confirmation...
          </p>
        )}

        {paymentStatus === "PAID" && (
          <p className="mt-3 text-center text-sm font-bold text-green-700">
            Payment confirmed ✓
          </p>
        )}

        {paymentStatus === "FAILED" && (
          <p className="mt-3 text-center text-sm font-bold text-red-700">
            Payment not completed
          </p>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          You will receive an M-PESA payment prompt on your phone.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}