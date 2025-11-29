'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-50 text-slate-900 overflow-hidden
     selection:bg-blue-200 selection:text-blue-900">

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/50 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-cyan-200/30 rounded-full blur-[80px]" />
      </div>

      <main className="relative z-10">

        <section className="container mx-auto px-6 pt-32 pb-20 md:pt-48 md:pb-32">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >


            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight text-slate-900">
              Master Math with <br />
              <span className="bg-linear-to-r from-blue-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
                Visual Intuition
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop memorizing formulas. Start seeing the patterns. Explore interactive lessons that bring complex mathematical concepts to life right before your eyes.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-blue-600/20 hover:shadow-blue-700/30 flex items-center gap-2"
                >
                  Continue Learning
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-blue-600/20 hover:shadow-blue-700/30 flex items-center gap-2"
                  >
                    Start Learning Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 shadow-sm"
                  >
                    Log In
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </section>


      </main>
    </div>
  );
}