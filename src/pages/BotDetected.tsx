import { Link } from "react-router";
import { ShieldAlert, Home, Scale } from "lucide-react";
import { PopBackground } from "../components/PopBackground";

export default function BotDetected() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <PopBackground />
      <div className="concert-lights" />
      <div className="fixed inset-0 bg-gradient-to-br from-red-950 via-red-900 to-purple-900 animate-lights -z-10" />

      <div className="relative z-10 max-w-lg w-full mx-4">
        <div className="bg-gradient-to-br from-red-950/80 to-purple-950/80 backdrop-blur-xl rounded-2xl border-2 border-red-500/60 shadow-2xl p-8 md:p-10 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-10 h-10 text-red-300" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Bot Activity Detected
            </h1>
            <p className="text-red-200 text-base leading-relaxed">
              Our AI mouse-movement analysis determined that the interaction
              pattern is not consistent with a human user. <br />
              If you believe this is a mistake, you may file an appeal.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-red-500/30" />

          {/* Actions */}
          <div className="space-y-3">
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3.5 px-6 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg neon-border text-base font-medium"
              //className="w-fit min-w-[240px] flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-5 px-10 rounded-2xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg neon-border text-lg font-semibold mx-auto"
              //className="w-64 h-20 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-xl neon-border text-lg font-bold mx-auto"
            >
              <Home className="w-5 h-5" />
              Return to Main Page
            </Link>

            <Link
              to="/appeal"
              className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-red-500/60 text-red-200 py-3.5 px-6 rounded-xl hover:bg-red-500/10 hover:border-red-400 transition-all duration-200 text-base font-medium"
            >
              <Scale className="w-5 h-5" />
              Appeal Decision
            </Link>
          </div>

          <p className="text-xs text-red-400/70">
            Reference ID: {crypto.randomUUID().slice(0, 12).toUpperCase()} •{" "}
            {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  );
}
