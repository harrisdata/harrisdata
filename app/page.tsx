"use client";

import { useState } from "react";

const dataPackages = [
  { name: "1GB", validity: "1 Hour", price: 19 },
  { name: "250MB", validity: "24 Hours", price: 20 },
  { name: "1.5GB", validity: "3 Hours", price: 51 },
  { name: "1.25GB", validity: "Till Midnight", price: 55 },
  { name: "350MB", validity: "7 Days", price: 49 },
  { name: "2GB", validity: "7 Days", price: 299 },
  { name: "6GB", validity: "7 Days", price: 699 },
];

const minutePackages = [
  { name: "45 Minutes", validity: "3 Hours", price: 22 },
  { name: "50 Minutes", validity: "Till Midnight", price: 52 },
];

const smsPackages = [
  { name: "20 SMS", validity: "Daily", price: 5 },
  { name: "200 SMS", validity: "Daily", price: 10 },
  { name: "1,000 SMS", validity: "7 Days", price: 30 },
];

export default function Home() {
  const [phone, setPhone] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [category, setCategory] = useState("data");

  const packages =
    category === "data"
      ? dataPackages
      : category === "minutes"
        ? minutePackages
        : smsPackages;

  function selectPackage(name: string, price: number) {
    setSelectedPackage(name);
    setSelectedPrice(price);
  }

  function buyNow() {
    if (!phone) {
      alert("Please enter your Safaricom phone number.");
      return;
    }

    if (!selectedPackage) {
      alert("Please select a package.");
      return;
    }

    alert(
      `Order received!\n\nPackage: ${selectedPackage}\nPrice: KSh ${selectedPrice}\nPhone: ${phone}\n\nM-Pesa payment will be connected in the next stage.`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="bg-green-700 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="text-2xl font-bold">HARRIS DATA DEALS</h1>
            <p className="text-sm text-green-100">
              Fast • Reliable • Affordable
            </p>
          </div>

          <div className="hidden rounded-full bg-white/10 px-4 py-2 text-sm md:block">
            Buy Automatically
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-green-600 px-4 py-12 text-center text-white">
        <h2 className="text-4xl font-extrabold md:text-5xl">
          Buy Data & Minutes
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-green-50">
          Affordable Safaricom data, minutes and SMS delivered directly to
          your phone.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-full bg-white/15 px-4 py-2">
            ⚡ Fast Delivery
          </span>
          <span className="rounded-full bg-white/15 px-4 py-2">
            💳 M-Pesa
          </span>
          <span className="rounded-full bg-white/15 px-4 py-2">
            📱 Automatic
          </span>
        </div>
      </section>

      {/* MAIN */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {/* PHONE NUMBER */}
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-md">
          <label className="mb-2 block font-semibold">
            Safaricom Phone Number
          </label>

          <input
            type="tel"
            placeholder="e.g. 0712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {/* CATEGORY BUTTONS */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setCategory("data")}
            className={`rounded-full px-6 py-3 font-semibold ${
              category === "data"
                ? "bg-green-600 text-white"
                : "bg-white text-slate-700 shadow"
            }`}
          >
            📦 Data
          </button>

          <button
            onClick={() => setCategory("minutes")}
            className={`rounded-full px-6 py-3 font-semibold ${
              category === "minutes"
                ? "bg-green-600 text-white"
                : "bg-white text-slate-700 shadow"
            }`}
          >
            📞 Minutes
          </button>

          <button
            onClick={() => setCategory("sms")}
            className={`rounded-full px-6 py-3 font-semibold ${
              category === "sms"
                ? "bg-green-600 text-white"
                : "bg-white text-slate-700 shadow"
            }`}
          >
            💬 SMS
          </button>
        </div>

        {/* PACKAGES */}
        <div className="mt-8">
          <h3 className="text-center text-2xl font-bold">
            {category === "data"
              ? "Data Packages"
              : category === "minutes"
                ? "Minute Packages"
                : "SMS Packages"}
          </h3>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const selected = selectedPackage === pkg.name;

              return (
                <button
                  key={`${pkg.name}-${pkg.price}`}
                  onClick={() => selectPackage(pkg.name, pkg.price)}
                  className={`rounded-2xl bg-white p-6 text-left shadow-md transition hover:-translate-y-1 hover:shadow-xl ${
                    selected
                      ? "ring-4 ring-green-500"
                      : "ring-1 ring-slate-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-bold">{pkg.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {pkg.validity}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-100 px-3 py-2 font-bold text-green-700">
                      KSh {pkg.price}
                    </div>
                  </div>

                  <div className="mt-5 text-sm font-semibold text-green-700">
                    {selected ? "✓ Selected" : "Select Package"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CHECKOUT */}
        <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 shadow-lg">
          <h3 className="text-xl font-bold">Checkout</h3>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Selected package</p>
            <p className="font-bold">
              {selectedPackage || "No package selected"}
            </p>

            <p className="mt-3 text-sm text-slate-500">Amount</p>
            <p className="text-2xl font-bold text-green-700">
              {selectedPrice ? `KSh ${selectedPrice}` : "KSh 0"}
            </p>
          </div>

          <button
            onClick={buyNow}
            className="mt-5 w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-700"
          >
            BUY NOW
          </button>

          <p className="mt-3 text-center text-xs text-slate-500">
            M-Pesa automatic payment will be connected in the next stage.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-10 bg-slate-900 px-4 py-8 text-center text-white">
        <h3 className="font-bold">HARRIS DATA DEALS</h3>

        <p className="mt-2 text-sm text-slate-400">
          Fast • Reliable • Affordable
        </p>

        <p className="mt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} Harris Data Deals. All rights reserved.
        </p>
      </footer>
    </main>
  );
}