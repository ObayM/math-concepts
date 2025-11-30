"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Snow() {

    const [snowflakes, setSnowflakes] = useState([]);

    useEffect(() => {

        const count = 37; // top_number_:)

        const newSnowflakes = Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, 
            delay: Math.random() * 5,
            duration: Math.random() * 10 + 10, 
            size: Math.random() * 10 + 5,

            // I hope this is true randomness :lol:
        }));

        setSnowflakes(newSnowflakes)
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
            {snowflakes.map((flake) => (
                <motion.div
                    key={flake.id}
                    className="absolute bg-slate-50 rounded-full opacity-80"
                    
                    style={{
                        left: `${flake.x}%`,
                        width: flake.size,
                        height: flake.size,
                        top: -20,
                    }}

                    animate={{
                        y: ["0vh", "100vh"],
                        x: [0, Math.random() * 20 - 10],
                    }}

                    transition={{
                        duration: flake.duration,
                        repeat: Infinity,
                        delay: flake.delay,
                        ease: "linear",
                    }}
                />
            ))}
        </div>
    );
}
