import { Link } from "react-router";
import { ArrowLeft, FileText, ShieldCheck, Send, CheckCircle } from "lucide-react";
import { PopBackground } from "../components/PopBackground";
import { useState } from "react";

export default function Appeal() {
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <PopBackground />
      <div className="concert-lights" />
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 animate-lights -z-10" />

      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md shadow-lg border-b border-pink-500/50 neon-border relative z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-pink-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to home
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-xl rounded-2xl border-2 border-pink-500/50 neon-border shadow-2xl p-8 md:p-10">
          {!submitted ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg shadow-lg neon-border">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white neon-text">
                  Appeal Bot Detection
                </h1>
              </div>

              <p className="text-pink-200 mb-6 text-sm leading-relaxed">
                If you believe you were incorrectly flagged as a bot, please
                explain why below. Our team will review your case within 24-48
                hours and update you via e-mail.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-pink-200 mb-1.5">
                    Your Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full bg-purple-950/50 border-2 border-pink-500/30 rounded-xl px-4 py-3 text-white placeholder:text-pink-400/40 focus:outline-none focus:border-pink-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-200 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full bg-purple-950/50 border-2 border-pink-500/30 rounded-xl px-4 py-3 text-white placeholder:text-pink-400/40 focus:outline-none focus:border-pink-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-200 mb-1.5">
                    Reason for Appeal
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you believe the detection was incorrect..."
                    className="w-full bg-purple-950/50 border-2 border-pink-500/30 rounded-xl px-4 py-3 text-white placeholder:text-pink-400/40 focus:outline-none focus:border-pink-400 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3.5 px-6 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg neon-border flex items-center justify-center gap-2 text-base font-medium"
                >
                  <Send className="w-5 h-5" />
                  Submit Appeal
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8 space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-600/30 border-2 border-green-500 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-300" />
              </div>
              <h2 className="text-2xl font-bold text-white neon-text">
                Appeal Submitted
              </h2>
              <p className="text-pink-200 text-sm max-w-md mx-auto">
                Your appeal has been received. Our team will review it and get
                back to you within 24-48 hours. You can continue browsing events
                in the meantime.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-8 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg neon-border font-medium"
              >
                <ShieldCheck className="w-5 h-5" />
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
